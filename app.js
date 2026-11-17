import { createStage, petPortrait } from './scene.js';
import { eggArt, coinSVG, ICONS } from './art.js';
import { initSfx, play as sfx } from './sfx.js';
import { PETS, PET_ORDER, RARITY, rollRarity, rollPet } from './pets.js';
import { createStepCounter } from './stepcounter.js';
import { DEFAULT_OUTFIT, avatarPicture } from './avatar3d.js';
import { initShop, showShop } from './shop.js';
import { initQuests, renderQuests, claimable, checkBadges } from './quests.js';
import { initSocial, renderRanks, renderMe, renderParent } from './social.js';
import { initNotify, notify, askMotion, askLocation, askAlerts, alertsState } from './notify.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString('en-SG');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const todayKey = () => new Date().toLocaleDateString('en-CA');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------- Saved progress (demo starting values; kept on this phone only) ----------------
const VERSION = 3;
// Levels: walking gives XP (1 XP every 5 steps, so 1,000 steps = 200 XP). Each level needs a bit more.
const XP_PER_STEPS = 5;
const LEVEL_COINS = 50;
const needXp = (lv) => 500 + 100 * (lv - 1);
// Streak: a day counts once the kid reaches 1,000 steps that day.
const STREAK_STEPS = 1000;
const dayKey = (back) => { const d = new Date(); d.setDate(d.getDate() - back); return d.toLocaleDateString('en-CA'); };
// Demo history so the prototype opens on a running streak: the 6 days before today were walking days.
const seedDays = () => [6, 5, 4, 3, 2, 1].map(dayKey);
const DEFAULTS = () => ({
  version: VERSION, nickname: 'Wei Jie', level: 6, xp: 210, coins: 1240, streak: 6, walkDays: seedDays(),
  day: todayKey(), steps: 3420, goal: 6000,
  eggs: [{ id: 'e1', rarity: 'rare', km: 1.2 }],
  pets: [...['otter', 'otter', 'otter', 'otter', 'otter', 'kingfisher', 'kingfisher', 'monitor'].map((type, i) => ({ id: `p${i + 1}`, type }))],
  buddy: 'otter', walks: [],
  // step 3
  outfit: { ...DEFAULT_OUTFIT }, owned: [], claimed: {}, badges: ['first', 'egg', 'week'],
  hatched: [], friends: ['f1', 'f2', 'f3', 'f4'], alerts: [], safeKm: 1, demoDay: null,
  demo: true, onboarded: true, tips: { home: 1, pets: 1, shop: 1, quests: 1, ranks: 1, me: 1 }, dayLog: {},
});
// A real new player: starts at zero with one egg to walk for and Kallie the otter as first buddy.
const FRESH = () => ({
  ...DEFAULTS(), nickname: 'Walker', level: 1, xp: 0, coins: 100, streak: 0, walkDays: [], steps: 0,
  eggs: [{ id: 'e1', rarity: 'common', km: 0 }], pets: [{ id: 'p1', type: 'otter' }], buddy: 'otter',
  badges: [], friends: [], alerts: [], demo: false, onboarded: false, tips: {}, dayLog: {},
});
function load() {
  try {
    const s = JSON.parse(localStorage.getItem('stepsy') || localStorage.getItem('stepsy-real') || 'null');
    if (!s || s.version < 2) return FRESH();
    s.version = VERSION;
    if (s.demo == null) { s.demo = true; s.onboarded = true; s.tips = DEFAULTS().tips; } // saves from before 17 Nov = demo data
    if (s.day !== todayKey() && s.steps) s.dayLog = { ...(s.dayLog || {}), [s.day]: s.steps };
    if (s.outfit) { s.outfit.chair = null; s.outfit.hearing = false; } // wheelchairs + hearing aid removed (17 Nov)
    if (s.outfit?.look?.startsWith('female-a')) s.outfit.look = 'female-b'; // look with crutch-like tool removed
    if (s.day !== todayKey()) { s.day = todayKey(); s.steps = 0; }
    if (s.xp == null) s.xp = Math.round((s.levelXp ?? 0.42) * needXp(s.level || 6)); // old saves: bar % -> XP
    delete s.levelXp;
    if (!Array.isArray(s.walkDays)) s.walkDays = seedDays();
    return { ...DEFAULTS(), ...s };
  } catch { return FRESH(); }
}
const state = load();
if (state.steps >= STREAK_STEPS && !state.walkDays.includes(state.day)) state.walkDays.push(state.day);
calcStreak();
initSfx();
// New day while the app stays open (e.g. installed on the home screen overnight).
function rollDay() {
  if (state.day === todayKey()) return;
  if (state.steps) state.dayLog = { ...state.dayLog, [state.day]: state.steps };
  state.day = todayKey(); state.steps = 0;
  calcStreak();
  save();
  renderTop();
}

// Streak = walking days in a row, ending today (or yesterday, so it stays alive until tonight).
function calcStreak() {
  const set = new Set(state.walkDays);
  let back = set.has(dayKey(0)) ? 0 : 1, n = 0;
  while (set.has(dayKey(back))) { n++; back++; }
  state.streak = n;
}
function markWalkDay() {
  if (state.steps < STREAK_STEPS || state.walkDays.includes(state.day)) return;
  state.walkDays = [...state.walkDays, state.day].slice(-730);
  calcStreak();
  setTimeout(() => { sfx('cheer'); toast(`Streak! ${state.streak} ${state.streak === 1 ? 'day' : 'days'} in a row`); }, 900);
}
function addXp(n) {
  state.xp += n;
  let ups = 0;
  while (state.xp >= needXp(state.level)) { state.xp -= needXp(state.level); state.level++; ups++; }
  if (!ups) return;
  state.coins += LEVEL_COINS * ups;
  setTimeout(() => {
    sfx('levelup');
    toast(`Level up! You're Lv ${state.level} now. +${LEVEL_COINS * ups} coins`);
    renderTop();
    const p = $('profile'); p.classList.remove('lvpop'); void p.offsetWidth; p.classList.add('lvpop');
  }, 500);
}
function save() { try { localStorage.setItem('stepsy', JSON.stringify(state)); } catch {} document.dispatchEvent(new Event('stepsy-saved')); }
const uid = () => Math.random().toString(36).slice(2, 9);
// Eggs are walked in km inside the app, but kids see steps (about 1,800 steps per km).
const kmSteps = (km) => Math.round(km / 0.00055 / 100) * 100;
// The goal is the round number of steps kids SEE (1 km shows as 1,800 steps), so the egg hatches exactly when the
// bar says 1,800 / 1,800. (It used to need 1,818 real steps, and progress was rounded up, so it looked full but wasn't.)
const eggGoal = (egg) => kmSteps(RARITY[egg.rarity].km) * 0.00055;
const eggReady = (egg) => egg.km >= eggGoal(egg) - 1e-6;
const stepsDone = (km) => Math.floor(km / 0.00055 / 100 + 1e-6) * 100;
const eggSteps = (egg) => `${fmt(eggReady(egg) ? kmSteps(eggGoal(egg)) : stepsDone(egg.km))} / ${fmt(kmSteps(eggGoal(egg)))} steps`;

// ---------------- Static art ----------------
document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = ICONS[el.dataset.icon]; });
document.querySelectorAll('[data-art="coin"]').forEach((el) => { el.innerHTML = coinSVG; });

// ---------------- Toast ----------------
let toastTimer, toastQ = [];
function toast(msg) {
  if (toastTimer) { if (toastQ.length < 3) toastQ.push(msg); return; }
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => { toastTimer = 0; const next = toastQ.shift(); if (next) toast(next); }, 250);
  }, 2200);
}

// ---------------- Progress shared by walks and the demo button ----------------
const PER_FRUIT = 1000;  // every 1,000 steps (up to today's goal) gives coins
const FRUIT_COINS = 20;
// Adds steps and km. Returns coins earned from new 1,000-step marks.
function addProgress(steps, km) {
  rollDay();
  const before = Math.floor(state.steps / PER_FRUIT);
  const xpBefore = Math.floor(state.steps / XP_PER_STEPS);
  state.steps += steps;
  state.dayLog = { ...state.dayLog, [state.day]: state.steps };
  addXp(Math.floor(state.steps / XP_PER_STEPS) - xpBefore);
  markWalkDay();
  const after = Math.floor(state.steps / PER_FRUIT);
  const maxFruits = state.goal / PER_FRUIT;
  const newFruits = Math.max(0, Math.min(after, maxFruits) - Math.min(before, maxFruits));
  const coins = newFruits * FRUIT_COINS;
  state.coins += coins;
  let readyNow = false;
  for (const egg of state.eggs) { const was = eggReady(egg); egg.km = Math.min(egg.km + km, eggGoal(egg)); if (!was && eggReady(egg)) readyNow = true; }
  save();
  if (readyNow) setTimeout(() => notify('Your egg is ready!', 'Open Pets and tap Hatch to see who it is.', { toast, tag: 'egg' }), 1200);
  return coins;
}

// ---------------- Top bar ----------------
function renderTop() {
  $('nickname').textContent = state.nickname;
  $('levelText').textContent = `Lv ${state.level}`;
  $('levelBar').style.width = `${Math.min(100, Math.round((state.xp / needXp(state.level)) * 100))}%`;
  $('streak').textContent = state.streak > 0 ? `${state.streak}-day streak` : 'No streak yet';
  $('streak').classList.toggle('zero', !state.streak);
  $('streak').setAttribute('aria-label', `${state.streak > 0 ? `${state.streak}-day streak` : 'No streak yet'}. See your week`);
  $('coins').textContent = fmt(state.coins);
}

// ---------------- Home: today's steps bar ----------------
let shownSteps = 0;
function renderGoal() {
  const total = state.goal / PER_FRUIT;
  const done = Math.min(Math.floor(state.steps / PER_FRUIT), total);
  $('goalFill').style.width = `${Math.min(state.steps / state.goal, 1) * 100}%`;
  $('goalMarks').innerHTML = Array.from({ length: total }, (_, i) =>
    `<li class="${i < done ? 'hit' : ''}" style="--x:${((i + 1) / total) * 100}%"><span class="mk">${coinSVG}</span><small>${i + 1}k</small></li>`).join('');
  const bar = $('goalBar');
  bar.setAttribute('aria-valuemax', state.goal);
  bar.setAttribute('aria-valuenow', Math.min(state.steps, state.goal));
  bar.setAttribute('aria-valuetext', `${fmt(state.steps)} of ${fmt(state.goal)} steps`);
  $('goalNum').textContent = fmt(state.goal);
  const left = PER_FRUIT - (state.steps % PER_FRUIT);
  // Coins drop straight into your coins at every 1,000 steps (no claiming); the ticked coins are the ones you got.
  const got = done * FRUIT_COINS;
  $('goalCaption').textContent = done >= total
    ? `Goal done! You got all ${fmt(got)} coins today.`
    : `${got ? `Got ${fmt(got)} coins. ` : ''}${fmt(left)} more steps for +${FRUIT_COINS}.`;
}
function countUp(el, from, to, done) {
  if (reduceMotion) { el.textContent = fmt(to); done?.(); return; }
  const start = performance.now(), dur = 700;
  (function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick); else done?.();
  })(performance.now());
}
function renderSteps() { const to = state.steps; countUp($('stepsNum'), shownSteps, to, () => { shownSteps = to; }); }

// ---------------- Home: egg card ----------------
function leadEgg() {
  return [...state.eggs].sort((a, b) => b.km / eggGoal(b) - a.km / eggGoal(a))[0];
}
function renderHomeEgg() {
  const egg = leadEgg();
  const card = $('eggCard');
  if (!egg) {
    $('homeEgg').innerHTML = eggArt({ base: '#FFF6EF', spots: ['#F3D9CC', '#F3D9CC', '#F3D9CC'] });
    $('eggTitle').textContent = 'No eggs yet';
    $('eggLeft').textContent = 'Go for a walk to find one';
    $('eggBar').style.width = '0%';
    card.dataset.egg = '';
    return;
  }
  const r = RARITY[egg.rarity];
  $('homeEgg').innerHTML = eggArt(r.egg);
  $('eggTitle').textContent = `${r.label} egg${state.eggs.length > 1 ? ` (+${state.eggs.length - 1} more)` : ''}`;
  const left = eggGoal(egg) - egg.km;
  $('eggLeft').textContent = eggReady(egg) ? 'Ready to hatch! Tap to open' : `Walk ${fmt(Math.max(100, kmSteps(left)))} more steps to hatch it`;
  $('eggBar').style.width = `${Math.min(egg.km / eggGoal(egg), 1) * 100}%`;
  card.dataset.egg = egg.id;
  card.classList.toggle('ready', eggReady(egg));
}
function wobble(el) {
  if (!el || reduceMotion) return;
  el.classList.remove('wobble'); void el.offsetWidth; el.classList.add('wobble');
}

function renderBuddy() {
  const p = PETS[state.buddy];
  $('buddyName').textContent = `${isGold(state.buddy) ? 'Gold ' : ''}${p.name}`;
  $('buddySpecies').textContent = p.species.split(' ').slice(-1)[0].replace(/^\w/, (c) => c.toUpperCase());
}

function renderHome(animate) {
  renderTop();
  renderSteps();
  renderGoal();
  renderHomeEgg();
  renderBuddy();
}

// ---------------- Sheets ----------------
let sheetOnClose = null;
// Only the open pop-up (and the toast) can be reached; everything else in the app is inert.
function trapTo(...keep) { [...$('app').children].forEach((el) => { el.inert = keep.length > 0 && !keep.includes(el); }); }
let sheetOpen = false, sheetReturn = null;
function openSheet(html, { onClose, lock = false } = {}) {
  if (!sheetOpen) sheetReturn = document.activeElement;
  sheetOpen = true;
  $('sheetBody').innerHTML = html;
  if ($('sheet').hidden) sfx('open');
  $('scrim').hidden = false;
  $('sheet').hidden = false;
  $('scrim').dataset.lock = lock ? '1' : '';
  sheetOnClose = onClose || null;
  trapTo($('scrim'), $('sheet'), $('toast'));
  $('sheet').focus({ preventScroll: true });
  requestAnimationFrame(() => { $('scrim').classList.add('show'); $('sheet').classList.add('show'); });
  return $('sheetBody');
}
function closeSheet() {
  if (!$('sheet').hidden) sfx('close');
  sheetOpen = false;
  trapTo(...($('intro').hidden ? [] : [$('intro'), $('toast')]));
  const back = sheetReturn; sheetReturn = null;
  if (back && document.contains(back) && !back.closest('[hidden]')) back.focus({ preventScroll: true });
  $('scrim').classList.remove('show');
  $('sheet').classList.remove('show');
  setTimeout(() => { $('scrim').hidden = true; $('sheet').hidden = true; $('sheetBody').innerHTML = ''; }, 220);
  const cb = sheetOnClose; sheetOnClose = null; cb?.();
}
$('scrim').addEventListener('click', () => { if (!$('scrim').dataset.lock) closeSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('sheet').hidden && !$('scrim').dataset.lock) closeSheet(); });

// ---------------- Hatching ----------------
function isGold(type) { return state.pets.some((p) => p.type === type && p.gold); }
function hatch(eggId) {
  const egg = state.eggs.find((e) => e.id === eggId);
  if (!egg || !eggReady(egg)) return;
  const type = rollPet(egg.rarity, Math.random, state.pets.map((p) => p.type));
  const pet = PETS[type];
  const isNew = !state.pets.some((p) => p.type === type);
  state.eggs = state.eggs.filter((e) => e.id !== eggId);
  state.pets.push({ id: uid(), type });
  state.hatched.push(Date.now());
  state.coins += 30;
  addXp(40);
  save();

  const body = openSheet(`
    <div class="hatch">
      <div class="hatch-egg shaking">${eggArt(RARITY[egg.rarity].egg)}</div>
      <p class="hatch-wait">Something is moving...</p>
    </div>`, { lock: true });
  if (!reduceMotion) sfx('shake');
  const reveal = () => {
    // A new hatch is never gold (only 5 copies joined with Make gold are), even if you already own a gold one.
    const gold = false;
    sfx('hatch');
    body.innerHTML = `
      <div class="hatch revealed">
        <div class="burst" aria-hidden="true"></div>
        <img class="hatch-pet" src="${petPortrait(type, 320, { gold })}" alt="${gold ? 'Gold ' : ''}${esc(pet.name)} the ${esc(pet.species)}">
        <h2 id="sheetTitle">It's ${gold ? 'Gold ' : ''}${esc(pet.name)}!</h2>
        <p class="rarity r-${egg.rarity}">${RARITY[egg.rarity].label}${isNew ? ' · New!' : ''}</p>
        <p class="species">${esc(pet.species)}</p>
        <p class="fact">${esc(pet.fact)}</p>
        <p class="muted">+30 coins</p>
        <div class="sheet-actions">
          <button class="btn-soft" type="button" data-act="buddy">Make buddy</button>
          <button class="btn-main" type="button" data-act="close">Yay!</button>
        </div>
      </div>`;
    $('scrim').dataset.lock = '';
    body.querySelector('[data-act="close"]').addEventListener('click', closeSheet);
    body.querySelector('[data-act="buddy"]').addEventListener('click', () => { setBuddy(type); closeSheet(); });
    body.querySelector('[data-act="close"]').focus();
    // Show the new pet straight away on the Pets screen (it used to keep showing the old one).
    selected = type;
    petStage?.setPet(type, { gold: isGold(type) });
    renderAll();
    if (!$('screen-pets').hidden) renderPets();
  };
  setTimeout(reveal, reduceMotion ? 300 : 1700);
}

function setBuddy(type) {
  state.buddy = type;
  selected = type;
  petStage?.setPet(type, { gold: isGold(type) });
  save();
  homeStage?.setPet(type, { gold: isGold(type) });
  renderBuddy();
  renderPets();
  toast(`${PETS[type].name} is your buddy now`);
}

// ---------------- Pets tab ----------------
let petStage = null;
let selected = state.buddy;
const petActions = document.createElement('div');
petActions.className = 'pet-actions';
$('buddyBtn').before(petActions);
petActions.appendChild($('buddyBtn'));
const goldBtn = document.createElement('button');
goldBtn.id = 'goldBtn'; goldBtn.type = 'button'; goldBtn.className = 'btn-soft make-gold';
goldBtn.textContent = 'Make gold'; goldBtn.hidden = true;
petActions.appendChild(goldBtn);
goldBtn.addEventListener('click', () => {
  const type = selected, pet = PETS[type];
  const body = openSheet(`
    <div class="hatch gold-ask">
      <img class="hatch-pet" src="${petPortrait(type, 240, { gold: true })}" alt="Gold ${esc(pet.name)}">
      <h2 id="sheetTitle">Make a gold ${esc(pet.name)}?</h2>
      <p class="fact">Your 5 ${esc(pet.name.endsWith('y') ? `${pet.name.slice(0, -1)}ies` : `${pet.name}s`)} join into 1 gold ${esc(pet.name)}. It's free, no coins.</p>
      <div class="sheet-actions">
        <button class="btn-soft" type="button" data-act="close">Not now</button>
        <button class="btn-main" type="button" data-act="gold">Make gold</button>
      </div>
    </div>`);
  body.querySelector('[data-act="close"]').addEventListener('click', closeSheet);
  body.querySelector('[data-act="gold"]').addEventListener('click', () => makeGold(type));
});
const goldProgress = document.createElement('div');
goldProgress.className = 'gold-progress'; goldProgress.hidden = true;
petActions.before(goldProgress);

function makeGold(type) {
  if (isGold(type) || state.pets.filter((p) => p.type === type).length < 5) return;
  let used = 0;
  state.pets = state.pets.filter((p) => {
    if (p.type === type && used < 5) { used++; return false; }
    return true;
  });
  state.pets.push({ id: uid(), type, gold: true });
  save();
  sfx('hatch');
  petStage?.setPet(type, { gold: true });
  homeStage?.setPet(state.buddy, { gold: isGold(state.buddy) });
  renderPets();
  renderBuddy();
  const pet = PETS[type];
  const copies = pet.name.endsWith('y') ? `${pet.name.slice(0, -1)}ies` : `${pet.name}s`;
  const body = openSheet(`
    <div class="hatch revealed gold-reveal">
      <div class="burst" aria-hidden="true"></div>
      <img class="hatch-pet" src="${petPortrait(type, 320, { gold: true })}" alt="Gold ${esc(pet.name)} the ${esc(pet.species)}">
      <h2 id="sheetTitle">Gold ${esc(pet.name)}!</h2>
      <p class="fact">5 ${esc(copies)} joined into 1 gold ${esc(pet.name)}. Gold pets shine on walks!</p>
      <div class="sheet-actions"><button class="btn-main" type="button" data-act="close">Yay!</button></div>
    </div>`, { onClose: () => $('petGrid').querySelector('.sel')?.focus({ preventScroll: true }) });
  body.querySelector('[data-act="close"]').addEventListener('click', closeSheet);
  body.querySelector('[data-act="close"]').focus();
}

function renderPets() {
  const owned = new Map();
  state.pets.forEach((p) => owned.set(p.type, (owned.get(p.type) || 0) + 1));
  if (!owned.has(selected)) selected = state.buddy;
  const p = PETS[selected];
  const gold = isGold(selected), count = owned.get(selected) || 0;
  $('petName').textContent = `${gold ? 'Gold ' : ''}${p.name}`;
  $('petSpecies').textContent = p.species;
  $('petFact').textContent = p.fact;
  const rar = $('petRarity');
  rar.textContent = RARITY[p.rarity].label;
  rar.className = `rarity r-${p.rarity}`;
  const bb = $('buddyBtn');
  bb.disabled = selected === state.buddy;
  bb.textContent = selected === state.buddy ? 'Your buddy' : 'Make buddy';
  goldBtn.hidden = gold || count < 5;
  goldBtn.setAttribute('aria-label', `Make gold ${p.name} with 5 copies`);
  goldProgress.hidden = gold || !count;
  goldProgress.innerHTML = `
    <span>Gold: ${Math.min(count, 5)} / 5</span>
    <progress class="gold-bar" value="${Math.min(count, 5)}" max="5" aria-label="Copies for a gold ${esc(p.name)}"></progress>`;

  // Eggs
  $('eggCount').textContent = `${state.eggs.length} of 3`;
  const row = $('eggRow');
  row.innerHTML = state.eggs.length ? '' : '<p class="empty">No eggs right now. Walks can find up to 3.</p>';
  state.eggs.forEach((egg) => {
    const r = RARITY[egg.rarity];
    const ready = eggReady(egg);
    const tile = document.createElement('div');
    tile.className = `egg-tile sticker${ready ? ' ready' : ''}`;
    tile.innerHTML = `
      <span class="egg">${eggArt(r.egg)}</span>
      <strong>${r.label}</strong>
      ${ready
        ? `<button class="btn-main sm" type="button">Hatch</button>`
        : `<span class="km num">${eggSteps(egg)}</span><span class="bar mint" aria-hidden="true"><span style="width:${Math.min(egg.km / eggGoal(egg), 1) * 100}%"></span></span>`}`;
    tile.querySelector('button')?.addEventListener('click', () => hatch(egg.id));
    row.appendChild(tile);
  });

  // Collection
  $('collCount').textContent = `${owned.size} of ${PET_ORDER.length}`;
  const grid = $('petGrid');
  grid.innerHTML = '';
  PET_ORDER.forEach((type) => {
    const pet = PETS[type];
    const has = owned.has(type);
    const gold = isGold(type), count = owned.get(type) || 0;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pet-card sticker${has ? '' : ' locked'}${type === selected && has ? ' sel' : ''}${gold ? ' is-gold' : ''}`;
    b.innerHTML = `
      <img src="${petPortrait(type, 192, { gold })}" alt="">
      <span class="pc-name">${has ? esc(pet.name) : '???'}</span>
      <span class="pc-sub">${has ? `x${count}` : RARITY[pet.rarity].label}</span>
      ${gold ? '<span class="pc-gold">Gold</span>' : count >= 5 ? '<span class="pc-gold-hint">5/5 Make gold!</span>' : ''}
      ${type === state.buddy ? '<span class="pc-buddy">Buddy</span>' : ''}`;
    b.setAttribute('aria-label', has ? `${gold ? 'Gold ' : ''}${pet.name}, ${pet.species}, x${count}${!gold && count >= 5 ? ', Make gold ready' : ''}` : `Not found yet, ${RARITY[pet.rarity].label}`);
    b.addEventListener('click', () => {
      if (!has) { toast(`Not found yet. ${RARITY[pet.rarity].label} eggs can hatch one.`); return; }
      selected = type;
      petStage?.setPet(type, { gold: isGold(type) });
      renderPets();
    });
    grid.appendChild(b);
  });
}
$('buddyBtn').addEventListener('click', () => setBuddy(selected));

// ---------------- Tabs ----------------
function showScreen(name) {
  document.querySelectorAll('[data-screen]').forEach((s) => { s.hidden = s.dataset.screen !== name; });
  document.body.dataset.view = name;
  showTip(name);
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.tab === name;
    t.classList.toggle('on', on);
    if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
  if (name === 'pets') {
    renderPets();
    if (!petStage) petStage = createStage($('petStage'), { pet: selected, gold: isGold(selected), mode: 'viewer' });
    else { petStage.setPet(selected, { gold: isGold(selected) }); petStage.kick(); }
  }
  if (name === 'home') homeStage?.kick();
  if (name === 'shop') showShop();
  if (name === 'quests') renderQuests();
  if (name === 'ranks') renderRanks();
  if (name === 'me') { renderMe(); renderAlertsBtn(); }
  if (name === 'parent') renderParent();
  $(`screen-${name}`).scrollTop = 0;
  window.scrollTo(0, 0); // the page itself scrolls now (lets Safari shrink its address bar)
  updateDots();
}
document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => showScreen(tab.dataset.tab)));

// A small dot on Quests when there are coins to claim.
function updateDots() {
  const n = claimable();
  const t = document.querySelector('.tab[data-tab="quests"]');
  t.classList.toggle('dot', n > 0);
  t.setAttribute('aria-label', n ? `Quests, ${n} to claim` : 'Quests');
}

// Little coins that fly from a button to the coin pill.
function coinBurst(fromEl) {
  if (reduceMotion || !fromEl) return;
  const a = fromEl.getBoundingClientRect(), b = document.querySelector('.coins').getBoundingClientRect();
  for (let i = 0; i < 6; i++) {
    const c = document.createElement('span');
    c.className = 'fly-coin';
    c.innerHTML = coinSVG;
    c.style.left = `${a.left + a.width / 2 - 12}px`;
    c.style.top = `${a.top + a.height / 2 - 12}px`;
    document.body.appendChild(c);
    const dx = b.left + 10 - (a.left + a.width / 2), dy = b.top + 6 - (a.top + a.height / 2);
    c.animate([
      { transform: 'translate(0,0) scale(.6)', opacity: 0 },
      { transform: `translate(${(Math.random() - 0.5) * 60}px, -30px) scale(1)`, opacity: 1, offset: 0.3 },
      { transform: `translate(${dx}px, ${dy}px) scale(.7)`, opacity: 1 },
    ], { duration: 650 + i * 70, easing: 'cubic-bezier(.3,.7,.3,1)' }).onfinish = () => c.remove();
  }
  const pill = document.querySelector('.coins');
  setTimeout(() => { pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }, 700);
}

function setBadge(url) {
  if (!url) return;
  const badge = $('badge');
  let img = badge.querySelector('img');
  if (!img) { img = new Image(); img.alt = ''; badge.appendChild(img); }
  img.src = url;
}
// Wearing something new also redraws the small picture in the top bar (it used to keep the old look).
function applyOutfit(o) { homeStage?.setOutfit(o); avatarPicture(o, { size: 96, head: true }).then(setBadge); }

// ---------------- Home interactions ----------------
$('demoSteps').addEventListener('click', () => {
  const coins = addProgress(500, 0.35);
  if (coins) { sfx('mark'); toast(`1,000 more steps! +${coins} coins`); }
  renderAll(true);
  wobble($('homeEgg'));
});
$('eggCard').addEventListener('click', () => {
  const egg = state.eggs.find((e) => e.id === $('eggCard').dataset.egg);
  if (egg && eggReady(egg)) hatch(egg.id);
  else { wobble($('homeEgg')); showScreen('pets'); }
});
$('profileBtn').addEventListener('click', () => showScreen('me'));
$('streak').addEventListener('click', () => {
  showScreen('quests');
  const card = document.querySelector('.streak-card');
  card?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  card?.classList.remove('flash'); void card?.offsetWidth; card?.classList.add('flash');
});
let pressTimer;
$('stepsNum').addEventListener('pointerdown', () => {
  if (!state.demo) return;
  pressTimer = setTimeout(() => {
    Object.assign(state, DEFAULTS());
    save();
    shownSteps = 0; selected = state.buddy;
    homeStage?.setPet(state.buddy, { gold: isGold(state.buddy) });
    homeStage?.setOutfit(state.outfit);
    renderAll(true);
    toast('Demo reset');
  }, 900);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => $('stepsNum').addEventListener(ev, () => clearTimeout(pressTimer)));

// ---------------- Walk ----------------
const safeKm = () => state.safeKm || 1; // parent-set safe distance from where the walk started
const STRIDE_KM = 0.00055;    // about 55 cm per step for a primary school kid
const EGG_CHECK_EVERY = 300;  // steps between egg rolls
let walk = null;
const counter = createStepCounter((total) => {
  if (!walk) return;
  const d = total - walk.sensorTotal;
  walk.sensorTotal = total;
  if (d > 0 && !walk.paused) creditSteps(d);
});

function haversineKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// Distance always comes from steps (GPS is only used for the safe-zone check), so km can't be counted twice.
const walkKm = () => walk.steps * STRIDE_KM;

function creditSteps(d) {
  walk.steps += d;
  creditKm(d);
  if (walk.steps >= walk.nextEggCheck) {
    walk.nextEggCheck += EGG_CHECK_EVERY;
    const guarantee = walk.eggsFound === 0 && walk.steps >= 900;
    if (state.eggs.length < 3 && (guarantee || Math.random() < 0.35)) findEgg();
  }
  renderWalk();
}
function creditKm(stepsAdded = 0) {
  const km = walkKm();
  const dKm = Math.max(km - walk.kmCredited, 0);
  walk.kmCredited = km;
  const coins = addProgress(stepsAdded, dKm);
  if (coins) { walk.coins += coins; sfx('mark'); toast(`1,000 more steps! +${coins} coins`); }
}

function findEgg() {
  const rarity = rollRarity();
  state.eggs.push({ id: uid(), rarity, km: 0 });
  walk.eggsFound++;
  save();
  const r = RARITY[rarity];
  setTimeout(() => sfx('egg'), 120);
  const body = openSheet(`
    <div class="found">
      <div class="hatch-egg pop">${eggArt(r.egg)}</div>
      <h2 id="sheetTitle">You found an egg!</h2>
      <p class="rarity r-${rarity}">${r.label}</p>
      <p>Walk ${fmt(kmSteps(r.km))} steps to hatch it.</p>
      <div class="sheet-actions"><button class="btn-main" type="button" data-act="close">Keep walking</button></div>
    </div>`);
  body.querySelector('[data-act="close"]').addEventListener('click', closeSheet);
}

function setStatus(text, kind) {
  const s = $('walkStatus');
  s.textContent = text;
  s.className = `status ${kind || ''}`;
}
function showAlert(text, kind, ms) {
  const a = $('walkAlert');
  a.textContent = text;
  a.className = `alert ${kind}`;
  a.hidden = false;
  clearTimeout(a._t);
  if (ms) a._t = setTimeout(() => { a.hidden = true; }, ms);
}

function renderWalk() {
  if (!walk) return;
  $('wSteps').textContent = fmt(walk.steps);
  const secs = Math.floor(walk.activeMs / 1000);
  $('wTime').textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  $('wDist').textContent = walkKm().toFixed(2);
  $('wCoins').textContent = fmt(walk.coins);
  const eggs = $('wEggs');
  eggs.innerHTML = state.eggs.map((egg) => {
    const r = RARITY[egg.rarity];
    return `<div class="w-egg"><span class="egg">${eggArt(r.egg)}</span><span class="bar mint" aria-hidden="true"><span style="width:${Math.min(egg.km / eggGoal(egg), 1) * 100}%"></span></span><span class="num">${eggReady(egg) ? 'Ready!' : eggSteps(egg)}</span></div>`;
  }).join('') || '<p class="muted">Walk on to find an egg</p>';
  if (walk.start && walk.lastFix) {
    const away = haversineKm(walk.start, walk.lastFix);
    $('wSafe').textContent = `Safe zone: ${safeKm()} km from your start. You are ${away.toFixed(2)} km away.`;
  } else if (walk.far) {
    $('wSafe').textContent = `Demo: you went past your ${safeKm()} km safe zone.`;
  } else {
    $('wSafe').textContent = walk.gpsState === 'off'
      ? 'Location is off, so grown-ups cannot check your safe zone.'
      : 'Finding your location for the safe zone...';
  }
}

function tooFar(demo) {
  if (walk.far) return;
  walk.far = true;
  state.alerts.push({ at: Date.now(), kind: 'far', demo: true });
  save();
  sfx('alert');
  showAlert(`You're outside your safe zone. Please head back. (Demo: no message is sent to a parent yet.)`, 'danger');
  try { navigator.vibrate?.([250, 120, 250]); } catch {}
}

function onPosition(pos) {
  if (!walk) return;
  const { latitude: lat, longitude: lon, accuracy } = pos.coords;
  walk.gpsState = 'on';
  if (accuracy > 35) return renderWalk();
  const fix = { lat, lon };
  if (!walk.start) walk.start = fix;
  if (walk.lastFix && !walk.paused) {
    const d = haversineKm(walk.lastFix, fix);
    if (d > 0.003 && d < 0.2) { walk.gpsKm += d; walk.gpsPoints++; creditKm(0); }
  } else walk.gpsPoints++;
  walk.lastFix = fix;
  if (haversineKm(walk.start, fix) > safeKm()) tooFar(false);
  renderWalk();
}

async function startWalk() {
  // Motion permission must be asked inside this click (iPhone rule), before anything else.
  const motion = counter.start();
  walk = {
    steps: 0, sensorTotal: 0, coins: 0, eggsFound: 0, nextEggCheck: EGG_CHECK_EVERY,
    activeMs: 0, lastTick: performance.now(), paused: false, far: false,
    gpsKm: 0, gpsPoints: 0, kmCredited: 0, start: null, lastFix: null, gpsState: 'waiting',
    demoTimer: 0, tickTimer: 0, watchId: null,
  };
  sfx('walkstart');
  $('walk').hidden = false;
  homeOnWalk(true);
  document.body.classList.add('walking');
  $('walkAlert').hidden = true;
  setStatus('Starting', '');
  renderWalk();
  if ('geolocation' in navigator) {
    walk.watchId = navigator.geolocation.watchPosition(onPosition, () => { if (walk) { walk.gpsState = 'off'; renderWalk(); } },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  } else walk.gpsState = 'off';
  walk.tickTimer = setInterval(() => {
    if (!walk) return;
    const now = performance.now();
    if (!walk.paused) walk.activeMs += now - walk.lastTick;
    walk.lastTick = now;
    renderWalk();
  }, 1000);

  const result = await motion;
  if (!walk) return;
  if (result === 'ok') {
    walk.mode = 'sensor';
    setStatus('Counting steps', 'ok');
    showAlert('Keep this screen open and unlocked. Steps and the safe zone pause if you leave.', 'info', 7000);
  } else if (!state.demo) {
    // Real player without step counting: no made-up steps, just say how to fix it.
    walk.mode = 'off';
    setStatus('Not counting', 'paused');
    showAlert(result === 'denied'
      ? 'Step counting is off, so your steps are not counting. Ask a grown-up to turn it on in Settings, then start again.'
      : 'This device cannot count steps. Try Stepsy on a phone.', 'info', 9000);
  } else {
    // Demo mode with no motion sensor (a computer, or permission was refused): run a gentle demo walk.
    walk.mode = 'demo';
    setStatus('Demo walk', 'demo');
    showAlert(result === 'denied'
      ? 'Step counting is off, so this is a demo walk. A grown-up can turn it on in Settings.'
      : 'This device cannot count steps, so this is a demo walk.', 'info', 4500);
    walk.demoTimer = setInterval(() => { if (walk && !walk.paused) creditSteps(2); }, 1000);
  }
}

function endWalk() {
  if (!walk) return;
  counter.stop();
  clearInterval(walk.demoTimer);
  clearInterval(walk.tickTimer);
  if (walk.watchId != null) navigator.geolocation.clearWatch(walk.watchId);
  const w = walk;
  walk = null;
  sfx('walkend');
  const km = w.steps * STRIDE_KM;
  state.walks.push({ at: Date.now(), steps: w.steps, km: +km.toFixed(2), coins: w.coins, eggs: w.eggsFound, mins: Math.floor(w.activeMs / 60000) });
  save();
  const secs = Math.floor(w.activeMs / 1000);
  const body = openSheet(`
    <div class="summary">
      <h2 id="sheetTitle">${w.steps ? 'Nice walk!' : 'No steps this time'}</h2>
      ${w.steps ? '' : '<p class="muted">Walk with the screen open and your steps will count.</p>'}
      <div class="sum-grid">
        <div><span class="num">${fmt(w.steps)}</span><span>steps</span></div>
        <div><span class="num">${km.toFixed(2)}</span><span>km</span></div>
        <div><span class="num">${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</span><span>time</span></div>
      </div>
      <ul class="sum-list">
        <li><span class="mini">${coinSVG}</span>${fmt(w.coins)} coins earned</li>
        <li><span class="mini">${eggArt()}</span>${w.eggsFound} ${w.eggsFound === 1 ? 'egg' : 'eggs'} found</li>
      </ul>
      <div class="sheet-actions"><button class="btn-main" type="button" data-act="close">Done</button></div>
    </div>`, {
    onClose: () => {
      homeOnWalk(false);
      $('walk').hidden = true;
      document.body.classList.remove('walking');
      renderAll(true);
    },
  });
  body.querySelector('[data-act="close"]').addEventListener('click', closeSheet);
}

$('walkBtn').addEventListener('click', startWalk);
$('endBtn').addEventListener('click', endWalk);
$('wDemoSteps').addEventListener('click', () => { if (walk) creditSteps(100); });
$('wDemoFar').addEventListener('click', () => { if (walk) tooFar(true); });

// Leaving the app pauses the walk (no counting while doomscrolling).
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.day !== todayKey()) { rollDay(); renderAll(false); }
  if (!walk) return;
  if (document.hidden) {
    walk.paused = true;
    setStatus('Paused', 'paused');
  } else {
    walk.paused = false;
    walk.lastTick = performance.now();
    if (walk.mode === 'off') setStatus('Not counting', 'paused');
    else setStatus(walk.mode === 'sensor' ? 'Counting steps' : 'Demo walk', walk.mode === 'sensor' ? 'ok' : 'demo');
    showAlert('Your walk paused while you left the app. Steps only count with this screen open.', 'info', 5000);
  }
});

// SOS: hold for 2 seconds.
const SOS_HOLD = 2000;
let sosStart = 0, sosRaf = 0;
function sosFrame() {
  const p = Math.min((performance.now() - sosStart) / SOS_HOLD, 1);
  $('sosBtn').style.setProperty('--p', p);
  if (p >= 1) { sosCancel(); sendSOS(); return; }
  sosRaf = requestAnimationFrame(sosFrame);
}
function sosCancel() { cancelAnimationFrame(sosRaf); sosRaf = 0; $('sosBtn').style.setProperty('--p', 0); }
$('sosBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); sosStart = performance.now(); sosFrame(); });
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => $('sosBtn').addEventListener(ev, () => { if (sosRaf) sosCancel(); }));
$('sosBtn').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sendSOS(); } });
$('sosBtn').addEventListener('contextmenu', (e) => e.preventDefault());
function sendSOS() {
  sfx('alert');
  try { navigator.vibrate?.(400); } catch {}
  const where = walk?.lastFix ? `${walk.lastFix.lat.toFixed(5)}, ${walk.lastFix.lon.toFixed(5)}` : 'location not available yet';
  state.alerts.push({ at: Date.now(), kind: 'sos', demo: true });
  save();
  const body = openSheet(`
    <div class="sos-sent">
      <h2 id="sheetTitle">SOS (demo)</h2>
      <p><strong>This is only a demo. No message was sent and nobody was called.</strong></p>
      <p>If you really need help, ask an adult nearby or call 999.</p>
      <p class="muted small">Idea for a real app: your parent would get an alert with where you are. Location: ${esc(where)}</p>
      <div class="sheet-actions"><button class="btn-main" type="button" data-act="close">I'm OK now</button></div>
    </div>`);
  body.querySelector('[data-act="close"]').addEventListener('click', closeSheet);
}

// ---------------- Demo mode (for presenting) vs your real progress ----------------
// Demo mode loads the made-up Wei Jie profile and shows the "Demo" buttons. Your real progress is kept aside
// and comes back when Demo mode is turned off.
function setDemo(on) {
  try {
    if (on) {
      if (!state.demo || !localStorage.getItem('stepsy-real')) localStorage.setItem('stepsy-real', JSON.stringify(state));
      localStorage.setItem('stepsy', JSON.stringify(DEFAULTS()));
    } else {
      const real = localStorage.getItem('stepsy-real');
      if (real) localStorage.setItem('stepsy', real); else localStorage.removeItem('stepsy');
      localStorage.removeItem('stepsy-real');
    }
  } catch {}
  location.reload();
}
document.body.classList.toggle('demo', !!state.demo);

// ---------------- Grown-ups only: a times-table question before Parent view / Demo mode ----------------
function gate(onPass) {
  const a = 6 + Math.floor(Math.random() * 4), b = 6 + Math.floor(Math.random() * 4);
  const body = openSheet(`
    <form class="gate">
      <h2 id="sheetTitle">For grown-ups</h2>
      <p>What is ${a} × ${b}?</p>
      <input id="gateIn" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" aria-label="Answer">
      <p class="intro-err" id="gateErr" role="alert"></p>
      <div class="sheet-actions">
        <button class="btn-soft" type="button" data-act="close">Cancel</button>
        <button class="btn-main" type="submit">OK</button>
      </div>
    </form>`);
  body.querySelector('[data-act="close"]').addEventListener('click', closeSheet);
  $('gateIn').focus();
  body.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (Number($('gateIn').value) === a * b) { closeSheet(); setTimeout(onPass, 240); }
    else { $('gateErr').textContent = 'Not quite. Ask a grown-up to help.'; sfx('nope'); }
  });
}

// ---------------- First time: a short picture walkthrough for kids ----------------
const INTRO = [
  { art: () => `<span class="intro-ico">${ICONS.feet}</span>`, title: 'Walk to play!', text: 'Every step you walk helps you grow and earns coins.' },
  { art: () => eggArt(RARITY.common.egg), title: 'Find eggs', text: 'Eggs pop up on your walks. Keep walking and they hatch!' },
  { art: () => `<img src="${petPortrait('otter', 240, { gold: isGold('otter') })}" alt="">`, title: 'Meet Kallie!', text: 'Kallie the otter is your first buddy. Hatch more Singapore animals.' },
  { art: () => `<span class="intro-ico coin">${coinSVG}</span>`, title: 'Get coins', text: 'Use coins in the Shop for hats and fun stuff. No real money.' },
  { art: () => `<span class="intro-ico">${ICONS.shield}</span>`, title: 'Stay safe', text: 'Ask a grown-up before you walk. Look up when you cross a road.' },
];
function showIntro() {
  const box = $('intro');
  let i = 0;
  const dots = () => `<ol class="intro-dots" aria-hidden="true">${[...INTRO, 0].map((_, k) => `<li class="${k === i ? 'on' : ''}"></li>`).join('')}</ol>`;
  function draw() {
    if (i < INTRO.length) {
      const s = INTRO[i];
      box.innerHTML = `
        <div class="intro-card sticker" role="dialog" aria-modal="true" aria-labelledby="introTitle" tabindex="-1">
          <button class="intro-skip" type="button" data-act="skip">Skip</button>
          <div class="intro-art">${s.art()}</div>
          <h2 id="introTitle">${s.title}</h2>
          <p>${s.text}</p>
          ${dots()}
          <div class="intro-btns">
            ${i ? '<button class="btn-soft" type="button" data-act="back">Back</button>' : ''}
            <button class="btn-main" type="button" data-act="next">Next</button>
          </div>
        </div>`;
    } else {
      box.innerHTML = `
        <form class="intro-card sticker" role="dialog" aria-modal="true" aria-labelledby="introTitle" tabindex="-1">
          <div class="intro-art"><img id="introAv" alt=""></div>
          <h2 id="introTitle">What's your nickname?</h2>
          <p>Pick a fun game name. Friends will see it, so don't use your real name.</p>
          <input id="introName" type="text" maxlength="12" autocomplete="off" autocapitalize="words" enterkeyhint="go" placeholder="Like: Ace" aria-labelledby="introTitle">
          <p class="intro-err" id="introErr" role="alert"></p>
          ${dots()}
          <div class="intro-btns">
            <button class="btn-soft" type="button" data-act="back">Back</button>
            <button class="btn-main" type="submit">Let's go!</button>
          </div>
        </form>`;
      avatarPicture(state.outfit, { size: 240 }).then((src) => { const im = $('introAv'); if (im) im.src = src; });
      box.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('introName').value.replace(/\s+/g, ' ').trim();
        if (name.length < 2) { $('introErr').textContent = 'Type a nickname first (2 letters or more).'; return; }
        state.nickname = name;
        state.onboarded = true;
        save();
        perms(name);
      });
    }
    box.querySelector('[data-act="next"]')?.addEventListener('click', () => { i++; draw(); });
    box.querySelector('[data-act="back"]')?.addEventListener('click', () => { i--; draw(); });
    box.querySelector('[data-act="skip"]')?.addEventListener('click', () => { i = INTRO.length; draw(); });
    // First slide: focus the card itself; after a tap, focus the next thing to press (or the name box).
    (moved ? box.querySelector('#introName, [data-act="next"]') : box.querySelector('.intro-card'))?.focus({ preventScroll: true });
    moved = true;
  }
  // Last slide: let Stepsy count steps, check the safe zone and send alerts. All optional.
  function perms(name) {
    const row = (id, ico, title, text) => `
      <li class="perm" data-perm="${id}">
        <span class="perm-ico">${ICONS[ico]}</span>
        <span class="perm-txt"><strong>${title}</strong><span>${text}</span></span>
        <button class="btn-soft sm" type="button" data-ask="${id}">Allow</button>
      </li>`;
    box.innerHTML = `
      <div class="intro-card sticker perm-card" role="dialog" aria-modal="true" aria-labelledby="introTitle" tabindex="-1">
        <h2 id="introTitle">Let Stepsy help you</h2>
        <p>Ask a grown-up, then tap Allow. The phone will ask too.</p>
        <ul class="perm-list">
          ${row('motion', 'feet', 'Count my steps', 'So your walks count.')}
          ${row('location', 'shield', 'Safe zone', 'Only on walks, so grown-ups know you are safe.')}
          ${row('alerts', 'bell', 'Alerts', 'When your egg is ready or a friend cheers.')}
        </ul>
        <p class="muted small">You can change these later in the phone's Settings.</p>
        <div class="intro-btns"><button class="btn-main" type="button" data-act="done">Let's go!</button></div>
      </div>`;
    const ask = { motion: askMotion, location: askLocation, alerts: askAlerts };
    box.querySelectorAll('[data-ask]').forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true; b.textContent = 'Asking...';
      const r = await ask[b.dataset.ask]();
      b.textContent = r === 'granted' ? 'On' : r === 'none' ? 'Not here' : 'Off';
      b.closest('.perm').classList.add(r === 'granted' ? 'on' : 'off');
      sfx(r === 'granted' ? 'claim' : 'tap');
    }));
    box.querySelector('[data-act="done"]').addEventListener('click', () => {
      box.hidden = true; box.innerHTML = '';
      trapTo();
      renderAll(true);
      renderTop();
      sfx('cheer');
      toast(`Hi ${name}! Tap Start walk to begin.`);
      showTip('home');
    });
    box.querySelector('.intro-card').focus({ preventScroll: true });
  }
  let moved = false;
  box.hidden = false;
  trapTo($('intro'), $('toast'));
  draw();
}

// ---------------- First visit to each screen: one short tip ----------------
const TIPS = {
  home: 'Tap Start walk and go! Keep the app open to count steps. Tap Me at the bottom to see your badges.',
  pets: 'Your eggs and pets live here. Tap a pet to see it up close.',
  shop: 'Tap anything to try it on. Looks are free. Hats, glasses and fun stuff cost coins.',
  quests: 'Fill up a bar, then tap Claim to get coins.',
  ranks: 'See who walked the most this week in your class.',
  me: 'This is your profile. Tap a badge to see how to get it. Tap a friend to see theirs.',
};
function showTip(name) {
  if (!state.onboarded || state.tips[name] || !TIPS[name]) return;
  const screen = $(`screen-${name}`);
  if (!screen || screen.querySelector('.tip')) return;
  const tip = document.createElement('div');
  tip.className = 'tip sticker';
  tip.setAttribute('role', 'note');
  tip.innerHTML = `<span class="tip-ico">${ICONS.bell}</span><p>${TIPS[name]}</p><button class="btn-main sm" type="button">Got it</button>`;
  tip.querySelector('button').addEventListener('click', () => {
    state.tips = { ...state.tips, [name]: 1 }; save(); tip.remove();
  });
  const head = screen.querySelector('.sub-head');
  if (head) head.after(tip); else screen.prepend(tip);
}

// ---------------- Start ----------------
function renderAll(animate) {
  rollDay();
  renderHome(animate);
  if (!$('screen-pets').hidden) renderPets();
  if (!$('screen-quests').hidden) renderQuests(); else checkBadges();
  updateDots();
}
const addSteps = (n) => { addProgress(n, n * STRIDE_KM); renderAll(true); };
const ctx = { state, save, toast, addSteps, setDemo, showTip, gate, openSheet, closeSheet, $, fmt, esc, renderTop, applyOutfit, showScreen, coinBurst, updateDots };
initShop(ctx);
initQuests(ctx);
initSocial(ctx);
let homeStage = null;
renderAll(true);
if (!state.onboarded) showIntro(); else showTip('home');
setInterval(() => { if (!document.hidden && !walk) wobble($('homeEgg')); }, 6000);
// App left open past midnight: start the new day without waiting for a step or a tab switch.
setInterval(() => { if (!walk && state.day !== todayKey()) { rollDay(); renderAll(false); } }, 30000);

homeStage = createStage($('stage'), { outfit: state.outfit, pet: state.buddy, gold: isGold(state.buddy), mode: 'home', onReady: setBadge });

// ---------------- Walk scene: the Home 3D picture moves into the walk screen and walks ----------------
let stageSpot = null;
function homeOnWalk(on) {
  const el = $('stage');
  if (on) {
    stageSpot = { parent: el.parentElement, next: el.nextSibling };
    $('walkScene').appendChild(el);
    homeStage?.play('walk');
  } else if (stageSpot) {
    stageSpot.parent.insertBefore(el, stageSpot.next);
    stageSpot = null;
    homeStage?.play(state.outfit.hold ? 'holding-right' : 'idle');
  }
  homeStage?.kick();
}

// ---------------- Alerts (pretend notifications for the prototype) ----------------
initNotify();
function renderAlertsBtn() {
  const s = alertsState(), b = $('alertsBtn');
  b.textContent = s === 'granted' ? 'Test alert' : s === 'denied' ? 'Off' : s === 'none' ? 'Not here' : 'Turn on';
  b.disabled = s === 'denied' || s === 'none';
  $('alertsNote').textContent = s === 'granted' ? 'On. Tap Test alert to see one.'
    : s === 'denied' ? 'Turned off. A grown-up can turn them on in the phone\'s Settings.'
    : s === 'none' ? 'On iPhone: Share, then Add to Home Screen, then open Stepsy from there.'
    : 'A ping when your egg is ready or a friend cheers.';
}
$('alertsBtn').addEventListener('click', async () => {
  if (alertsState() === 'granted') {
    const f = state.friends.length ? ['Aisyah', 'Jun Hao', 'Priya', 'Kai', 'Mei Ling'][state.friends.length % 5] : 'Kallie';
    notify(state.friends.length ? `${f} cheered you!` : 'Kallie misses you!', state.friends.length ? '"Nice walk!" Open Stepsy to cheer back.' : 'Go for a walk together?', { toast, tag: 'test' });
  } else await askAlerts();
  renderAlertsBtn();
});
// A friend's cheer and an evening streak reminder, at most once a day each.
function pretendAlerts() {
  if (document.hidden || walk || !state.onboarded) return;
  const today = state.day;
  if (state.streak > 0 && !state.walkDays.includes(today) && new Date().getHours() >= 17 && state.remindDay !== today) {
    state.remindDay = today; save();
    notify('Keep your streak!', `Walk 1,000 steps today to make it ${state.streak + 1} days in a row.`, { toast, tag: 'streak' });
  } else if (state.friends.length && state.cheerDay !== today) {
    state.cheerDay = today; save();
    const f = ['Aisyah', 'Priya', 'Jun Hao'][new Date().getDate() % 3];
    notify(`${f} cheered you!`, '"Let\'s walk together!"', { toast, tag: 'cheer' });
  }
}
setTimeout(pretendAlerts, 45000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(pretendAlerts, 4000); });
