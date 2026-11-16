// Ranks, your profile with friends (added in person by QR, cheers only) and the parent view.
import { play as sfx, soundOn, setSound } from './sfx.js';
import { avatarPicture } from './avatar3d.js';
import { petPortrait, createStage } from './scene.js';
import { PETS, PET_ORDER } from './pets.js';
import { BADGES, FRIENDS, NEW_FRIEND, CHEERS, CHEERS_IN, ME, classBoard, schoolBoard, sgBoard, seeded, HOME_SPOT, DEMO_PATH, DANGER_SPOTS } from './data.js';
import { earnedBadges, badgeButtons, wireBadges } from './quests.js';
import * as online from './online.js';
import { scanQR, canScan } from './scan.js';
import { notify } from './notify.js';

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
  takeLinkCode();
  takeCoros();
  startOnline();
  if (ctx.state.demo) linkAdd();
  $('openParent').addEventListener('click', () => ctx.gate(() => ctx.showScreen('parent')));
  $('demoBtn').addEventListener('click', () => ctx.gate(() => ctx.setDemo(!ctx.state.demo)));
  const snd = $('soundBtn');
  const showSnd = () => { snd.textContent = soundOn() ? 'Sound: on' : 'Sound: off'; snd.setAttribute('aria-pressed', soundOn()); };
  snd.addEventListener('click', () => { setSound(!soundOn()); showSnd(); });
  showSnd();
  $('meBack').addEventListener('click', () => ctx.showScreen(current ? backTo : 'home'));
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

// Friends board: you and your friends, by steps today (friends' steps update live).
function friendsNow() {
  const { state } = ctx;
  return state.demo ? state.friends.map((id) => [...FRIENDS, NEW_FRIEND].find((f) => f.id === id)).filter(Boolean)
    : online.friendList();
}
function renderFriendBoard() {
  const { $, fmt, esc, state } = ctx;
  const friends = friendsNow();
  const rows = [{ you: true, name: state.nickname, steps: Math.round(state.steps || 0) },
    ...friends.map((f) => ({ f, name: f.name, steps: Math.round(f.today || 0) }))]
    .sort((a, b) => b.steps - a.steps || (a.you ? -1 : b.you ? 1 : a.name.localeCompare(b.name)));
  const n = rows.findIndex((r) => r.you) + 1;
  $('rankHero').innerHTML = friends.length
    ? `<span class="rank-big num">#${n}</span><span class="rank-what"><strong>You are</strong> ${n === 1 ? 'top' : `number ${n}`} of your friends today</span>`
    : '<span class="rank-big num">#1</span><span class="rank-what">Add friends on <strong>Me</strong> to race them here</span>';
  $('rankUnit').textContent = 'Steps today';
  $('rankNote').textContent = state.demo ? 'Demo names' : '';
  const list = $('rankList');
  list.innerHTML = rows.map((r, i) => `
    <li class="rank-row${r.you ? ' you' : ''}${medal(i)}">
      <span class="rk num">${i + 1}</span>
      <span class="rav"><img alt=""></span>
      <span class="rn">${r.you ? `${esc(r.name)} (you)` : esc(r.name)}</span>
      <span class="rs num">${fmt(r.steps)}</span>
      <button class="rank-hit" type="button" aria-label="${r.you ? 'Your profile' : `See ${esc(r.name)}'s profile`}"></button>
    </li>`).join('');
  list.querySelectorAll('.rank-row').forEach((li, i) => {
    const r = rows[i];
    const img = li.querySelector('img');
    if (r.you) { const b = document.querySelector('#badge img'); if (b) img.src = b.src; else avatarPicture(state.outfit, { size: 96, head: true }).then((s) => { img.src = s; }); }
    else avatarPicture(r.f.outfit, { size: 96, head: true }).then((s) => { img.src = s; });
    li.querySelector('.rank-hit').addEventListener('click', () => (r.you ? ctx.showScreen('me') : showProfile({ ...r.f, friend: true })));
  });
}

export function renderRanks() {
  const { $, fmt, esc } = ctx;
  $('rankTabs').querySelectorAll('[data-b]').forEach((b) => {
    const on = b.dataset.b === board;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on);
  });
  document.querySelector('#screen-ranks .award').hidden = board === 'friends';
  if (board === 'friends') { renderFriendBoard(); return; }
  $('rankNote').textContent = 'Demo names';
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
      ${board === 'class' ? `<button class="rank-hit" type="button" aria-label="${r.you ? 'Your profile' : `See ${esc(r.name)}'s profile`}"></button>` : ''}
    </li>`).join('');
  if (board === 'class') {
    list.querySelectorAll('.rank-row').forEach((li, i) => {
      const r = rows[i];
      const img = li.querySelector('img');
      if (r.you) { const b = document.querySelector('#badge img'); if (b) img.src = b.src; else avatarPicture(ctx.state.outfit, { size: 96, head: true }).then((s) => { img.src = s; }); }
      else avatarPicture({ look: r.look }, { size: 96, head: true }).then((s) => { img.src = s; });
      li.querySelector('.rank-hit').addEventListener('click', () => (r.you ? ctx.showScreen('me') : showProfile(classmate(r))));
    });
  }
}

// ---------------- Profile page: yours, a friend's or a classmate's (same page) ----------------
let viewing = null, current = null, backTo = 'home', profStage = null;
const hashName = (t) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
// Classmates from Ranks: your friends show their real profile; other kids get a made-up one (demo).
function classmate(r) {
  const friend = [...FRIENDS, NEW_FRIEND].find((f) => f.name === r.name && ctx.state.friends.includes(f.id));
  if (friend) return { ...friend, friend: true };
  const rnd = seeded(hashName(r.name));
  const commons = PET_ORDER.filter((t) => PETS[t].rarity === 'common');
  const buddy = commons[Math.floor(rnd() * commons.length)];
  const pets = [...new Set([buddy, ...PET_ORDER.filter(() => rnd() < 0.3)])];
  const badges = BADGES.filter((b, i) => i === 0 || (b.id !== 'gold' && rnd() < 0.4)).map((b) => b.id);
  return {
    name: r.name, cls: ME.cls, outfit: { look: r.look }, buddy, pets, badges,
    today: Math.round(1200 + rnd() * 5200), streak: Math.floor(rnd() * 10), level: 2 + Math.floor(r.steps / 6000), friend: false,
  };
}
export function showProfile(p) {
  viewing = p;
  backTo = document.body.dataset.view || 'home';
  ctx.showScreen('me');
}

export function renderMe() {
  const { $, esc, fmt, state } = ctx;
  const who = viewing; viewing = null; current = who;
  $('screen-me').dataset.who = who ? 'friend' : 'me';
  const name = who ? who.name : state.nickname;
  $('profTitle').textContent = who ? (who.friend ? 'Friend' : 'Classmate') : 'Me';
  $('meName').textContent = name;
  $('meSub').textContent = who ? (who.cls ? `Class ${who.cls}${who.friend ? ' · Your friend' : ''}` : `Level ${who.level} · Your friend`)
    : state.demo ? `${ME.cls} · ${ME.school} (demo)` : 'Keep walking to level up!';

  // Big 3D picture: the avatar with their buddy (gold if they made it gold).
  const outfit = who ? who.outfit : state.outfit;
  const buddy = who ? who.buddy : state.buddy;
  const goldSet = new Set(who ? (who.gold || []) : state.pets.filter((p) => p.gold).map((p) => p.type));
  if (!profStage) profStage = createStage($('profStage'), { outfit, pet: buddy, mode: 'home' });
  else profStage.setOutfit(outfit);
  profStage.setPet(buddy, { gold: goldSet.has(buddy) });
  profStage.kick();

  // Their own numbers, big.
  const counts = new Map();
  if (who) who.pets.forEach((t) => counts.set(t, 1));
  else state.pets.forEach((p) => counts.set(p.type, (counts.get(p.type) || 0) + 1));
  const stats = who ? [who.today, who.streak, who.level, counts.size] : [state.steps, state.streak, state.level, counts.size];
  const labels = ['steps today', stats[1] === 1 ? 'day in a row' : 'days in a row', 'level', counts.size === 1 ? 'animal' : 'animals'];
  $('meStats').innerHTML = stats.map((v, i) => `<div class="ps"><span class="num">${fmt(v)}</span><span>${labels[i]}</span></div>`).join('');

  // Every badge: earned ones in colour. Tap for the badge card.
  const earned = who ? who.badges : earnedBadges().map((b) => b.id);
  $('meBadgeTitle').textContent = who ? `${name}'s badges` : 'My badges';
  $('meBadgeCount').textContent = `${earned.length} of ${BADGES.length}`;
  $('meBadges').innerHTML = badgeButtons(earned);
  wireBadges($('meBadges'), who ? { name, badges: earned } : null);

  // Animals they have.
  $('mePetTitle').textContent = who ? `${name}'s animals` : 'My animals';
  $('mePetCount').textContent = `${counts.size} of ${PET_ORDER.length}`;
  $('mePets').innerHTML = PET_ORDER.filter((t) => counts.has(t)).map((t) => `
    <li class="${goldSet.has(t) ? 'gold' : ''}">
      <img src="${petPortrait(t, 128, { gold: goldSet.has(t) })}" alt="">
      <span class="pn">${esc(PETS[t].name)}</span>
      <span class="pt">${t === buddy ? 'Buddy' : goldSet.has(t) ? 'Gold' : counts.get(t) > 1 ? `x${counts.get(t)}` : '&nbsp;'}</span>
    </li>`).join('');

  if (who) {
    // Cheers only for friends you added in person. No chat.
    $('sendCheerTitle').textContent = who.friend ? 'Send a cheer' : 'Not your friend yet';
    $('profCheers').innerHTML = who.friend ? CHEERS.map((c) => `<button class="chip" type="button">${esc(c)}</button>`).join('') : '';
    $('profNote').textContent = who.friend ? 'Friends can only send cheers. There is no chat.'
      : `You can add ${name} as a friend when you meet in person. Then you can send cheers.`;
    $('profCheers').querySelectorAll('.chip').forEach((b) => b.addEventListener('click', async () => {
      if (who.online) {
        b.disabled = true;
        try { await online.sendCheer(who.uid, b.textContent, state.nickname); }
        catch { ctx.toast('Could not send. Check the internet and try again.'); b.disabled = false; return; }
        b.disabled = false;
      }
      sfx('cheer');
      ctx.toast(`Cheer sent to ${name}: "${b.textContent}"`);
    }));
    return;
  }

  $('demoBtn').textContent = state.demo ? 'Turn off' : 'Turn on';
  $('demoBtn').setAttribute('aria-pressed', String(!!state.demo));
  $('demoNote').textContent = state.demo ? 'Showing made-up demo data. Turn off to go back to your own progress.' : 'For showing the app. Your own progress is kept safe.';
  const realCheers = online.cheerList();
  $('cheersIn').innerHTML = state.demo
    ? CHEERS_IN.map((c) => `<li><strong>${esc(c.from)}</strong> sent "${esc(c.text)}" <span class="muted small">${esc(c.ago)}</span></li>`).join('')
    : realCheers.length
      ? realCheers.map((c) => `<li><strong>${esc(c.from)}</strong> sent "${esc(c.text)}" <span class="muted small">${esc(ago(c.at))}</span></li>`).join('')
      : '<li class="empty">No cheers yet. Add friends and they can cheer you on.</li>';

  const friends = state.demo ? state.friends.map((id) => [...FRIENDS, NEW_FRIEND].find((f) => f.id === id)).filter(Boolean)
    : online.friendList();
  const reqs = state.demo ? [] : online.requestList();
  const reqBox = $('friendReqs');
  reqBox.hidden = !reqs.length;
  reqBox.innerHTML = reqs.map((r) => `
    <li><span class="rq-name"><strong>${esc(r.from)}</strong> wants to be your friend</span>
      <button class="chip" type="button" data-no="${esc(r.uid)}">No</button>
      <button class="chip btn-main" type="button" data-yes="${esc(r.uid)}">Accept</button></li>`).join('');
  reqBox.querySelectorAll('button').forEach((b) => b.addEventListener('click', async () => {
    const uid = b.dataset.yes || b.dataset.no;
    const r = reqs.find((x) => x.uid === uid);
    reqBox.querySelectorAll('button').forEach((x) => { x.disabled = true; });
    try {
      if (b.dataset.yes) {
        await online.acceptRequest(uid);
        sfx('cheer');
        ctx.toast(`${r?.from || 'Your friend'} is your friend now!`);
      } else {
        await online.declineRequest(uid);
      }
    } catch { ctx.toast('Could not do that. Check the internet and try again.'); }
    renderMe();
  }));
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
      <span class="fs muted small">${f.cls ? `${esc(f.cls)} · ` : ''}<span class="num">${fmt(f.today)}</span> steps</span>
      <img class="fpet" src="${petPortrait(f.buddy, 96, { gold: (f.gold || []).includes(f.buddy) })}" alt="">`;
    b.setAttribute('aria-label', `${f.name}, ${fmt(f.today)} steps today. See profile`);
    avatarPicture(f.outfit, { size: 128, head: true }).then((s) => { b.querySelector('.fav img').src = s; });
    b.addEventListener('click', () => showProfile({ ...f, friend: true }));
    grid.appendChild(b);
  });
}

// ---------------- Real friends (online) ----------------
function ago(ms) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : h < 48 ? 'Yesterday' : `${Math.round(h / 24)} days ago`;
}
const onMyPage = () => document.body.dataset.view === 'me' && !current;
function startOnline() {
  const { state } = ctx;
  if (state.demo || !online.onlineAvailable()) return;
  online.onChange(() => {
    if (onMyPage()) renderMe();
    if (document.body.dataset.view === 'ranks' && board === 'friends') renderRanks();
  });
  online.onNewCheer((c) => { sfx('cheer'); notify(`${c.from} cheered you!`, `"${c.text}"`, { toast: ctx.toast, tag: 'cheer' }); });
  online.onNewRequest((r) => { sfx('cheer'); notify(`${r.from} wants to be your friend`, 'Open Me to say yes or no.', { toast: ctx.toast, tag: 'request' }); });
  const go = () => { if (state.onboarded) online.start(state).catch(() => {}); };
  go();
  document.addEventListener('stepsy-saved', () => { go(); online.pushProfile(state); linkAdd(); });
  linkAdd();
  corosImport();
}

// ---------------- Tedd's own COROS watch steps (one-time link …/stepsy/?coros=2026-11-16.18659_…) ----------------
// Only the phone whose friend code is Tedd's takes it; on anyone else's phone the link does nothing.
const COROS_CODE = 'GT5-9UD';
function takeCoros() {
  const p = new URLSearchParams(location.search);
  if (!p.has('coros')) return;
  const raw = String(p.get('coros'));
  p.delete('coros');
  history.replaceState(null, '', `${location.pathname}${p.size ? `?${p}` : ''}${location.hash}`);
  try { localStorage.setItem('stepsy-coros', raw.slice(0, 400)); } catch {}
}
async function corosImport() {
  const { state } = ctx;
  let raw = null;
  try { raw = localStorage.getItem('stepsy-coros'); } catch {}
  if (!raw || !state.onboarded || state.demo) return;
  try { await online.start(state); } catch { return; }
  try { localStorage.removeItem('stepsy-coros'); } catch {}
  if (online.myCode() !== COROS_CODE) return;
  const days = {};
  for (const part of raw.split('_')) {
    const m = /^(\d{4}-\d{2}-\d{2})\.(\d{1,6})$/.exec(part);
    if (m) days[m[1]] = Math.min(+m[2], 99999);
  }
  let added = 0;
  const log = { ...state.dayLog };
  for (const [d, n] of Object.entries(days)) {
    if (d < state.day && n > (log[d] || 0)) { added += n - (log[d] || 0); log[d] = n; }
  }
  state.dayLog = log;
  const now = days[state.day];
  if (now > state.steps) { added += now - state.steps; ctx.addSteps(now - state.steps); }
  ctx.save();
  if (document.body.dataset.view === 'ranks') renderRanks();
  ctx.toast(added ? `Added ${ctx.fmt(added)} steps from your COROS watch` : 'Your COROS steps are already in');
}

// ---------------- Add-friend link (…/stepsy/?add=ABC-123) ----------------
// Your QR holds this link, so any phone camera can open it, and "Share my link" sends it in a message.
const friendLink = (code) => `${location.origin}${location.pathname}?add=${code}`;
function codeFromText(t) {
  t = String(t || '').trim();
  const m = /^stepsy-friend:([A-Za-z0-9-]{7})$/.exec(t);
  if (m) return m[1].toUpperCase();
  try { const c = (new URL(t).searchParams.get('add') || '').toUpperCase(); if (online.CODE_RE.test(c)) return c; } catch {}
  return null;
}
// Opening a friend's link: remember the code (it survives the first-time setup), then ask before adding.
function takeLinkCode() {
  const p = new URLSearchParams(location.search);
  if (!p.has('add')) return;
  const c = String(p.get('add')).trim().toUpperCase();
  p.delete('add');
  history.replaceState(null, '', `${location.pathname}${p.size ? `?${p}` : ''}${location.hash}`);
  try { if (online.CODE_RE.test(c)) localStorage.setItem('stepsy-add', c); } catch {}
}
function linkAdd() {
  const { state, openSheet, closeSheet, toast } = ctx;
  let code = null;
  try { code = localStorage.getItem('stepsy-add'); } catch {}
  if (!code || !state.onboarded || !online.onlineAvailable()) return;
  try { localStorage.removeItem('stepsy-add'); } catch {}
  if (state.demo) { toast('Turn off Demo mode to add real friends.'); return; }
  setTimeout(() => {
    const body = openSheet(`
      <div class="add-friend">
        <h2 id="sheetTitle">Send a friend request?</h2>
        <p>Your friend's code is</p>
        <p class="code num">${code}</p>
        <p class="muted small" id="linkMsg">Only add people you know. No chat, only cheers.</p>
        <div class="sheet-actions">
          <button class="btn-soft" type="button" data-act="close">Not now</button>
          <button class="btn-main" type="button" data-act="add">Send request</button>
        </div>
      </div>`);
    body.querySelector('[data-act="close"]').addEventListener('click', closeSheet);
    const add = body.querySelector('[data-act="add"]');
    add.addEventListener('click', async () => {
      add.disabled = true;
      const msg = (t) => { const m = body.querySelector('#linkMsg'); if (m) m.textContent = t; };
      msg('Sending...');
      try {
        await online.start(state);
        const r = await online.sendRequest(code, state.nickname);
        if (r.ok) { requestDone(body, r); return; }
        msg(r.why === 'self' ? 'That is your own link!' : r.why === 'already' ? `${r.friend?.name || 'They'} is already your friend.`
          : 'No one has that code. Ask your friend to send the link again.');
      } catch { msg('Could not add. Check the internet and try again.'); add.disabled = false; }
    });
  }, 700);
}

async function shareLink(code) {
  const url = friendLink(code);
  if (navigator.share) {
    try { await navigator.share({ title: 'Stepsy', text: `Be my Stepsy friend! My code is ${code}.`, url }); return; }
    catch (e) { if (e?.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); ctx.toast('Link copied! Send it to your friend.'); }
  catch { ctx.toast(`Your link: ${url}`); }
}

async function drawQR(body, text) {
  const box = body.querySelector('#qrBox');
  try {
    await lazy(QR_JS);
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    if (box) box.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
  } catch {
    if (box) box.innerHTML = '<span class="muted small">QR needs internet</span>';
  }
}

async function openAddFriend() {
  const { openSheet, closeSheet, state, esc } = ctx;
  const real = !state.demo;
  if (real && !online.onlineAvailable()) {
    const body = openSheet(`
      <div class="add-friend">
        <h2 id="sheetTitle">Add a friend</h2>
        <p>Real friends are coming soon. Turn on Demo mode (for grown-ups) to see how it works.</p>
        <div class="sheet-actions"><button class="btn-main" type="button" data-act="close">OK</button></div>
      </div>`);
    body.querySelector('[data-act="close"]').addEventListener('click', closeSheet);
    return;
  }
  const body = openSheet(`
    <div class="add-friend">
      <h2 id="sheetTitle">Add a friend</h2>
      <p>Your friend scans this, or opens your link. Then you tap <strong>Accept</strong>.</p>
      <div class="qr" id="qrBox" aria-label="Your friend code as a QR code"><span class="muted small">Loading...</span></div>
      <p class="code num" id="myCode">${real ? '...' : esc(ME.code)}</p>
      <div class="friend-alt">
        ${real ? '<button class="btn-soft" type="button" data-act="share" disabled>Share my link</button>' : ''}
        <button class="btn-soft" type="button" data-act="type">Type a code</button>
      </div>
      <p class="muted small">Only add people you know. No chat, only cheers.</p>
      <div class="sheet-actions">
        <button class="btn-soft" type="button" data-act="close">Close</button>
        <button class="btn-main" type="button" data-act="scan">Scan a code</button>
      </div>
    </div>`);
  body.querySelector('[data-act="close"]').addEventListener('click', closeSheet);
  body.querySelector('[data-act="scan"]').addEventListener('click', () => (real ? realScan(body) : demoScan(body)));
  body.querySelector('[data-act="type"]').addEventListener('click', () => (real ? realScan(body, true) : demoScan(body)));
  if (!real) { drawQR(body, `stepsy-friend:${ME.code}`); return; }
  try {
    await online.start(state);
    const code = online.myCode();
    const el = body.querySelector('#myCode');
    if (el) el.textContent = code;
    drawQR(body, friendLink(code));
    const sh = body.querySelector('[data-act="share"]');
    if (sh) { sh.disabled = false; sh.addEventListener('click', () => shareLink(code)); }
  } catch {
    const box = body.querySelector('#qrBox');
    if (box) box.innerHTML = '<span class="muted small">Needs internet. Try again in a moment.</span>';
    const el = body.querySelector('#myCode');
    if (el) el.textContent = '';
  }
}

// Demo mode: a pretend scan that always finds Mei Ling.
function demoScan(body) {
  const { closeSheet, toast, state, esc } = ctx;
  if (state.friends.includes(NEW_FRIEND.id)) { closeSheet(); toast(`${NEW_FRIEND.name} is already your friend`); return; }
  body.innerHTML = `
    <div class="add-friend">
      <div class="scan-box" aria-hidden="true"><span></span></div>
      <p>Scanning... (demo)</p>
    </div>`;
  setTimeout(() => {
    state.friends.push(NEW_FRIEND.id);
    ctx.save();
    friendAdded(body, NEW_FRIEND.name, NEW_FRIEND.outfit, `Class ${esc(NEW_FRIEND.cls)}. You can send each other cheers.`);
  }, 1400);
}

function friendAdded(body, name, outfit, line) {
  const { closeSheet, esc } = ctx;
  sfx('cheer');
  body.innerHTML = `
    <div class="add-friend">
      <img class="fs-av" alt="">
      <h2 id="sheetTitle">${esc(name)} is your friend now!</h2>
      <p class="muted">${line}</p>
      <div class="sheet-actions"><button class="btn-main" type="button" data-act="close">Yay!</button></div>
    </div>`;
  avatarPicture(outfit, { size: 240 }).then((s) => { const i = body.querySelector('.fs-av'); if (i) i.src = s; });
  body.querySelector('[data-act="close"]').addEventListener('click', closeSheet);
  renderMe();
}

// After sending a request: friends straight away if they had already asked you, otherwise wait for their Accept.
function requestDone(body, r) {
  if (r.friendNow) { friendAdded(body, r.friend.name, r.friend.outfit, 'You can send each other cheers.'); return; }
  const { closeSheet } = ctx;
  sfx('cheer');
  body.innerHTML = `
    <div class="add-friend">
      <h2 id="sheetTitle">${r.again ? 'Request already sent' : 'Friend request sent!'}</h2>
      <p>When your friend taps <strong>Accept</strong>, you become friends.</p>
      <div class="sheet-actions"><button class="btn-main" type="button" data-act="close">OK</button></div>
    </div>`;
  body.querySelector('[data-act="close"]').addEventListener('click', closeSheet);
}

// Real scan: the camera looks for a friend's Stepsy QR code. Typing the code works too.
function realScan(body, typeOnly = false) {
  const { closeSheet, esc } = ctx;
  body.innerHTML = `
    <div class="add-friend">
      <h2 id="sheetTitle">${typeOnly ? "Type your friend's code" : "Scan your friend's code"}</h2>
      <div class="scan-box live" id="scanBox" aria-hidden="true"${typeOnly ? ' hidden' : ''}><span></span></div>
      <p class="muted small" id="scanMsg">${typeOnly ? 'Codes look like ABC-123. It is under their QR code.' : "Point the camera at the QR code on your friend's phone."}</p>
      <form class="code-form" id="codeForm" autocomplete="off">
        <label for="codeIn" class="small">${typeOnly ? "Their code" : "Or type their code"}</label>
        <div class="code-row">
          <input id="codeIn" inputmode="text" autocapitalize="characters" spellcheck="false" maxlength="7" placeholder="ABC-123">
          <button class="btn-main" type="submit">Send</button>
        </div>
      </form>
      <div class="sheet-actions"><button class="btn-soft" type="button" data-act="close">Close</button></div>
    </div>`;
  let scanner = null;
  const stopCam = () => scanner?.stop();
  const msg = (t) => { const m = body.querySelector('#scanMsg'); if (m) m.textContent = t; };
  body.querySelector('[data-act="close"]').addEventListener('click', () => { stopCam(); closeSheet(); });
  const input = body.querySelector('#codeIn');
  input.addEventListener('input', () => {
    let v = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (v.length > 3) v = `${v.slice(0, 3)}-${v.slice(3)}`;
    input.value = v;
  });
  let busy = false;
  const tryCode = async (code) => {
    if (busy) return;
    busy = true;
    msg('Sending...');
    try {
      const r = await online.sendRequest(code, ctx.state.nickname);
      if (r.ok) { stopCam(); requestDone(body, r); return; }
      msg(r.why === 'self' ? 'That is your own code!' : r.why === 'already' ? `${r.friend?.name || 'They'} is already your friend.`
        : r.why === 'bad' ? 'Codes look like ABC-123.' : 'No one has that code. Check it and try again.');
    } catch {
      msg('Could not send. Check the internet and try again.');
    }
    busy = false;
  };
  body.querySelector('#codeForm').addEventListener('submit', (e) => { e.preventDefault(); tryCode(input.value); });
  if (typeOnly) { input.focus(); return; } // opened by the kid's own tap, so the keyboard can come up
  if (!canScan()) { msg('This phone cannot use the camera here. Type the code instead.'); body.querySelector('#scanBox').hidden = true; return; }
  const loop = () => {
    if (!document.contains(input)) return; // pop-up already closed: don't turn the camera back on
    scanner = scanQR(body.querySelector('#scanBox'));
    scanner.promise.then(async (text) => {
      const code = codeFromText(text);
      if (!code) { msg('That is not a Stepsy code. Try again.'); setTimeout(loop, 1200); return; }
      await tryCode(code);
      if (body.querySelector('#scanBox')) setTimeout(loop, 1500);
    }).catch((e) => {
      if (e.message === 'stopped') return;
      const box = body.querySelector('#scanBox'); if (box) box.hidden = true;
      msg(e.message === 'denied' ? 'Camera is off for Stepsy. Type the code instead, or ask a grown-up to allow the camera.'
        : 'No camera found. Type the code instead.');
    });
  };
  loop();
  // Make sure the camera turns off however the pop-up closes (scrim tap, Escape).
  const obs = new MutationObserver(() => { if (!document.contains(input)) { stopCam(); obs.disconnect(); } });
  obs.observe(document.body, { childList: true, subtree: true });
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
