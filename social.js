// Ranks, your profile with friends (added in person by QR, cheers only) and the parent view.
import { play as sfx, soundOn, setSound } from './sfx.js';
import { avatarPicture } from './avatar3d.js';
import { petPortrait } from './scene.js';
import { PETS } from './pets.js';
import { BADGES, FRIENDS, NEW_FRIEND, CHEERS, CHEERS_IN, ME, classBoard, schoolBoard, sgBoard, HOME_SPOT, DEMO_PATH, DANGER_SPOTS } from './data.js';
import { earnedBadges, badgeArt } from './quests.js';

let ctx;
let board = 'class';
const DEMO_WEEK_STEPS = 21450; // your made-up steps from earlier this week

function lazy(src, css) {
  if (css && !document.querySelector(`link[href="${css}"]`)) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = css;
    if (SRI[css]) { l.integrity = SRI[css]; l.crossOrigin = 'anonymous'; }
    document.head.appendChild(l);
  }
  lazy.cache ||= new Map();
  if (!lazy.cache.has(src)) lazy.cache.set(src, new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej;
    if (SRI[src]) { s.integrity = SRI[src]; s.crossOrigin = 'anonymous'; }
    document.head.appendChild(s);
  }));
  return lazy.cache.get(src);
}
const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
const QR_JS = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
// Integrity hashes (from cdnjs): the browser refuses the file if the CDN ever serves something different.
const SRI = {
  [LEAFLET_JS]: 'sha512-puJW3E/qXDqYp9IfhAI54BJEaWIfloJ7JWs7OeD5i6ruC9JZL1gERT1wjtwXFlh7CjE7ZJ+/vcRZRkIYIb6p4g==',
  [LEAFLET_CSS]: 'sha512-h9FcoyWjHcOcmEVkxOfTLnmZFWIH0iZhZT1H2TbOq55xssQGEJHEaIm+PgoUaZbRvQTNTluNOEfb1ZRy6D3BOw==',
  [QR_JS]: 'sha512-ZDSPMa/JM1D+7kdg2x3BsruQ6T/JpJo3jWDWkCZsP+5yVyp1KfESqLI+7RqB5k24F7p2cV7i2YHh/890y6P6Sw==',
};

export function initSocial(c) {
  ctx = c;
  const { $ } = ctx;
  $('rankTabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-b]');
    if (!b) return;
    board = b.dataset.b;
    renderRanks();
  });
  $('addFriend').addEventListener('click', openAddFriend);
  $('openParent').addEventListener('click', () => ctx.gate(() => ctx.showScreen('parent')));
  $('demoBtn').addEventListener('click', () => ctx.gate(() => ctx.setDemo(!ctx.state.demo)));
  const snd = $('soundBtn');
  const showSnd = () => { snd.textContent = soundOn() ? 'Sound: on' : 'Sound: off'; snd.setAttribute('aria-pressed', soundOn()); };
  snd.addEventListener('click', () => { setSound(!soundOn()); showSnd(); });
  showSnd();
  $('meBack').addEventListener('click', () => ctx.showScreen('home'));
  $('parentBack').addEventListener('click', () => ctx.showScreen('me'));
  $('safeSeg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-km]');
    if (!b) return;
    ctx.state.safeKm = +b.dataset.km;
    ctx.save();
    renderParent();
    ctx.toast(`Safe distance set to ${b.dataset.km} km`);
  });
}

// ---------------- Ranks ----------------
// Steps this week (Monday to today): made-up history in Demo mode, the real day log otherwise.
const mySteps = () => {
  const { state } = ctx;
  if (state.demo) return DEMO_WEEK_STEPS + state.steps;
  const d = new Date(); const back = (d.getDay() + 6) % 7; let sum = state.steps;
  for (let i = 1; i <= back; i++) { const x = new Date(); x.setDate(x.getDate() - i); sum += state.dayLog?.[x.toLocaleDateString('en-CA')] || 0; }
  return sum;
};
const avg = (rows) => Math.round(rows.reduce((s, r) => s + r.steps, 0) / rows.length);
const medal = (i) => (i < 3 ? ` m${i + 1}` : '');

export function renderRanks() {
  const { $, fmt, esc } = ctx;
  $('rankTabs').querySelectorAll('[data-b]').forEach((b) => {
    const on = b.dataset.b === board;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on);
  });
  const cls = classBoard(mySteps());
  const school = schoolBoard(avg(cls));
  const sg = sgBoard(avg(school));
  const rows = board === 'class' ? cls : board === 'school' ? school : sg;
  const myIdx = rows.findIndex((r) => r.you);
  const n = myIdx + 1, place = n === 1 ? 'the top' : `the number ${n}`;
  const line = board === 'class'
    ? `<strong>You are</strong> ${n === 1 ? 'top' : `number ${n}`} in class ${esc(ME.cls)} this week`
    : board === 'school'
      ? `<strong>${esc(ME.cls)}</strong> is ${place} class in ${esc(ME.school)} this week`
      : `<strong>${esc(ME.school)}</strong> is ${place} school in Singapore this week`;
  $('rankHero').innerHTML = `<span class="rank-big num">#${n}</span><span class="rank-what">${line}</span>`;
  $('rankUnit').textContent = board === 'class' ? 'Steps this week' : 'Steps per kid this week';
  const list = $('rankList');
  list.innerHTML = rows.map((r, i) => `
    <li class="rank-row${r.you ? ' you' : ''}${medal(i)}">
      <span class="rk num">${i + 1}</span>
      <span class="rav">${board === 'class' ? '<img alt="">' : `<span class="mono">${esc(r.name.replace(' Primary', '').slice(0, 2))}</span>`}</span>
      <span class="rn">${r.you && board === 'class' ? `${esc(ctx.state.nickname)} (you)` : esc(r.name)}${r.you && board !== 'class' ? ' <em>yours</em>' : ''}</span>
      <span class="rs num">${fmt(r.steps)}</span>
    </li>`).join('');
  if (board === 'class') {
    list.querySelectorAll('.rank-row').forEach((li, i) => {
      const r = rows[i];
      const img = li.querySelector('img');
      if (r.you) { const b = document.querySelector('#badge img'); if (b) img.src = b.src; else avatarPicture(ctx.state.outfit, { size: 96, head: true }).then((s) => { img.src = s; }); }
      else avatarPicture({ look: r.look }, { size: 96, head: true }).then((s) => { img.src = s; });
    });
  }
}

// ---------------- Me: profile, badges, cheers, friends ----------------
export function renderMe() {
  const { $, esc, fmt, state } = ctx;
  $('meName').textContent = state.nickname;
  $('meSub').textContent = state.demo ? `${ME.cls} · ${ME.school} (demo)` : 'Keep walking to level up!';
  $('demoBtn').textContent = state.demo ? 'Turn off' : 'Turn on';
  $('demoBtn').setAttribute('aria-pressed', String(!!state.demo));
  $('demoNote').textContent = state.demo ? 'Showing made-up demo data. Turn off to go back to your own progress.' : 'For showing the app. Your own progress is kept safe.';
  avatarPicture(state.outfit, { size: 240 }).then((s) => { $('meAvatar').src = s; });
  $('meStats').innerHTML = `
    <div><span class="num">${fmt(state.steps)}</span><span>steps today</span></div>
    <div><span class="num">${new Set(state.pets.map((p) => p.type)).size}</span><span>${new Set(state.pets.map((p) => p.type)).size === 1 ? 'pet' : 'pets'}</span></div>
    <div><span class="num">${state.level}</span><span>level</span></div>`;
  const myBadges = earnedBadges();
  $('meBadges').innerHTML = myBadges.length ? myBadges.map((b) => `<li>${badgeArt(b)}<span>${esc(b.name)}</span></li>`).join('')
    : '<li class="empty">No badges yet. Finish your first walk to get one!</li>';
  $('cheersIn').innerHTML = !state.demo && !state.friends.length
    ? '<li class="empty">No cheers yet. Add friends and they can cheer you on.</li>'
    : CHEERS_IN.map((c) => `<li><strong>${esc(c.from)}</strong> sent "${esc(c.text)}" <span class="muted small">${esc(c.ago)}</span></li>`).join('');

  const friends = state.friends.map((id) => [...FRIENDS, NEW_FRIEND].find((f) => f.id === id)).filter(Boolean);
  $('friendCount').textContent = `${friends.length}`;
  const grid = $('friendGrid');
  grid.innerHTML = friends.length ? '' : '<p class="empty">No friends yet. Tap Add friend when you are with a friend.</p>';
  friends.forEach((f) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'friend-card sticker';
    b.innerHTML = `
      <span class="fav"><img alt=""></span>
      <span class="fn">${esc(f.name)}</span>
      <span class="fs muted small">${esc(f.cls)} · <span class="num">${fmt(f.today)}</span> steps</span>
      <img class="fpet" src="${petPortrait(f.buddy, 96)}" alt="">`;
    b.setAttribute('aria-label', `${f.name}, ${fmt(f.today)} steps today`);
    avatarPicture(f.outfit, { size: 128, head: true }).then((s) => { b.querySelector('.fav img').src = s; });
    b.addEventListener('click', () => openFriend(f));
    grid.appendChild(b);
  });
}

function openFriend(f) {
  const { esc, fmt, openSheet, closeSheet, toast } = ctx;
  const badges = earnedBadgesFor(f);
  const body = openSheet(`
    <div class="friend-sheet">
      <div class="fs-top">
        <img class="fs-av" alt="${esc(f.name)}'s avatar">
        <img class="fs-pet" src="${petPortrait(f.buddy, 160)}" alt="${esc(PETS[f.buddy].name)} the ${esc(PETS[f.buddy].species)}">
      </div>
      <h2 id="sheetTitle">${esc(f.name)}</h2>
      <p class="muted">Class ${esc(f.cls)} · <span class="num">${fmt(f.today)}</span> steps today</p>
      <p class="fs-label">Pets</p>
      <div class="fs-pets">${f.pets.map((p) => `<img src="${petPortrait(p, 96)}" alt="${esc(PETS[p].name)}">`).join('')}</div>
      <p class="fs-label">Badges</p>
      <ul class="badge-row">${badges.map((b) => `<li>${badgeArt(b)}<span>${esc(b.name)}</span></li>`).join('')}</ul>
      <p class="fs-label">Send a cheer</p>
      <div class="cheers">${CHEERS.map((c) => `<button class="chip" type="button">${esc(c)}</button>`).join('')}</div>
      <p class="muted small">Friends can only send cheers. There is no chat.</p>
      <div class="sheet-actions"><button class="btn-soft" type="button" data-act="close">Close</button></div>
    </div>`);
  avatarPicture(f.outfit, { size: 240 }).then((s) => { const i = body.querySelector('.fs-av'); if (i) i.src = s; });
  body.querySelectorAll('.cheers .chip').forEach((b) => b.addEventListener('click', () => {
    sfx('cheer');
    closeSheet();
    toast(`Cheer sent to ${f.name}: "${b.textContent}"`);
  }));
  body.querySelector('[data-act="close"]').addEventListener('click', closeSheet);
}
function earnedBadgesFor(f) {
  return BADGES.filter((b) => f.badges.includes(b.id));
}

async function openAddFriend() {
  const { openSheet, closeSheet, toast, state, esc } = ctx;
  const body = openSheet(`
    <div class="add-friend">
      <h2 id="sheetTitle">Add a friend</h2>
      <p>Show this to a friend <strong>in person</strong>. They scan it with their app.</p>
      <div class="qr" id="qrBox" aria-label="Your friend code as a QR code"><span class="muted small">Loading...</span></div>
      <p class="code num">${esc(ME.code)}</p>
      <p class="muted small">No strangers: you can only add people you meet. No chat, only cheers.</p>
      <div class="sheet-actions">
        <button class="btn-soft" type="button" data-act="close">Close</button>
        <button class="btn-main" type="button" data-act="scan">Scan a code</button>
      </div>
    </div>`);
  body.querySelector('[data-act="close"]').addEventListener('click', closeSheet);
  body.querySelector('[data-act="scan"]').addEventListener('click', () => {
    if (state.friends.includes(NEW_FRIEND.id)) { closeSheet(); toast(`${NEW_FRIEND.name} is already your friend`); return; }
    body.innerHTML = `
      <div class="add-friend">
        <div class="scan-box" aria-hidden="true"><span></span></div>
        <p>Scanning... (demo)</p>
      </div>`;
    setTimeout(() => {
      state.friends.push(NEW_FRIEND.id);
      ctx.save();
      body.innerHTML = `
        <div class="add-friend">
          <img class="fs-av" alt="">
          <h2 id="sheetTitle">${esc(NEW_FRIEND.name)} is your friend now!</h2>
          <p class="muted">Class ${esc(NEW_FRIEND.cls)}. You can send each other cheers.</p>
          <div class="sheet-actions"><button class="btn-main" type="button" data-act="close">Yay!</button></div>
        </div>`;
      avatarPicture(NEW_FRIEND.outfit, { size: 240 }).then((s) => { const i = body.querySelector('.fs-av'); if (i) i.src = s; });
      body.querySelector('[data-act="close"]').addEventListener('click', closeSheet);
      renderMe();
    }, 1400);
  });
  try {
    await lazy(QR_JS);
    const qr = window.qrcode(0, 'M');
    qr.addData(`stepsy-friend:${ME.code}`);
    qr.make();
    const box = body.querySelector('#qrBox');
    if (box) box.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
  } catch {
    const box = body.querySelector('#qrBox');
    if (box) box.innerHTML = '<span class="muted small">QR needs internet</span>';
  }
}

// ---------------- Parent view ----------------
let map = null, zone = null;
export async function renderParent() {
  const { $, state, esc, fmt } = ctx;
  $('safeSeg').querySelectorAll('[data-km]').forEach((b) => {
    const on = +b.dataset.km === state.safeKm;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
  const last = state.walks[state.walks.length - 1];
  $('parentStatus').innerHTML = `
    <span class="ps-dot" aria-hidden="true"></span>
    <span><strong>${esc(state.nickname)} is not on a walk.</strong> Location is hidden until a walk starts.
    ${last ? `<br><span class="muted small">Last walk: ${new Date(last.at).toLocaleString('en-SG', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}, ${last.km.toFixed(2)} km, ${fmt(last.steps)} steps</span>` : ''}</span>`;
  $('alertList').innerHTML = state.alerts.length
    ? [...state.alerts].reverse().map((a) => `
      <li class="${a.kind === 'sos' ? 'al-sos' : 'al-far'}">
        <strong>${a.kind === 'sos' ? 'SOS pressed' : 'Left the safe zone'}</strong>
        <span class="muted small">${new Date(a.at).toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}${a.demo ? ' · demo' : ''}</span>
      </li>`).join('')
    : '<li class="empty">No alerts. SOS and safe zone alerts show up here.</li>';

  // Steps this week (made-up earlier days + today).
  const demoDays = state.demo ? [6200, 4800, 7300, 5100, 6900, 3900]
    : [6, 5, 4, 3, 2, 1].map((i) => { const x = new Date(); x.setDate(x.getDate() - i); return state.dayLog?.[x.toLocaleDateString('en-CA')] || 0; });
  const vals = [...demoDays, state.steps];
  const max = Math.max(...vals, 6000);
  $('weekBars').innerHTML = vals.map((v, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return `<li><span class="wb-v num">${(v / 1000).toFixed(1)}k</span><span class="wb" style="height:${Math.round((v / max) * 100)}%"></span><span class="wb-d">${i === 6 ? 'Today' : d.toLocaleDateString('en-SG', { weekday: 'short' })}</span></li>`;
  }).join('');

  try { await lazy(LEAFLET_JS, LEAFLET_CSS); } catch {
    $('parentMap').innerHTML = '<p class="empty">The map needs internet.</p>';
    return;
  }
  {
    const L = window.L;
    if (!map) {
      map = L.map($('parentMap'), { zoomControl: false, attributionControl: true, scrollWheelZoom: false }).setView(HOME_SPOT, 15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' }).addTo(map);
      L.polyline(DEMO_PATH, { color: '#D42A45', weight: 5, opacity: 0.9, lineJoin: 'round' }).addTo(map);
      L.marker(HOME_SPOT, { icon: L.divIcon({ className: 'pin start', html: '<span>Start</span>', iconSize: null }) }).addTo(map);
      DANGER_SPOTS.forEach((d) => L.marker(d.at, { icon: L.divIcon({ className: 'pin danger', html: '<span>!</span>', iconSize: null }) })
        .addTo(map).bindTooltip(`${esc(d.label)} (demo)`, { direction: 'top', offset: [0, -14] }));
    }
    if (zone) zone.remove();
    zone = L.circle(HOME_SPOT, { radius: state.safeKm * 1000, color: '#3FA874', weight: 2, fillColor: '#7FD8A6', fillOpacity: 0.12, dashArray: '6 6' }).addTo(map);
    map.invalidateSize();
    map.fitBounds(zone.getBounds(), { padding: [6, 6] });
  }
}
