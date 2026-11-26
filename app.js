'use strict';
/* =========================================================
   Наше меню — меню на неделю под бюджет с учётом скидок
   ========================================================= */

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const MEALS = ['Завтрак', 'Обед', 'Ужин'];
const SHOPS = [
  { id: 'Lidl', bg: '#0050aa', fg: '#ffe500' }, { id: 'Kaufland', bg: '#e10915', fg: '#fff' },
  { id: 'Albert', bg: '#1d70b7', fg: '#fff' }, { id: 'Tesco', bg: '#00539f', fg: '#fff' },
  { id: 'BILLA', bg: '#ffe500', fg: '#d4001a' }, { id: 'Penny', bg: '#cd1414', fg: '#fff' },
  { id: 'Globus', bg: '#f7a600', fg: '#fff' }, { id: 'COOP', bg: '#008c45', fg: '#fff' },
  { id: 'Košík.cz', bg: '#7ab51d', fg: '#fff' }
];
const EQUIPMENT = [
  { id: 'stove', name: 'Плита', icon: '🔥' }, { id: 'oven', name: 'Духовка', icon: '♨️' },
  { id: 'micro', name: 'Микроволновка', icon: '📟' }, { id: 'multi', name: 'Мультиварка', icon: '🍲' },
  { id: 'blender', name: 'Блендер', icon: '🌀' }, { id: 'airfryer', name: 'Аэрогриль', icon: '💨' }
];
const DIETS = [
  { id: 'any', name: 'Без ограничений', icon: '🍽️', hint: 'едим всё' },
  { id: 'protein', name: 'Больше белка', icon: '💪', hint: 'мясо, рыба, творог' },
  { id: 'light', name: 'Полегче', icon: '🥗', hint: 'до 450 ккал за приём' },
  { id: 'quick', name: 'Быстро', icon: '⏱️', hint: 'до 25 минут' },
  { id: 'veg', name: 'Вегетарианское', icon: '🥕', hint: 'без мяса и рыбы' },
  { id: 'nofish', name: 'Без рыбы', icon: '🚫', hint: 'рыбу не едим' },
  { id: 'nomeat', name: 'Без мяса, с рыбой', icon: '🐟', hint: 'пескетарианство' },
  { id: 'lent', name: 'Постное', icon: '🌿', hint: 'без животных продуктов' }
];
const CATS = {
  meat: ['🥩', 'Мясо'], fish: ['🐟', 'Рыба'], eggs: ['🥚', 'Яйца'], dairy: ['🥛', 'Молочное'],
  veg: ['🥬', 'Овощи и фрукты'], frozen: ['🧊', 'Заморозка'], bakery: ['🍞', 'Хлеб'], grocery: ['🥫', 'Бакалея']
};
const ANIMAL = new Set(['meat', 'fish', 'eggs', 'dairy']);
const LS = { profile: 'nm2-profile', plan: 'nm2-plan', checked: 'nm2-checked', manual: 'nm2-manual', live: 'nm2-live', view: 'nm2-shop' };

/* ---------- утилиты ---------- */
const $ = id => document.getElementById(id);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n, d = 0) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: d }).format(n);
const kc = n => `${nf(Math.round(n))} Kč`;
const plural = (n, a, b, c) => { n = Math.abs(n); const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => isoDate(new Date());
const todayIdx = () => (new Date().getDay() + 6) % 7;
const mondayOf = (d = new Date()) => { const m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return isoDate(m); };
const shortDate = iso => iso ? `${+iso.slice(8, 10)}.${+iso.slice(5, 7)}.` : '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
function amount(q, unit) {
  if (unit === 'g') return q >= 1000 ? `${nf(q / 1000, 1)} кг` : `${nf(Math.ceil(q / 10) * 10)} г`;
  if (unit === 'ml') return q >= 1000 ? `${nf(q / 1000, 1)} л` : `${nf(Math.ceil(q / 10) * 10)} мл`;
  return `${nf(Math.ceil(q - 0.05))} шт`;
}
function notify(t) { const x = $('toast'); x.textContent = t; x.classList.add('show'); clearTimeout(notify.t); notify.t = setTimeout(() => x.classList.remove('show'), 2300); }

/* ---------- состояние ---------- */
let CAT = {}, RECIPES = [], LIVE = read(LS.live, null);
const DEFAULT_PROFILE = { shops: ['Lidl', 'Kaufland', 'Albert', 'Penny', 'BILLA'], club: true, adults: 2, kids: 0, days: [0, 1, 2, 3, 4, 5, 6], meals: ['Завтрак', 'Обед', 'Ужин'], eq: ['stove', 'oven', 'micro'], diet: ['any'], dislikes: [], pantry: [], budget: 2000 };
let profile = read(LS.profile, null);
let plan = read(LS.plan, null);          // {week, slots:[{d,m,r}]}
let checked = read(LS.checked, {});
let manual = read(LS.manual, {});
let shopMode = read(LS.view, 'best');
let tab = 'week';
const save = () => { write(LS.profile, profile); write(LS.plan, plan); write(LS.checked, checked); write(LS.manual, manual); write(LS.view, shopMode); };

/* ---------- цены ---------- */
function parsePack(s, unit) {
  const m = String(s || '').toLowerCase().replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml|ks)\b/);
  if (!m) return null;
  let q = +m[1], u = m[2];
  if (u === 'kg') { q *= 1000; u = 'g'; } else if (u === 'l') { q *= 1000; u = 'ml'; } else if (u === 'ks') u = 'pcs';
  if (u !== unit && !(unit === 'g' && u === 'ml') && !(unit === 'ml' && u === 'g')) return null;
  return q > 0 ? q : null;
}
const OFFER_CACHE = new Map();
const clearCache = () => OFFER_CACHE.clear();
function offersFor(id, shop = shopMode, all = false) {
  if (all) return offersRaw(id, shop, true);
  const k = id + '|' + shop;
  if (!OFFER_CACHE.has(k)) OFFER_CACHE.set(k, offersRaw(id, shop, false));
  return OFFER_CACHE.get(k);
}
function offersRaw(id, shop, all) {
  const t = today(), c = CAT[id];
  const list = (LIVE?.items?.[id]?.offers || []).filter(o => !o.validTo || o.validTo >= t);
  return list.filter(o => all || (
    (!o.validFrom || o.validFrom <= t) && (profile.club || !o.club) &&
    (shop === 'best' ? profile.shops.includes(o.shop) : o.shop === shop)
  )).map(o => ({ ...o, qty: parsePack(o.pack, c.unit) || c.pack }));
}
function baseOption(id) {
  const c = CAT[id];
  return { price: manual[id] ?? c.price, qty: c.pack, base: true };
}
// самый выгодный способ купить нужное количество
function buyOption(id, need, shop = shopMode) {
  const opts = [baseOption(id), ...offersFor(id, shop)];
  let best = null;
  for (const o of opts) {
    const packs = Math.max(1, Math.ceil(need / o.qty - 0.08));
    const total = packs * o.price;
    if (!best || total < best.total - 0.01) best = { ...o, packs, total };
  }
  const b = baseOption(id);
  const baseTotal = Math.max(1, Math.ceil(need / b.qty - 0.08)) * b.price;
  return { ...best, offer: best.base ? null : best, saved: best.base ? 0 : Math.max(0, baseTotal - best.total) };
}
// цена за единицу (г/мл/шт) для подбора рецептов
function unitPrice(id, shop = shopMode) {
  if (profile.pantry.includes(id)) return 0;
  const opts = [baseOption(id), ...offersFor(id, shop)];
  return Math.min(...opts.map(o => o.price / o.qty));
}
const portions = () => Math.max(0.5, profile.adults + profile.kids * 0.5);
const recipeCost = (r, shop) => Object.entries(r.ing).reduce((s, [id, q]) => s + (CAT[id] ? q * unitPrice(id, shop) : 0), 0);

/* ---------- корзина ---------- */
function needs(slots = plan?.slots || []) {
  const n = {}, P = portions();
  for (const s of slots) {
    const r = RECIPES.find(x => x.id === s.r); if (!r) continue;
    for (const [id, q] of Object.entries(r.ing)) if (CAT[id]) n[id] = (n[id] || 0) + q * P;
  }
  return n;
}
function basket(slots, shop = shopMode) {
  const n = needs(slots), items = [];
  let total = 0, saved = 0, deals = 0;
  for (const [id, need] of Object.entries(n)) {
    if (profile.pantry.includes(id)) continue;
    const b = buyOption(id, need, shop);
    items.push({ id, need, ...b });
    total += b.total; saved += b.saved; if (b.offer) deals++;
  }
  return { items, total, saved, deals };
}

/* ---------- подбор меню ---------- */
function allowed(r, strict = true) {
  const eq = profile.eq, d = profile.diet;
  if ((r.eq || []).includes('oven') && !eq.includes('oven') && !eq.includes('airfryer')) return false;
  if ((r.eq || []).includes('blender') && !eq.includes('blender')) return false;
  const cats = Object.keys(r.ing).map(id => CAT[id]?.cat);
  if (Object.keys(r.ing).some(id => profile.dislikes.includes(id))) return false;
  if (d.includes('veg') && cats.some(c => c === 'meat' || c === 'fish')) return false;
  if (d.includes('nomeat') && cats.includes('meat')) return false;
  if (d.includes('nofish') && cats.includes('fish')) return false;
  if (d.includes('lent') && (cats.some(c => ANIMAL.has(c)) || r.ing.honey)) return false;
  if (strict && d.includes('light') && r.kcal > 450) return false;
  if (strict && d.includes('quick') && r.time > 25) return false;
  return true;
}
function candidates(meal) {
  let list = RECIPES.filter(r => r.meals.includes(meal) && allowed(r));
  if (list.length < 2) list = RECIPES.filter(r => r.meals.includes(meal) && allowed(r, false));
  return list;
}
function generate({ budget = profile.budget, random = true } = {}) {
  clearCache();
  const slots = [];
  const count = {}, used = new Set();
  const days = profile.days.slice().sort(), P = portions();
  const protein = profile.diet.includes('protein');
  for (const d of days) for (const m of MEALS.filter(x => profile.meals.includes(x))) {
    const cands = candidates(m); if (!cands.length) continue;
    const prev = slots.find(s => s.d === d - 1 && s.m === m)?.r;
    const scored = cands.map(r => {
      let cost = Object.entries(r.ing).reduce((s, [id, q]) => s + (CAT[id] ? q * unitPrice(id) * (used.has(id) ? 0.65 : 1) : 0), 0) * P;
      if (protein && r.tags?.includes('protein')) cost *= 0.75;
      if (r.id === prev) cost *= 5;
      cost *= 1 + (count[r.id] || 0) * (cands.length > 6 ? 1.2 : 0.4);
      if (random) cost *= 0.8 + Math.random() * 0.5;
      return { r, cost };
    }).sort((a, b) => a.cost - b.cost);
    const pick = random ? scored[Math.floor(Math.random() * Math.min(3, scored.length))].r : scored[0].r;
    slots.push({ d, m, r: pick.id });
    count[pick.id] = (count[pick.id] || 0) + 1;
    Object.keys(pick.ing).forEach(id => used.add(id));
  }
  return fitBudget(slots, budget);
}
// заменяем самые дорогие блюда, пока не уложимся в бюджет
function fitBudget(slots, budget) {
  let total = basket(slots).total;
  for (let iter = 0; iter < (budget > 0 ? 40 : 25) && total > budget; iter++) {
    let best = null;
    slots.forEach((s, i) => {
      const used = slots.filter(x => x.r === s.r).length;
      for (const r of candidates(s.m)) {
        if (r.id === s.r || slots.filter(x => x.r === r.id).length >= 3) continue;
        const trial = slots.slice(); trial[i] = { ...s, r: r.id };
        const t = basket(trial).total;
        if (t < total - 1 && (!best || t < best.t)) best = { i, r: r.id, t, used };
      }
    });
    if (!best) break;
    slots[best.i] = { ...slots[best.i], r: best.r }; total = best.t;
  }
  return slots;
}

/* =========================================================
   АНКЕТА
   ========================================================= */
let draft, wizStep = 0;
const STEPS = ['shops', 'people', 'days', 'kitchen', 'diet', 'dislikes', 'pantry', 'budget'];

function startWizard() {
  draft = JSON.parse(JSON.stringify(profile || DEFAULT_PROFILE));
  wizStep = 0;
  $('app').classList.add('hidden'); $('wizard').classList.remove('hidden');
  renderWizard();
}
function tile(on, inner, attrs = '') { return `<button class="tile ${on ? 'on' : ''}" ${attrs}>${inner}</button>`; }
function toggleIn(arr, v) { const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v); }

function renderWizard() {
  const step = STEPS[wizStep], body = $('wiz-body');
  $('wiz-bar').style.width = `${(wizStep + 1) / (STEPS.length + 1) * 100}%`;
  $('wiz-step').textContent = `${wizStep + 1}/${STEPS.length}`;
  $('wiz-back').style.visibility = wizStep === 0 && !profile ? 'hidden' : 'visible';
  const next = $('wiz-next'); next.disabled = false; next.textContent = 'Дальше';
  let h = '';

  if (step === 'shops') {
    h = `<h1>Где вы покупаете продукты?</h1><p class="lead">📍 Чехия · скидки берём из летаков этих магазинов</p>
      <div class="grid3">${SHOPS.map(s => tile(draft.shops.includes(s.id), `<span class="shop-logo" style="background:${s.bg};color:${s.fg}">${esc(s.id[0])}</span><small>${esc(s.id)}</small>`, `data-shop="${esc(s.id)}"`)).join('')}</div>
      <label class="switch"><input type="checkbox" id="w-club" ${draft.club ? 'checked' : ''}><span><b>Есть карты магазинов</b><small>Lidl Plus, Moje Albert, Kaufland Card, Clubcard — учитывать цены «по карте»</small></span></label>`;
    next.textContent = draft.shops.length ? `Выбрать ${draft.shops.length} ${plural(draft.shops.length, 'магазин', 'магазина', 'магазинов')}` : 'Выберите магазин';
    next.disabled = !draft.shops.length;
  }
  if (step === 'people') {
    const P = draft.adults + draft.kids * 0.5;
    h = `<h1>Кто будет есть?</h1><p class="lead">Каждое блюдо сразу считаем на всех.</p>
      <div class="card stepper-row"><span class="emo">🧑</span><div><b>Взрослые</b><small>полные порции</small></div>${stepper('adults', draft.adults)}</div>
      <div class="card stepper-row"><span class="emo">🧒</span><div><b>Дети</b><small>детские порции</small></div>${stepper('kids', draft.kids)}</div>
      <div class="card info-row"><span>Порций на приём</span><b class="accent">${nf(P, 1)}</b></div>`;
    next.disabled = P <= 0;
  }
  if (step === 'days') {
    h = `<h1>В какие дни готовите?</h1><p class="lead">Планируем блюда только на выбранные дни.</p>
      <div class="days">${DAYS.map((d, i) => `<button class="day ${draft.days.includes(i) ? 'on' : ''}" data-day="${i}"><small>${d}</small><i></i></button>`).join('')}</div>
      <h2>Какие приёмы пищи?</h2>
      <div class="grid3">${MEALS.map(m => tile(draft.meals.includes(m), `<span class="emo">${{ Завтрак: '☕', Обед: '🍲', Ужин: '🌙' }[m]}</span><small>${m}</small>`, `data-meal="${m}"`)).join('')}</div>`;
    next.disabled = !draft.days.length || !draft.meals.length;
    if (next.disabled) next.textContent = 'Выберите хотя бы один день';
  }
  if (step === 'kitchen') {
    h = `<h1>Что есть на кухне?</h1><p class="lead">Отметьте технику — предложим только те рецепты, которые получится приготовить.</p>
      <div class="grid3">${EQUIPMENT.map(e => tile(draft.eq.includes(e.id), `<span class="emo big">${e.icon}</span><small>${e.name}</small>`, `data-eq="${e.id}"`)).join('')}</div>`;
  }
  if (step === 'diet') {
    h = `<h1>Как вы питаетесь?</h1><p class="lead">Можно выбрать несколько.</p>
      <div class="grid2">${DIETS.map(d => tile(draft.diet.includes(d.id), `<span class="emo">${d.icon}</span><b>${d.name}</b><small>${d.hint}</small>`, `data-diet="${d.id}"`)).join('')}</div>`;
  }
  if (step === 'dislikes') {
    const used = new Set(RECIPES.flatMap(r => Object.keys(r.ing)));
    h = `<h1>Что вы не едите?</h1><p class="lead">Уберём блюда с этими продуктами.</p>
      <div class="chips">${Object.entries(CAT).filter(([id]) => used.has(id)).map(([id, c]) => `<button class="chip ${draft.dislikes.includes(id) ? 'on no' : ''}" data-dis="${id}">${c.icon} ${esc(c.name)}</button>`).join('')}</div>`;
    next.textContent = draft.dislikes.length ? `Дальше · убрать ${draft.dislikes.length}` : 'Пропустить';
  }
  if (step === 'pantry') {
    const q = (renderWizard.q || '').toLowerCase(), f = renderWizard.f || 'all';
    const list = Object.entries(CAT).filter(([, c]) => (f === 'all' || c.cat === f) && c.name.toLowerCase().includes(q));
    h = `<h1>Что уже есть дома?</h1><p class="lead">Это не будем покупать. Соль, перец и специи считаем, что есть.</p>
      <input class="search" id="w-search" placeholder="🔍 Найти продукт" value="${esc(renderWizard.q || '')}">
      <div class="chips scroll">${[['all', 'Всё'], ...Object.entries(CATS).map(([k, v]) => [k, v[1]])].map(([k, l]) => `<button class="chip small ${f === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
      <div class="grid3 products">${list.map(([id, c]) => tile(draft.pantry.includes(id), `<span class="emo big">${c.icon}</span><small>${esc(c.name)}</small>`, `data-pan="${id}"`)).join('') || '<p class="lead">Ничего не нашлось</p>'}</div>`;
    next.textContent = draft.pantry.length ? `Выбрано ${draft.pantry.length} · дальше` : 'Дома ничего нет · дальше';
  }
  if (step === 'budget') {
    const old = profile; profile = draft;
    const minPlan = generate({ budget: 0, random: false });
    const min = basket(minPlan).total;
    const normal = basket(generate({ budget: Infinity, random: false })).total;
    profile = old; clearCache();
    const nP = draft.days.length * draft.meals.length * (draft.adults + draft.kids * 0.5);
    const b = draft.budget;
    const status = b >= normal ? ['😌', 'С запасом', `Это примерно на ${kc(b - normal)} больше, чем нужно на эту неделю (~${kc(normal)}). Хватит на продукты получше.`]
      : b >= min ? ['👌', 'Впритык', `Подберём блюда подешевле и учтём скидки. Обычно на такое меню уходит ~${kc(normal)}.`]
        : ['😬', 'Маловато', `Дешевле ~${kc(min)} на эту неделю не получится. Можно убрать какой-то приём пищи или день.`];
    h = `<h1>Ваш бюджет на неделю</h1><p class="lead">${draft.adults} ${plural(draft.adults, 'взрослый', 'взрослых', 'взрослых')}${draft.kids ? ` · ${draft.kids} ${plural(draft.kids, 'ребёнок', 'ребёнка', 'детей')}` : ''} · ${draft.meals.length} ${plural(draft.meals.length, 'приём', 'приёма', 'приёмов')} в день · ${draft.days.length} ${plural(draft.days.length, 'день', 'дня', 'дней')}</p>
      <button class="budget-big" id="w-budget-edit">${kc(b)}<small>в неделю · нажмите, чтобы ввести сумму</small></button>
      <input type="range" id="w-budget" min="300" max="6000" step="50" value="${Math.min(6000, b)}">
      <div class="range-labels"><span>300 Kč</span><span>6 000 Kč</span></div>
      <div class="card status"><b>${status[0]} ${status[1]}</b><p>${status[2]}</p></div>
      <div class="stats"><div><b>${kc(Math.min(b, Math.max(min, normal)))}</b><small>неделя выйдет</small></div><div><b>${kc(Math.max(min, Math.min(b, normal)) / Math.max(1, nP))}</b><small>на порцию</small></div><div><b>${nf(nP)}</b><small>порций в неделю</small></div></div>`;
    next.textContent = 'Собрать наше меню';
  }
  body.innerHTML = h; body.scrollTop = 0;
  bindWizard(step);
}
function stepper(key, v) { return `<div class="stepper"><button data-dec="${key}" ${v <= 0 ? 'disabled' : ''}>−</button><b>${v}</b><button data-inc="${key}">+</button></div>`; }

function bindWizard(step) {
  const b = $('wiz-body'), keep = () => { const y = b.scrollTop; renderWizard(); b.scrollTop = y; };
  b.querySelectorAll('[data-shop]').forEach(x => x.onclick = () => { toggleIn(draft.shops, x.dataset.shop); keep(); });
  b.querySelectorAll('[data-meal]').forEach(x => x.onclick = () => { toggleIn(draft.meals, x.dataset.meal); keep(); });
  b.querySelectorAll('[data-day]').forEach(x => x.onclick = () => { toggleIn(draft.days, +x.dataset.day); keep(); });
  b.querySelectorAll('[data-eq]').forEach(x => x.onclick = () => { toggleIn(draft.eq, x.dataset.eq); keep(); });
  b.querySelectorAll('[data-dis]').forEach(x => x.onclick = () => { toggleIn(draft.dislikes, x.dataset.dis); keep(); });
  b.querySelectorAll('[data-pan]').forEach(x => x.onclick = () => { toggleIn(draft.pantry, x.dataset.pan); keep(); });
  b.querySelectorAll('[data-f]').forEach(x => x.onclick = () => { renderWizard.f = x.dataset.f; keep(); });
  b.querySelectorAll('[data-diet]').forEach(x => x.onclick = () => {
    const id = x.dataset.diet;
    if (id === 'any') draft.diet = ['any'];
    else { draft.diet = draft.diet.filter(d => d !== 'any'); toggleIn(draft.diet, id); if (!draft.diet.length) draft.diet = ['any']; }
    keep();
  });
  b.querySelectorAll('[data-inc]').forEach(x => x.onclick = () => { draft[x.dataset.inc] = Math.min(12, draft[x.dataset.inc] + 1); keep(); });
  b.querySelectorAll('[data-dec]').forEach(x => x.onclick = () => { draft[x.dataset.dec] = Math.max(0, draft[x.dataset.dec] - 1); keep(); });
  const club = $('w-club'); if (club) club.onchange = () => { draft.club = club.checked; };
  const s = $('w-search');
  if (s) s.oninput = () => { renderWizard.q = s.value; renderWizard(); const n = $('w-search'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  const r = $('w-budget');
  if (r) {
    r.oninput = () => { $('w-budget-edit').firstChild.textContent = kc(+r.value); };
    r.onchange = () => { draft.budget = +r.value; keep(); };
  }
  const be = $('w-budget-edit');
  if (be) be.onclick = () => { const v = prompt('Бюджет на неделю, Kč', draft.budget); if (v !== null && +v > 0) { draft.budget = Math.round(+v); keep(); } };
}
$('wiz-back').onclick = () => { if (wizStep > 0) { wizStep--; renderWizard(); } else if (profile) { $('wizard').classList.add('hidden'); $('app').classList.remove('hidden'); } };
$('wiz-next').onclick = async () => {
  if (wizStep < STEPS.length - 1) { wizStep++; renderWizard(); return; }
  profile = draft; save();
  await buildingAnimation();
  plan = { week: mondayOf(), slots: generate() }; checked = {}; save();
  $('wizard').classList.add('hidden'); $('app').classList.remove('hidden');
  showTab('week'); renderAll();
  celebrate();
};
async function buildingAnimation() {
  $('wiz-bar').style.width = '100%';
  $('wiz-foot-hide')?.remove();
  $('wiz-next').disabled = true; $('wiz-next').textContent = 'Собираем…';
  const steps = ['Смотрим скидки недели…', 'Подбираем рецепты…', 'Считаем корзину…', 'Сверяем с бюджетом…', 'Собираем план…'];
  $('wiz-body').innerHTML = `<div class="building"><div class="orbit"><span>🥦</span><span>🍋</span><span>🍅</span><span>🌽</span><span>🥕</span><span>🧀</span><div class="logo-tile">🍲</div></div><b>Наше меню</b><h2>Считаем корзину…</h2><ul>${steps.map(s => `<li>${s}</li>`).join('')}</ul></div>`;
  const lis = $('wiz-body').querySelectorAll('li');
  for (let i = 0; i < lis.length; i++) { lis[i].className = 'doing'; await sleep(520); lis[i].className = 'done'; }
  await sleep(250);
}
function celebrate() {
  const b = basket(plan.slots);
  notify(b.total <= profile.budget ? `Готово! Уложились в ${kc(b.total)}` : `Готово. Дешевле ${kc(b.total)} не вышло`);
}

/* =========================================================
   ГЛАВНЫЙ ЭКРАН: НЕДЕЛЯ
   ========================================================= */
const recipe = id => RECIPES.find(r => r.id === id);
function renderWeek() {
  const v = $('view-week');
  if (!plan?.slots?.length) { v.innerHTML = `<div class="empty"><span>🍽️</span><h2>Меню ещё нет</h2><button class="cta" onclick="startWizard()">Собрать меню</button></div>`; return; }
  const b = basket(plan.slots), pct = Math.min(100, b.total / profile.budget * 100), over = b.total > profile.budget;
  const ti = todayIdx(), stale = plan.week !== mondayOf();
  const left = b.items.filter(i => !checked[i.id]).length;
  let h = `<header class="page-head"><h1>${stale ? 'Меню прошлой недели' : 'Ваша неделя готова!'}</h1></header>
    ${stale ? `<button class="card new-week" id="new-week"><span>✨</span><div><b>Новая неделя — новые скидки</b><small>Собрать свежее меню под актуальные акции</small></div><em>›</em></button>` : ''}
    <div class="top-cards">
      <div class="card spent"><small>ПОТРАЧЕНО ИЗ ${kc(profile.budget).toUpperCase()}</small><b>${kc(b.total)}</b>
        <span class="bar"><i style="width:${pct}%" class="${over ? 'over' : ''}"></i></span>
        ${b.saved >= 1 ? `<span class="saved">сэкономлено ${kc(b.saved)}</span>` : `<span class="saved muted">${b.deals} по акции</span>`}</div>
      <button class="card list-card" data-go="shop"><span class="emo">🛒</span><b>Список покупок</b><small>${left} ${plural(left, 'позиция', 'позиции', 'позиций')}</small><em>›</em></button>
    </div>`;
  const byDay = {};
  plan.slots.forEach((s, i) => (byDay[s.d] ??= []).push({ ...s, i }));
  for (const d of Object.keys(byDay).map(Number).sort((a, c) => a - c)) {
    const isToday = !stale && d === ti;
    h += `<h3 class="day-title ${isToday ? 'today' : ''}">${DAYS_FULL[d]}${isToday ? ' · сегодня' : ''}</h3>`;
    for (const s of byDay[d].sort((a, c) => MEALS.indexOf(a.m) - MEALS.indexOf(c.m))) {
      const r = recipe(s.r); if (!r) continue;
      h += `<div class="meal card"><button class="meal-main" data-recipe="${r.id}"><span class="food">${r.icon}</span>
        <span class="meal-txt"><small>${DAYS[d].toUpperCase()} · ${s.m.toUpperCase()}</small><b>${esc(r.name)}</b><em>${r.time} мин · ${r.kcal} ккал · ≈ ${kc(recipeCost(r) * portions())}</em></span></button>
        <button class="swap" data-swap="${s.i}" aria-label="Заменить блюдо"><span>⇄</span>Заменить</button></div>`;
    }
  }
  h += `<button class="cta ghost" id="regen">🔄 Собрать другое меню</button>`;
  v.innerHTML = h;
  v.querySelectorAll('[data-recipe]').forEach(x => x.onclick = () => openRecipe(x.dataset.recipe));
  v.querySelectorAll('[data-swap]').forEach(x => x.onclick = () => openSwap(+x.dataset.swap));
  v.querySelectorAll('[data-go]').forEach(x => x.onclick = () => showTab(x.dataset.go));
  $('regen').onclick = regenerate;
  if ($('new-week')) $('new-week').onclick = regenerate;
}
async function regenerate() {
  if (!confirm('Собрать новое меню на неделю? Текущее будет заменено.')) return;
  $('app').classList.add('hidden'); $('wizard').classList.remove('hidden');
  await buildingAnimation();
  plan = { week: mondayOf(), slots: generate() }; checked = {}; save();
  $('wizard').classList.add('hidden'); $('app').classList.remove('hidden');
  showTab('week'); renderAll(); celebrate();
}

function openSwap(i) {
  const s = plan.slots[i], cur = recipe(s.r), base = basket(plan.slots).total;
  const opts = candidates(s.m).filter(r => r.id !== s.r).map(r => {
    const t = plan.slots.slice(); t[i] = { ...s, r: r.id };
    return { r, delta: basket(t).total - base };
  }).sort((a, b) => a.delta - b.delta);
  openSheet(`<div class="sheet-head"><div><small class="eyebrow">${DAYS_FULL[s.d]} · ${s.m}</small><h2>Чем заменить?</h2></div><button class="x" data-close>×</button></div>
    <div class="card current"><span class="food">${cur.icon}</span><div><small>Сейчас</small><b>${esc(cur.name)}</b></div></div>
    <div class="opt-list">${opts.map(o => `<button class="opt" data-pick="${o.r.id}"><span class="food">${o.r.icon}</span><span class="opt-txt"><b>${esc(o.r.name)}</b><small>${o.r.time} мин · ${o.r.kcal} ккал</small></span><em class="${o.delta <= 0 ? 'cheaper' : ''}">${o.delta <= -1 ? '−' + kc(-o.delta) : o.delta >= 1 ? '+' + kc(o.delta) : '±0'}</em></button>`).join('')}</div>`);
  $('sheet-body').querySelectorAll('[data-pick]').forEach(x => x.onclick = () => {
    plan.slots[i] = { ...s, r: x.dataset.pick }; save(); closeSheet(); renderAll(); notify('Блюдо заменено');
  });
}

function openRecipe(id) {
  const r = recipe(id); if (!r) return;
  const P = portions();
  const ing = Object.entries(r.ing).map(([iid, q]) => {
    const c = CAT[iid]; if (!c) return '';
    const home = profile.pantry.includes(iid);
    return `<li><span>${c.icon} ${esc(c.name)}</span><b>${amount(q * P, c.unit)}${home ? ' · дома' : ''}</b></li>`;
  }).join('');
  openSheet(`<div class="sheet-head"><div><small class="eyebrow">${r.meals.join(' · ')}</small><h2>${esc(r.name)}</h2></div><button class="x" data-close>×</button></div>
    <div class="recipe-hero">${r.icon}</div>
    <div class="facts"><div><b>${r.time}</b><small>минут</small></div><div><b>${r.kcal}</b><small>ккал/порц.</small></div><div><b>${nf(P, 1)}</b><small>${plural(Math.ceil(P), 'порция', 'порции', 'порций')}</small></div><div><b>${kc(recipeCost(r) * P)}</b><small>сейчас</small></div></div>
    <h3 class="sub">Ингредиенты на ${nf(P, 1)} ${plural(Math.ceil(P), 'порцию', 'порции', 'порций')}</h3><ul class="ing">${ing}</ul>
    <h3 class="sub">Как готовить</h3><ol class="steps">${(r.steps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>`);
}

/* =========================================================
   ПОКУПКИ
   ========================================================= */
function renderShop() {
  const v = $('view-shop');
  if (!plan?.slots?.length) { v.innerHTML = '<div class="empty"><span>🛒</span><h2>Сначала соберите меню</h2></div>'; return; }
  const b = basket(plan.slots);
  const left = b.items.filter(i => !checked[i.id]).length;
  const upd = LIVE?.updated ? new Date(LIVE.updated) : null, old = upd && (Date.now() - upd) / 36e5 > 72;
  const modes = [['best', 'Где дешевле'], ...profile.shops.map(s => [s, s])];
  if (shopMode !== 'best' && !profile.shops.includes(shopMode)) shopMode = 'best';
  const compare = profile.shops.map(s => ({ s, ...basket(plan.slots, s) })).sort((a, c) => a.total - c.total);
  const best = basket(plan.slots, 'best');

  let h = `<header class="page-head"><h1>Список покупок</h1><p class="lead">${b.items.length} ${plural(b.items.length, 'позиция', 'позиции', 'позиций')} · ${shopMode === 'best' ? 'разные магазины' : esc(shopMode)} · ${kc(b.total)}</p></header>
    <div class="card total-card"><div><small>ИТОГО</small><b>${kc(b.total)}</b>${b.saved >= 1 ? `<span class="saved">−${kc(b.saved)} по акциям</span>` : ''}</div>
      <div class="total-side"><b>${b.deals}</b><small>из ${b.items.length}<br>по акции</small></div></div>
    <div class="price-status ${old ? 'old' : ''}">${upd ? `${old ? '⚠️' : '🟢'} Скидки от ${upd.toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}` : '⚪ Скидки не загружены — цены примерные'} <button class="link" id="reload-prices">обновить</button></div>
    <div class="chips scroll">${modes.map(([m, l]) => `<button class="chip ${shopMode === m ? 'on' : ''}" data-mode="${esc(m)}">${esc(l)}</button>`).join('')}</div>
    <details class="card compare"><summary>🏆 Где дешевле купить всё сразу?</summary>
      <button class="cmp ${shopMode === 'best' ? 'on' : ''}" data-mode="best"><span>По разным магазинам<small>каждый продукт там, где дешевле</small></span><b>${kc(best.total)}</b></button>
      ${compare.map(c => `<button class="cmp ${shopMode === c.s ? 'on' : ''}" data-mode="${esc(c.s)}"><span>Всё в ${esc(c.s)}<small>${c.deals} по акции</small></span><b>${kc(c.total)}</b></button>`).join('')}
    </details>`;
  const groups = {};
  b.items.forEach(it => (groups[CAT[it.id].cat] ??= []).push(it));
  for (const [cat, [icon, title]] of Object.entries(CATS)) {
    const list = groups[cat]; if (!list) continue;
    h += `<h3 class="group">${title.toUpperCase()}</h3><div class="card list">`;
    for (const it of list.sort((a, c) => CAT[a.id].name.localeCompare(CAT[c.id].name, 'ru'))) {
      const c = CAT[it.id], o = it.offer, done = checked[it.id];
      h += `<div class="item ${done ? 'done' : ''}"><label class="check"><input type="checkbox" data-check="${it.id}" ${done ? 'checked' : ''}><i></i></label>
        <button class="item-main" data-item="${it.id}"><span class="item-icon">${c.icon}</span><span class="item-txt"><b>${esc(c.name)}</b>
        <small>${amount(it.need, c.unit)}${it.packs > 1 || o ? ` · ${it.packs} × ${o ? esc(o.pack || amount(it.qty, c.unit)) : amount(it.qty, c.unit)}` : ''}</small>
        ${o ? `<span class="tags"><em class="t-shop">${esc(o.shop)}</em><em class="t-deal">${o.discountPct ? '−' + o.discountPct + '%' : 'акция'}</em>${o.club ? '<em class="t-club">по карте</em>' : ''}${o.validTo ? `<em class="t-date">до ${shortDate(o.validTo)}</em>` : ''}</span>` : ''}</span></button>
        <b class="price ${o ? 'deal' : ''}">${kc(it.total)}</b></div>`;
    }
    h += '</div>';
  }
  if (profile.pantry.length) h += `<h3 class="group">ЕСТЬ ДОМА — НЕ ПОКУПАЕМ</h3><div class="card pantry">${profile.pantry.map(id => CAT[id] ? `<span>${CAT[id].icon} ${esc(CAT[id].name)}</span>` : '').join('')}</div>`;
  h += `<div class="row-btns"><button class="cta ghost" id="share">Поделиться списком ↗</button><button class="cta ghost" id="uncheck">Снять отметки</button></div>
    <p class="note">Скидки — из летаков магазинов (kupi.cz), обновляются каждый день. Без акции показана примерная цена. Соль, перец и специи в список не входят.</p>`;
  v.innerHTML = h;
  v.querySelectorAll('[data-mode]').forEach(x => x.onclick = () => { shopMode = x.dataset.mode; save(); renderAll(); });
  v.querySelectorAll('[data-check]').forEach(x => x.onchange = () => { checked[x.dataset.check] = x.checked; save(); renderShop(); updateBadge(); });
  v.querySelectorAll('[data-item]').forEach(x => x.onclick = () => openItem(x.dataset.item));
  $('reload-prices').onclick = () => loadPrices(true);
  $('uncheck').onclick = () => { checked = {}; save(); renderShop(); updateBadge(); };
  $('share').onclick = () => shareList(b);
}
function openItem(id) {
  const c = CAT[id], need = needs()[id] || 0, it = buyOption(id, need);
  const usable = new Set(offersFor(id).map(o => o.product + o.shop + o.price));
  const all = offersFor(id, 'best', true).sort((a, b) => a.price / a.qty - b.price / b.qty);
  openSheet(`<div class="sheet-head"><div><small class="eyebrow">НУЖНО ${amount(need, c.unit).toUpperCase()}</small><h2>${c.icon} ${esc(c.name)}</h2></div><button class="x" data-close>×</button></div>
    <div class="card info-row"><span>Купить</span><b>${it.packs} × ${it.offer ? esc(it.offer.pack || '') : amount(it.qty, c.unit)} = ${kc(it.total)}</b></div>
    <h3 class="sub">Скидки сейчас</h3>
    <div class="offers">${all.length ? all.map(o => {
      const ok = usable.has(o.product + o.shop + o.price);
      const why = !profile.shops.includes(o.shop) ? 'не ваш магазин' : (!profile.club && o.club) ? 'только по карте' : (o.validFrom && o.validFrom > today()) ? `с ${shortDate(o.validFrom)}` : '';
      return `<div class="offer ${ok ? '' : 'off'}"><div><b>${esc(o.shop)}</b> · ${esc(o.product)}<small>${esc(o.pack || '')}${o.perUnit ? ' · ' + esc(o.perUnit) : ''}${o.validTo ? ' · до ' + shortDate(o.validTo) : ''}${o.club ? ' · по карте' : ''}${why ? ' · ' + why : ''}</small></div><b class="p">${kc(o.price)}${o.discountPct ? `<small>−${o.discountPct}%</small>` : ''}</b></div>`;
    }).join('') : '<p class="lead">Сейчас акций на этот продукт нет.</p>'}</div>
    <h3 class="sub">Обычная цена за ${amount(c.pack, c.unit)}</h3>
    <div class="manual"><input type="number" inputmode="decimal" id="m-price" value="${manual[id] ?? c.price}"><span>Kč</span><button class="cta small" id="m-save">Сохранить</button></div>
    <p class="note">${manual[id] != null ? 'Это ваша цена. Сотрите и сохраните, чтобы вернуть примерную.' : 'Примерная цена без акции — поправьте, если знаете точнее.'}</p>
    <label class="switch"><input type="checkbox" id="m-home" ${profile.pantry.includes(id) ? 'checked' : ''}><span><b>Это уже есть дома</b><small>убрать из списка покупок</small></span></label>
    <a class="link-out" target="_blank" rel="noopener" href="https://www.kupi.cz/hledej?f=${encodeURIComponent(c.kupi?.q || c.name)}">Все предложения на kupi.cz ↗</a>`);
  $('m-save').onclick = () => {
    const raw = $('m-price').value.trim().replace(',', '.');
    if (raw === '') delete manual[id]; else if (+raw >= 0) manual[id] = +raw; else return;
    save(); closeSheet(); renderAll(); notify('Цена сохранена');
  };
  $('m-home').onchange = e => { toggleIn(profile.pantry, id); save(); closeSheet(); renderAll(); notify(e.target.checked ? 'Убрали из покупок' : 'Вернули в покупки'); };
}
async function shareList(b) {
  const lines = b.items.filter(i => !checked[i.id]).map(i => `☐ ${CAT[i.id].name} — ${amount(i.need, CAT[i.id].unit)} · ${kc(i.total)}${i.offer ? ` (${i.offer.shop}, акция)` : ''}`);
  const text = `🛒 Покупки на неделю\n${lines.join('\n')}\n\nИтого ≈ ${kc(b.total)}`;
  try { if (navigator.share) return await navigator.share({ title: 'Список покупок', text }); } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); notify('Список скопирован'); } catch { notify('Не получилось поделиться'); }
}

/* =========================================================
   РЕЦЕПТЫ И ПРОФИЛЬ
   ========================================================= */
let recFilter = 'Все';
function renderRecipes() {
  const v = $('view-recipes');
  const list = RECIPES.filter(r => (recFilter === 'Все' || r.meals.includes(recFilter)));
  v.innerHTML = `<header class="page-head"><h1>Рецепты</h1><p class="lead">${RECIPES.length} блюд · зелёным — подходят под ваши настройки</p></header>
    <div class="chips">${['Все', ...MEALS].map(m => `<button class="chip ${recFilter === m ? 'on' : ''}" data-rf="${m}">${m}</button>`).join('')}</div>
    <div class="rec-grid">${list.map(r => `<button class="rec card ${allowed(r) ? 'ok' : 'no'}" data-recipe="${r.id}"><span class="food big">${r.icon}</span><b>${esc(r.name)}</b><small>${r.time} мин · ${r.kcal} ккал</small><em>≈ ${kc(recipeCost(r))}/порц.</em></button>`).join('')}</div>`;
  v.querySelectorAll('[data-rf]').forEach(x => x.onclick = () => { recFilter = x.dataset.rf; renderRecipes(); });
  v.querySelectorAll('[data-recipe]').forEach(x => x.onclick = () => openRecipe(x.dataset.recipe));
}
function renderProfile() {
  const v = $('view-profile'), p = profile;
  const row = (icon, title, val) => `<div class="prof-row"><span>${icon}</span><div><small>${title}</small><b>${val}</b></div></div>`;
  v.innerHTML = `<header class="page-head"><h1>Профиль</h1></header>
    <div class="card prof">
      ${row('🏪', 'Магазины', esc(p.shops.join(', ')) + (p.club ? ' · с картами' : ''))}
      ${row('👥', 'Кто ест', `${p.adults} взр.${p.kids ? ` + ${p.kids} дет.` : ''} · ${nf(portions(), 1)} порц. на приём`)}
      ${row('🗓️', 'Дни и приёмы', `${p.days.map(d => DAYS[d]).join(', ')} · ${p.meals.join(', ')}`)}
      ${row('🍳', 'Техника', EQUIPMENT.filter(e => p.eq.includes(e.id)).map(e => e.name).join(', ') || '—')}
      ${row('🥗', 'Питание', DIETS.filter(d => p.diet.includes(d.id)).map(d => d.name).join(', '))}
      ${row('🚫', 'Не едим', p.dislikes.map(id => CAT[id]?.name).filter(Boolean).join(', ') || 'всё едим')}
      ${row('💰', 'Бюджет', kc(p.budget) + ' в неделю')}
    </div>
    <button class="cta" id="edit-answers">Изменить ответы и пересобрать</button>
    <button class="cta ghost install hidden" id="install">📲 Установить на телефон</button>
    <button class="link danger" id="reset">Сбросить всё</button>
    <p class="note">Все данные хранятся только на этом телефоне.</p>`;
  $('edit-answers').onclick = startWizard;
  $('reset').onclick = () => { if (confirm('Удалить меню, ответы и свои цены?')) { Object.values(LS).forEach(k => k !== LS.live && localStorage.removeItem(k)); location.reload(); } };
  if (installEvent) $('install').classList.remove('hidden');
  $('install').onclick = async () => { if (!installEvent) return; installEvent.prompt(); await installEvent.userChoice; installEvent = null; renderProfile(); };
}

/* ---------- общее ---------- */
function openSheet(html) { $('sheet-body').innerHTML = html; const d = $('sheet'); if (!d.open) d.showModal(); d.scrollTop = 0; $('sheet-body').querySelectorAll('[data-close]').forEach(x => x.onclick = closeSheet); }
function closeSheet() { $('sheet').close(); }
$('sheet').addEventListener('click', e => { if (e.target === $('sheet')) closeSheet(); });
function updateBadge() { const n = plan?.slots ? basket(plan.slots).items.filter(i => !checked[i.id]).length : 0; $('tab-badge').textContent = n || ''; }
function renderAll() { clearCache(); if (!profile) return; renderWeek(); renderShop(); renderRecipes(); renderProfile(); updateBadge(); }
function showTab(t, push = true) {
  tab = ['week', 'shop', 'recipes', 'profile'].includes(t) ? t : 'week';
  document.querySelectorAll('.view').forEach(x => x.classList.toggle('hidden', x.id !== `view-${tab}`));
  document.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
  if (push && location.hash !== '#' + tab) history.pushState(null, '', '#' + tab);
  window.scrollTo(0, 0);
}
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => showTab(b.dataset.tab));
window.addEventListener('popstate', () => { if ($('sheet').open) closeSheet(); showTab(location.hash.slice(1), false); });

let installEvent = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; if (profile) renderProfile(); });

async function loadPrices(manualClick = false) {
  try {
    const r = await fetch(`prices.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) throw 0;
    const d = await r.json(); if (!d?.items) throw 0;
    LIVE = d; write(LS.live, d); localStorage.setItem('nm2-fetched', Date.now());
    if (manualClick) notify('Скидки обновлены');
  } catch { if (manualClick) notify(navigator.onLine ? 'Не удалось загрузить скидки' : 'Нет интернета — сохранённые цены'); }
  renderAll();
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - Number(localStorage.getItem('nm2-fetched') || 0) > 3 * 36e5) loadPrices(); else renderAll();
});

async function init() {
  try {
    const [c, r] = await Promise.all([fetch('data/catalog.json', { cache: 'no-cache' }).then(x => x.json()), fetch('data/recipes.json', { cache: 'no-cache' }).then(x => x.json())]);
    CAT = c.items; RECIPES = r;
  } catch {
    $('splash').innerHTML = '<div class="logo-tile">😕</div><b>Не получилось загрузить данные</b><span>Проверьте интернет и откройте приложение ещё раз.</span>';
    return;
  }
  $('splash').classList.add('hidden');
  if (profile) profile = { ...DEFAULT_PROFILE, ...profile };
  if (!profile || !plan) { startWizard(); }
  else { $('app').classList.remove('hidden'); showTab(location.hash.slice(1) || 'week', false); renderAll(); }
  loadPrices();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => { });
}
init();
