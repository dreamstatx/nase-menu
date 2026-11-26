#!/usr/bin/env python3
"""Собирает актуальные акционные цены (скидки из летаков) чешских сетей с kupi.cz
и сохраняет их в prices.json рядом с приложением.

Запуск:  python scripts/update_prices.py
Зависимостей нет (только стандартная библиотека Python 3.9+).
Список продуктов и поисковых слов — в data/catalog.json (поле "kupi").
"""
import datetime as dt
import html
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TERMS_FILE = ROOT / "data" / "catalog.json"
OUT_FILE = ROOT / "prices.json"
SEARCH_URL = "https://www.kupi.cz/hledej?f={q}&vse=0"
UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36"
DELAY = 1.5  # пауза между запросами, чтобы не нагружать сайт

SHOP_ALIASES = {
    "penny market": "Penny", "penny": "Penny", "lidl": "Lidl", "kaufland": "Kaufland",
    "albert": "Albert", "albert hypermarket": "Albert", "albert supermarket": "Albert",
    "tesco": "Tesco", "tesco hypermarket": "Tesco", "billa": "BILLA", "globus": "Globus",
}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    return "".join(c for c in s if not unicodedata.combining(c))


def clean(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s).replace("\xa0", " ")
    return re.sub(r"\s+", " ", s).strip()


def parse_price(s: str):
    m = re.search(r"(\d+(?:[  ]\d{3})*(?:[.,]\d+)?)", s)
    if not m:
        return None
    return float(m.group(1).replace(" ", "").replace(" ", "").replace(",", "."))


def parse_dates(text: str, today: dt.date):
    """'platí do úterý 1. 12.' / 'platí od 27. 11. do 3. 12.' -> (od, do)."""
    found = re.findall(r"(\d{1,2})\.\s*(\d{1,2})\.(?:\s*(\d{4}))?", text)
    dates = []
    for d, m, y in found:
        year = int(y) if y else today.year
        try:
            date = dt.date(year, int(m), int(d))
        except ValueError:
            continue
        if not y and date < today - dt.timedelta(days=180):  # переход через Новый год
            date = date.replace(year=year + 1)
        dates.append(date)
    t = norm(text)
    if not dates:
        if "dnes" in t:
            return None, today
        return None, None
    if len(dates) == 1:
        if " od " in f" {t} " and " do " not in f" {t} ":
            return dates[0], None
        return None, dates[0]
    return dates[0], dates[-1]


def fetch(query: str) -> str:
    url = SEARCH_URL.format(q=urllib.parse.quote(query))
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "cs,en;q=0.8"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def parse_offers(page: str, today: dt.date):
    names = {}
    for m in re.finditer(r'class="product--wrap"[^>]*data-product-id="(\d+)"', page):
        chunk = page[m.end(): m.end() + 4000]
        t = re.search(r'<h2>\s*<a[^>]*title="([^"]+)"', chunk)
        amount = re.search(r'<span class="nowrap">([\s\S]*?)</span>\s*</h2>', chunk)
        if t:
            names[m.group(1)] = (clean(t.group(1)), clean(amount.group(1)) if amount else "")

    offers = []
    rows = list(re.finditer(r'<div class="discount_row([^"]*)"([\s\S]*?)id="discount_(\d+)"', page))
    for i, m in enumerate(rows):
        end = rows[i + 1].start() if i + 1 < len(rows) else m.end() + 12000
        block = page[m.start():end]
        pid = re.search(r'data-product="(\d+)"', m.group(2))
        shop = re.search(r'discounts_shop_name">\s*<a[^>]*title="([^"]+)"', block)
        price = re.search(r'discount_price_value">([^<]+)<', block)
        if not (pid and shop and price) or pid.group(1) not in names:
            continue
        value = parse_price(clean(price.group(1)))
        if not value:
            continue
        unit = re.search(r'class="discount_amount">([\s\S]*?)</div>', block)
        per_unit = re.search(r'class="price_per_unit">([\s\S]*?)</span>', block)
        validity = re.search(r'class="discounts_validity([^"]*)"[\s\S]*?<div style="[^"]*">([\s\S]*?)</div>', block)
        pct = re.search(r"[-−–]\s?(\d{1,2})\s?%", clean(block))
        valid_text = clean(validity.group(2)) if validity else ""
        valid_from, valid_to = parse_dates(valid_text, today)
        if valid_to and valid_to < today:
            continue
        shop_raw = clean(shop.group(1))
        name, pack = names[pid.group(1)]
        offers.append({
            "shop": SHOP_ALIASES.get(shop_raw.lower(), shop_raw),
            "product": name,
            "price": value,
            "pack": clean(unit.group(1)).lstrip("/ ").strip() if unit else pack,
            "perUnit": clean(per_unit.group(1)) if per_unit else "",
            "discountPct": int(pct.group(1)) if pct else None,
            "club": "discounts_club" in block,
            "validFrom": valid_from.isoformat() if valid_from else None,
            "validTo": valid_to.isoformat() if valid_to else None,
            "validText": valid_text,
            "future": bool(valid_from and valid_from > today),
        })
    return offers


def matches(product: str, rule: dict) -> bool:
    p = norm(product)
    if rule.get("include") and not re.search(rule["include"], p):
        return False
    if rule.get("require") and not re.search(rule["require"], p):
        return False
    if rule.get("exclude") and re.search(rule["exclude"], p):
        return False
    return True


def main():
    catalog = json.loads(TERMS_FILE.read_text(encoding="utf-8"))["items"]
    terms = {k: v["kupi"] for k, v in catalog.items() if v.get("kupi")}
    today = dt.date.today()
    old = {}
    if OUT_FILE.exists():
        try:
            old = json.loads(OUT_FILE.read_text(encoding="utf-8")).get("items", {})
        except Exception:
            old = {}
    items, failed = {}, []
    cache = {}
    for ingredient, rule in terms.items():
        query = rule["q"]
        try:
            if query not in cache:
                cache[query] = parse_offers(fetch(query), today)
                time.sleep(DELAY)
            found = [o for o in cache[query] if matches(o["product"], rule)]
        except Exception as e:  # сеть/сайт недоступен — оставляем старые данные
            print(f"! {ingredient}: {e}", file=sys.stderr)
            failed.append(ingredient)
            if ingredient in old:
                items[ingredient] = old[ingredient]
            continue
        seen, uniq = set(), []
        for o in sorted(found, key=lambda o: (o["future"], o["price"])):
            key = (o["shop"], o["product"], o["price"])
            if key not in seen:
                seen.add(key)
                uniq.append(o)
        items[ingredient] = {"query": query, "offers": uniq[:12]}
        print(f"{ingredient}: {len(uniq)} акций")
    data = {
        "updated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
        "source": "kupi.cz — акции из летаков чешских сетей",
        "failed": failed,
        "items": items,
    }
    OUT_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Сохранено: {OUT_FILE} ({sum(len(v['offers']) for v in items.values())} предложений)")
    if len(failed) == len(terms):
        sys.exit(1)


if __name__ == "__main__":
    main()
