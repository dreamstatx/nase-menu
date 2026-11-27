# Naše menu — weekly meal planner that fits your budget

**👉 Open the app: https://dreamstatx.github.io/nase-menu/**

Every day the same question: *"What are we going to eat?"* — and then a trip to the store without a plan,
buying random stuff and spending more than expected.

I made this little app for myself and decided to share it, because I think it can be useful for anyone
who doesn't want to spend time every day figuring out what to cook and what to buy. You answer a few
questions once, and it builds a whole week of meals that fits your budget, using the products that are
**on sale right now** in Czech supermarkets. Then it gives you a ready shopping list.

It's free, has no ads, no account and no sign-up. Everything you enter stays on your phone.

> The app interface is currently in **Russian**. Prices and discounts are for **Czech stores** (Kč).

## How it works

1. **Short quiz** (about a minute):
   which stores you shop at · how many adults and kids · which days and meals you cook ·
   what kitchen equipment you have · how you eat (no restrictions, more protein, light, quick,
   vegetarian, no fish, pescatarian, lenten) · what you don't eat · what you already have at home · your weekly budget.
2. **Your week is ready.** The app picks recipes so the whole week stays within your budget.
   Products on sale are preferred, and ingredients are reused between dishes so less food is wasted.
3. **Don't like a dish?** Tap "Replace" — you see the alternatives and how much cheaper or more expensive each one is.
4. **Shopping list** with exact amounts: how much you need, how many packs to buy, in which store it's on sale,
   the discount %, until when the offer is valid and whether you need a loyalty card.
5. **"Where is it cheapest to buy everything?"** compares the whole basket across your stores.

## Features

- 55 home-style recipes with amounts per portion, cooking time, calories and steps
- Discounts from current flyers of Lidl, Kaufland, Albert, Tesco, BILLA, Penny, Globus, COOP and more, updated daily
- Optional loyalty-card prices (Lidl Plus, Moje Albert, Kaufland Card, Clubcard, BILLA Bonus)
- Portions for adults and kids
- Share the shopping list to WhatsApp / Telegram in one tap
- Works offline after the first visit and installs like a normal app

## Install on your phone

**Android (Chrome):** open the link → menu **⋮** → **Install app** (or *Add to Home screen*).
**iPhone (Safari):** open the link → **Share** → **Add to Home Screen**.

## Good to know

- Prices on sale come from public store flyers aggregated on [kupi.cz](https://www.kupi.cz) and are refreshed once a day.
  When a product isn't on sale, an approximate regular price is shown — you can correct it in the app.
  Always check the price on the shelf.
- Calories and costs are estimates, not dietary advice.
- Your answers, menu and shopping list are stored only in your browser on your device.

## For developers

Plain HTML/CSS/JavaScript, no build step, hosted on GitHub Pages.

| File | What it is |
| --- | --- |
| `index.html`, `app.js`, `styles.css` | the app (quiz, meal-plan generator, shopping list) |
| `data/recipes.json` | recipes, ingredient amounts per one adult portion |
| `data/catalog.json` | products: pack size, approximate regular price, search rules for discounts |
| `scripts/update_prices.py` | collects current discounts into `prices.json` (Python 3, no dependencies) |
| `sw.js`, `manifest.webmanifest` | offline support and installable app |

Run locally:

```
python -m http.server 8000
python scripts/update_prices.py   # refresh discounts
```

Ideas, recipes and fixes are welcome — feel free to open an issue or a pull request.
