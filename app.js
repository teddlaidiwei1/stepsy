import { createStage, petPortrait } from './scene.js';
import { fruitSVG, emptySlot, eggArt, coinSVG, ICONS } from './art.js';
import { PETS, PET_ORDER, RARITY, rollRarity, rollPet } from './pets.js';
import { createStepCounter } from './stepcounter.js';
import { DEFAULT_OUTFIT } from './avatar3d.js';
import { initShop, showShop } from './shop.js';
import { initQuests, renderQuests, claimable, checkBadges } from './quests.js';
import { initSocial, renderRanks, renderMe, renderParent } from './social.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString('en-SG');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const todayKey = () => new Date().toLocaleDateString('en-CA');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------- Saved progress (demo starting values; kept on this phone only) ----------------
const VERSION = 3;
const DEFAULTS = () => ({
  version: VERSION, nickname: 'Wei Jie', level: 6, levelXp: 0.42, coins: 1240, streak: 7,
  day: todayKey(), steps: 3420, goal: 6000,
  eggs: [{ id: 'e1', rarity: 'rare', km: 1.2 }],
  pets: [{ id: 'p1', type: 'otter' }],
  buddy: 'otter', walks: [],
  // step 3
  outfit: { ...DEFAULT_OUTFIT }, owned: [], claimed: {}, badges: ['first', 'egg', 'week'],
  hatched: [], friends: ['f1', 'f2', 'f3', 'f4'], alerts: [], safeKm: 1, demoDay: null,
});
function load() {
  try {
    const s = JSON.parse(localStorage.getItem('stepsy') || 'null');
    if (!s || s.version < 2) return DEFAULTS();
    s.version = VERSION;
    if (s.day !== todayKey()) { s.day = todayKey(); s.steps = 0; }
    return { ...DEFAULTS(), ...s };
  } catch { return DEFAULTS(); }
}
const state = load();
// New day while the app stays open (e.g. installed on the home screen overnight).
function rollDay() {
  if (state.day === todayKey()) return;
  state.day = todayKey(); state.steps = 0;
  if (walk) walk.fruitsAtStart = 0;
  save();
}
function save() { try { localStorage.setItem('stepsy', JSON.stringify(state)); } catch {} }
const uid = () => Math.random().toString(36).slice(2, 9);
const eggGoal = (egg) => RARITY[egg.rarity].km;
const eggReady = (egg) => egg.km >= eggGoal(egg);

// ---------------- Static art ----------------
document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = ICONS[el.dataset.icon]; });
document.querySelectorAll('[data-art="coin"]').forEach((el) => { el.innerHTML = coinSVG; });

// ---------------- Toast ----------------
let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ---------------- Progress shared by walks and the demo button ----------------
const PER_FRUIT = 1000;
const FRUIT_COINS = 20;
// Adds steps and km. Returns coins earned from new fruits.
function addProgress(steps, km) {
  rollDay();
  const before = Math.floor(state.steps / PER_FRUIT);
  state.steps += steps;
  const after = Math.floor(state.steps / PER_FRUIT);
  const maxFruits = state.goal / PER_FRUIT;
  const newFruits = Math.max(0, Math.min(after, maxFruits) - Math.min(before, maxFruits));
  const coins = newFruits * FRUIT_COINS;
  state.coins += coins;
  for (const egg of state.eggs) egg.km = Math.min(egg.km + km, eggGoal(egg));
  save();
  return coins;
}

// ---------------- Top bar ----------------
function renderTop() {
  $('nickname').textContent = state.nickname;
  $('levelText').textContent = `Lv ${state.level}`;
  $('levelBar').style.width = `${Math.round(state.levelXp * 100)}%`;
  $('streak').textContent = `${state.streak}-day streak`;
  $('coins').textContent = fmt(state.coins);
}

// ---------------- Home: fruit stick ----------------
let shownFruits = 0, shownSteps = 0;
function renderSkewer(animate) {
  const total = state.goal / PER_FRUIT;
  const picked = Math.min(Math.floor(state.steps / PER_FRUIT), total);
  const partial = picked < total ? (state.steps % PER_FRUIT) / PER_FRUIT : 0;
  const sk = $('skewer');
  sk.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    if (i < picked) {
      slot.classList.add('filled');
      slot.innerHTML = fruitSVG(i);
      if (animate && i >= shownFruits && !reduceMotion) {
        slot.firstElementChild.classList.add('pop');
        slot.firstElementChild.style.animationDelay = `${(i - shownFruits) * 110}ms`;
      }
    } else if (i === picked && partial > 0) {
      slot.classList.add('partial');
      slot.style.setProperty('--fill', `${Math.round(partial * 100)}%`);
      slot.innerHTML = `<div class="ghost">${fruitSVG(i)}</div><span class="meter"><i></i></span>`;
    } else {
      slot.innerHTML = emptySlot;
    }
    sk.appendChild(slot);
  }
  shownFruits = picked;
  sk.setAttribute('aria-label', `${picked} of ${total} fruits picked`);
  $('goalNum').textContent = fmt(state.goal);
  const left = PER_FRUIT - (state.steps % PER_FRUIT);
  $('skewerCaption').textContent = picked >= total
    ? "Stick complete! You hit today's goal."
    : `${picked} ${picked === 1 ? 'fruit' : 'fruits'} picked. ${fmt(left)} steps to the next one.`;
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
  $('eggLeft').textContent = eggReady(egg) ? 'Ready to hatch! Tap to open' : `Walk ${left.toFixed(1)} km more to hatch it`;
  $('eggBar').style.width = `${(egg.km / eggGoal(egg)) * 100}%`;
  card.dataset.egg = egg.id;
  card.classList.toggle('ready', eggReady(egg));
}
function wobble(el) {
  if (!el || reduceMotion) return;
  el.classList.remove('wobble'); void el.offsetWidth; el.classList.add('wobble');
}

function renderBuddy() {
  const p = PETS[state.buddy];
  $('buddyName').textContent = p.name;
  $('buddySpecies').textContent = p.species.split(' ').slice(-1)[0].replace(/^\w/, (c) => c.toUpperCase());
}

function renderHome(animate) {
  renderTop();
  renderSteps();
  renderSkewer(animate);
  renderHomeEgg();
  renderBuddy();
}

// ---------------- Sheets ----------------
let sheetOnClose = null;
function openSheet(html, { onClose, lock = false } = {}) {
  $('sheetBody').innerHTML = html;
  $('scrim').hidden = false;
  $('sheet').hidden = false;
  $('scrim').dataset.lock = lock ? '1' : '';
  sheetOnClose = onClose || null;
  requestAnimationFrame(() => { $('scrim').classList.add('show'); $('sheet').classList.add('show'); });
  return $('sheetBody');
}
function closeSheet() {
  $('scrim').classList.remove('show');
  $('sheet').classList.remove('show');
  setTimeout(() => { $('scrim').hidden = true; $('sheet').hidden = true; $('sheetBody').innerHTML = ''; }, 220);
  const cb = sheetOnClose; sheetOnClose = null; cb?.();
}
$('scrim').addEventListener('click', () => { if (!$('scrim').dataset.lock) closeSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('sheet').hidden && !$('scrim').dataset.lock) closeSheet(); });

// ---------------- Hatching ----------------
function hatch(eggId) {
  const egg = state.eggs.find((e) => e.id === eggId);
  if (!egg || !eggReady(egg)) return;
  const type = rollPet(egg.rarity);
  const pet = PETS[type];
  const isNew = !state.pets.some((p) => p.type === type);
  state.eggs = state.eggs.filter((e) => e.id !== eggId);
  state.pets.push({ id: uid(), type });
  state.hatched.push(Date.now());
  state.coins += 30;
  save();

  const body = openSheet(`
    <div class="hatch">
      <div class="hatch-egg shaking">${eggArt(RARITY[egg.rarity].egg)}</div>
      <p class="hatch-wait">Something is moving...</p>
    </div>`, { lock: true });
  const reveal = () => {
    body.innerHTML = `
      <div class="hatch revealed">
        <div class="burst" aria-hidden="true"></div>
        <img class="hatch-pet" src="${petPortrait(type, 320)}" alt="${esc(pet.name)} the ${esc(pet.species)}">
        <h2 id="sheetTitle">It's ${esc(pet.name)}!</h2>
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
    renderAll();
  };
  setTimeout(reveal, reduceMotion ? 300 : 1700);
}

function setBuddy(type) {
  state.buddy = type;
  save();
  homeStage?.setPet(type);
  renderBuddy();
  renderPets();
  toast(`${PETS[type].name} is your buddy now`);
}

// ---------------- Pets tab ----------------
let petStage = null;
let selected = state.buddy;
function renderPets() {
  const owned = new Map();
  state.pets.forEach((p) => owned.set(p.type, (owned.get(p.type) || 0) + 1));
  if (!owned.has(selected)) selected = state.buddy;
  const p = PETS[selected];
  $('petName').textContent = p.name;
  $('petSpecies').textContent = p.species;
  $('petFact').textContent = p.fact;
  const rar = $('petRarity');
  rar.textContent = RARITY[p.rarity].label;
  rar.className = `rarity r-${p.rarity}`;
  const bb = $('buddyBtn');
  bb.disabled = selected === state.buddy;
  bb.textContent = selected === state.buddy ? 'Your buddy' : 'Make buddy';

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
        : `<span class="km num">${egg.km.toFixed(1)} / ${eggGoal(egg)} km</span><span class="bar mint" aria-hidden="true"><span style="width:${(egg.km / eggGoal(egg)) * 100}%"></span></span>`}`;
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
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pet-card sticker${has ? '' : ' locked'}${type === selected && has ? ' sel' : ''}`;
    b.innerHTML = `
      <img src="${petPortrait(type, 192)}" alt="">
      <span class="pc-name">${has ? esc(pet.name) : '???'}</span>
      <span class="pc-sub">${has ? (owned.get(type) > 1 ? `x${owned.get(type)}` : RARITY[pet.rarity].label) : RARITY[pet.rarity].label}</span>
      ${type === state.buddy ? '<span class="pc-buddy">Buddy</span>' : ''}`;
    b.setAttribute('aria-label', has ? `${pet.name}, ${pet.species}` : `Not found yet, ${RARITY[pet.rarity].label}`);
    b.addEventListener('click', () => {
      if (!has) { toast(`Not found yet. ${RARITY[pet.rarity].label} eggs can hatch one.`); return; }
      selected = type;
      petStage?.setPet(type);
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
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.tab === name;
    t.classList.toggle('on', on);
    if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
  if (name === 'pets') {
    renderPets();
    if (!petStage) petStage = createStage($('petStage'), { pet: selected, mode: 'viewer' });
    else { petStage.setPet(selected); petStage.kick(); }
  }
  if (name === 'home') homeStage?.kick();
  if (name === 'shop') showShop();
  if (name === 'quests') renderQuests();
  if (name === 'ranks') renderRanks();
  if (name === 'me') renderMe();
  if (name === 'parent') renderParent();
  $(`screen-${name}`).scrollTop = 0;
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
function applyOutfit(o) { homeStage?.setOutfit(o); }

// ---------------- Home interactions ----------------
$('demoSteps').addEventListener('click', () => {
  const coins = addProgress(500, 0.35);
  if (coins) toast(`New fruit! +${coins} coins`);
  renderAll(true);
  wobble($('homeEgg'));
});
$('eggCard').addEventListener('click', () => {
  const egg = state.eggs.find((e) => e.id === $('eggCard').dataset.egg);
  if (egg && eggReady(egg)) hatch(egg.id);
  else { wobble($('homeEgg')); showScreen('pets'); }
});
$('profileBtn').addEventListener('click', () => showScreen('me'));
let pressTimer;
$('stepsNum').addEventListener('pointerdown', () => {
  pressTimer = setTimeout(() => {
    try { localStorage.removeItem('stepsy'); } catch {}
    Object.assign(state, DEFAULTS());
    shownFruits = 0; shownSteps = 0; selected = state.buddy;
    homeStage?.setPet(state.buddy);
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
  if (coins) { walk.coins += coins; toast(`New fruit! +${coins} coins`); }
}

function findEgg() {
  const rarity = rollRarity();
  state.eggs.push({ id: uid(), rarity, km: 0 });
  walk.eggsFound++;
  save();
  const r = RARITY[rarity];
  const body = openSheet(`
    <div class="found">
      <div class="hatch-egg pop">${eggArt(r.egg)}</div>
      <h2 id="sheetTitle">You found an egg!</h2>
      <p class="rarity r-${rarity}">${r.label}</p>
      <p>Walk ${r.km} km to hatch it.</p>
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
    return `<div class="w-egg"><span class="egg">${eggArt(r.egg)}</span><span class="bar mint" aria-hidden="true"><span style="width:${(egg.km / eggGoal(egg)) * 100}%"></span></span><span class="num">${eggReady(egg) ? 'Ready!' : `${egg.km.toFixed(1)}/${eggGoal(egg)} km`}</span></div>`;
  }).join('') || '<p class="muted">Walk on to find an egg</p>';
  if (walk.start && walk.lastFix) {
    const away = haversineKm(walk.start, walk.lastFix);
    $('wSafe').textContent = `Safe zone: ${safeKm()} km from your start. You are ${away.toFixed(2)} km away.`;
  } else if (walk.far) {
    $('wSafe').textContent = `Demo: you went past your ${safeKm()} km safe zone.`;
  } else {
    $('wSafe').textContent = walk.gpsState === 'off'
      ? 'Location is off, so the safe zone check is paused.'
      : 'Finding your location for the safe zone...';
  }
}

function tooFar(demo) {
  if (walk.far) return;
  walk.far = true;
  state.alerts.push({ at: Date.now(), kind: 'far', demo: true });
  save();
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
    fruitsAtStart: Math.floor(state.steps / PER_FRUIT), demoTimer: 0, tickTimer: 0, watchId: null,
  };
  $('walk').hidden = false;
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
  } else {
    // No motion sensor here (a computer, or permission was refused): run a gentle demo walk.
    walk.mode = 'demo';
    setStatus('Demo walk', 'demo');
    showAlert(result === 'denied'
      ? 'Motion access is off, so this is a demo walk. You can turn it on in your browser settings.'
      : 'No motion sensor here, so this is a demo walk.', 'info', 4500);
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
  const fruits = Math.min(Math.floor(state.steps / PER_FRUIT), state.goal / PER_FRUIT) - Math.min(w.fruitsAtStart, state.goal / PER_FRUIT);
  const km = w.steps * STRIDE_KM;
  state.walks.push({ at: Date.now(), steps: w.steps, km: +km.toFixed(2), coins: w.coins, eggs: w.eggsFound, mins: Math.floor(w.activeMs / 60000) });
  save();
  const secs = Math.floor(w.activeMs / 1000);
  const body = openSheet(`
    <div class="summary">
      <h2 id="sheetTitle">Nice walk!</h2>
      <div class="sum-grid">
        <div><span class="num">${fmt(w.steps)}</span><span>steps</span></div>
        <div><span class="num">${km.toFixed(2)}</span><span>km</span></div>
        <div><span class="num">${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</span><span>time</span></div>
      </div>
      <ul class="sum-list">
        <li><span class="mini">${fruitSVG(0)}</span>${fruits} new ${fruits === 1 ? 'fruit' : 'fruits'} on today's stick</li>
        <li><span class="mini">${coinSVG}</span>${fmt(w.coins)} coins earned</li>
        <li><span class="mini">${eggArt()}</span>${w.eggsFound} ${w.eggsFound === 1 ? 'egg' : 'eggs'} found</li>
      </ul>
      <div class="sheet-actions"><button class="btn-main" type="button" data-act="close">Done</button></div>
    </div>`, {
    onClose: () => {
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
    setStatus(walk.mode === 'sensor' ? 'Counting steps' : 'Demo walk', walk.mode === 'sensor' ? 'ok' : 'demo');
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
  try { navigator.vibrate?.(400); } catch {}
  const where = walk?.lastFix ? `${walk.lastFix.lat.toFixed(5)}, ${walk.lastFix.lon.toFixed(5)}` : 'location not available yet';
  state.alerts.push({ at: Date.now(), kind: 'sos', demo: true });
  save();
  const body = openSheet(`
    <div class="sos-sent">
      <h2 id="sheetTitle">SOS (demo)</h2>
      <p>In the real app, your parent gets an alert with where you are now.</p>
      <p class="muted">Location: ${esc(where)}</p>
      <p class="muted small">Demo only: no message was sent. If you really need help, ask an adult nearby or call 999.</p>
      <div class="sheet-actions"><button class="btn-main" type="button" data-act="close">I'm OK now</button></div>
    </div>`);
  body.querySelector('[data-act="close"]').addEventListener('click', closeSheet);
}

// ---------------- Start ----------------
function renderAll(animate) {
  renderHome(animate);
  if (!$('screen-pets').hidden) renderPets();
  if (!$('screen-quests').hidden) renderQuests(); else checkBadges();
  updateDots();
}
const addSteps = (n) => { addProgress(n, n * STRIDE_KM); renderAll(true); };
const ctx = { state, save, toast, addSteps, openSheet, closeSheet, $, fmt, esc, renderTop, applyOutfit, showScreen, coinBurst, updateDots };
initShop(ctx);
initQuests(ctx);
initSocial(ctx);
let homeStage = null;
renderAll(true);
setInterval(() => { if (!document.hidden && !walk) wobble($('homeEgg')); }, 6000);

homeStage = createStage($('stage'), { outfit: state.outfit, pet: state.buddy, mode: 'home', onReady: setBadge });
