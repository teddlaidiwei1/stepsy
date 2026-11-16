// Quests: daily and weekly goals that pay coins, the streak week and badges.
// Wording checked by Gemini Hydrogen for 7-year-olds: positive, no pressure.
import { ICONS, eggArt, coinSVG } from './art.js';
import { play as sfx } from './sfx.js';
import { BADGES } from './data.js';

let ctx;
const DEMO_WEEK = { days: 4, classKm: 16.2, km: 6.4 }; // made-up history before today

export function weekKey(d = new Date()) {
  const m = new Date(d); m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m.toLocaleDateString('en-CA');
}
const dayOf = (t) => new Date(t).toLocaleDateString('en-CA');

function today() {
  const { state } = ctx;
  const t = state.day;
  const walks = state.walks.filter((w) => dayOf(w.at) === t);
  const demo = state.demoDay === t;
  return {
    mins: demo ? 15 : walks.reduce((s, w) => s + (w.mins || 0), 0),
    eggs: demo ? 1 : walks.reduce((s, w) => s + (w.eggs || 0), 0),
    walked: state.walkDays.includes(t) || state.steps >= 1000,
  };
}
function week() {
  const { state } = ctx;
  const wk = weekKey();
  const walks = state.walks.filter((w) => weekKey(new Date(w.at)) === wk);
  const days = new Set(walks.filter((w) => w.steps > 0).map((w) => dayOf(w.at)));
  if (today().walked) days.add(state.day);
  // Real players: every 1,000-step day this week counts too, even without a walk session.
  if (!state.demo) state.walkDays.filter((d) => weekKey(new Date(`${d}T12:00`)) === wk).forEach((d) => days.add(d));
  const km = walks.reduce((s, w) => s + (w.km || 0), 0);
  return {
    days: Math.min((state.demo ? DEMO_WEEK.days : 0) + days.size, 7),
    hatched: state.hatched.filter((t) => weekKey(new Date(t)) === wk).length,
    classKm: (state.demo ? DEMO_WEEK.classKm : 0) + km,
    km: (state.demo ? DEMO_WEEK.km : 0) + km,
  };
}

const QUESTS = [
  { id: 'd-steps', when: 'day', title: 'Walk 5,000 steps today', reward: 50, art: () => ICONS.feet, prog: () => [ctx.state.steps, 5000], unit: 'steps' },
  { id: 'd-walk', when: 'day', title: 'Go on a 15-minute walk', reward: 40, art: () => ICONS.clock, prog: () => [today().mins, 15], unit: 'min' },
  { id: 'd-egg', when: 'day', title: 'Find an egg on a walk', reward: 30, art: () => eggArt(), prog: () => [today().eggs, 1] },
  { id: 'w-days', when: 'week', title: 'Walk on 5 different days this week', reward: 120, art: () => ICONS.feet, prog: () => [week().days, 5], unit: 'days' },
  { id: 'w-hatch', when: 'week', title: 'Hatch a pet this week', reward: 80, art: () => ICONS.pets, prog: () => [week().hatched, 1] },
  { id: 'w-class', when: 'week', title: 'Help your class walk 20 km (about 36,000 steps)', reward: 150, team: true, art: () => ICONS.ranks, prog: () => [week().classKm, 20], unit: 'km' },
];
const keyOf = (q) => `${q.id}@${q.when === 'day' ? ctx.state.day : weekKey()}`;
const done = (q) => { const [a, b] = q.prog(); return a >= b; };
const claimed = (q) => !!ctx.state.claimed[keyOf(q)];
export const claimable = () => QUESTS.filter((q) => done(q) && !claimed(q)).length;

// Badges you have now (demo history + what you did in the app).
export function earnedBadges() {
  const { state } = ctx;
  const got = new Set(state.badges);
  if (state.walks.some((w) => w.steps > 0)) got.add('first');
  if (state.walks.some((w) => w.eggs > 0) || state.hatched.length) got.add('egg');
  if (state.steps >= 5000) got.add('5k');
  if (state.pets.some((p) => p.gold)) got.add('gold');
  if (state.streak >= 7) got.add('week');
  if (new Set(state.pets.map((p) => p.type)).size >= 3) got.add('collector');
  if (week().km >= 10) got.add('explorer');
  return BADGES.filter((b) => got.has(b.id));
}
export function badgeArt(b) {
  const inner = b.icon === 'egg' ? eggArt() : ICONS[b.icon];
  return `<span class="badge-art" style="--bg:${b.color}">${inner}</span>`;
}

// How close you are to each badge: [now, goal, unit].
const mostOfOne = (pets) => { const n = {}; pets.forEach((p) => { n[p.type] = (n[p.type] || 0) + 1; }); return Math.max(0, ...Object.values(n)); };
const BADGE_PROG = {
  first: () => [ctx.state.walks.filter((w) => w.steps > 0).length, 1, 'walk'],
  egg: () => [ctx.state.walks.reduce((s, w) => s + (w.eggs || 0), 0) + ctx.state.hatched.length, 1, 'egg'],
  '5k': () => [ctx.state.steps, 5000, 'steps today'],
  week: () => [ctx.state.streak, 7, 'days in a row'],
  collector: () => [new Set(ctx.state.pets.map((p) => p.type)).size, 3, 'animals'],
  explorer: () => [week().km, 10, 'km this week'],
  gold: () => [mostOfOne(ctx.state.pets.filter((p) => !p.gold)), 5, 'of the same animal'],
};
// Badges as big buttons: earned ones in colour, the rest greyed out. Tapping one opens its card.
export function badgeButtons(earnedIds, owner = null) {
  return BADGES.map((b) => {
    const has = earnedIds.includes(b.id);
    return `<li class="${has ? '' : 'locked'}"><button type="button" class="badge-btn" data-badge="${b.id}" aria-label="${ctx.esc(b.name)}${has ? '' : ', not yet'}">${badgeArt(b)}<span>${ctx.esc(b.name)}</span></button></li>`;
  }).join('');
}
export function wireBadges(listEl, owner = null) {
  listEl.querySelectorAll('[data-badge]').forEach((btn) => btn.addEventListener('click', () => openBadge(btn.dataset.badge, owner)));
}
// The badge card. owner = null for you (shows your progress), or { name, badges } for someone else.
export function openBadge(id, owner = null) {
  const { esc, fmt, openSheet, closeSheet } = ctx;
  const b = BADGES.find((x) => x.id === id);
  const has = owner ? owner.badges.includes(id) : earnedBadges().some((x) => x.id === id);
  let status = '';
  if (owner) status = `<p class="bd-status${has ? ' got' : ''}">${has ? `${esc(owner.name)} has this badge!` : `${esc(owner.name)} doesn't have this one yet.`}</p>`;
  else if (has) status = '<p class="bd-status got">You got it!</p>';
  else {
    const [now, goal, rawUnit] = BADGE_PROG[id]();
    const unit = rawUnit;
    const kmToSteps = (k) => Math.round(k / 0.00055 / 100) * 100;
    const shown = unit.startsWith('km') ? `${fmt(kmToSteps(Math.min(now, goal)))} / ${fmt(kmToSteps(goal))}` : `${fmt(Math.min(now, goal))} / ${fmt(goal)}`;
    status = `<p class="bd-status">Not yet. Keep going!</p>
      <span class="bar" aria-hidden="true"><span style="width:${Math.min(now / goal, 1) * 100}%"></span></span>
      <p class="bd-num num">${shown} ${esc(unit.startsWith('km') ? 'steps this week' : unit)}</p>`;
  }
  const body = openSheet(`
    <div class="badge-card${has ? '' : ' locked'}">
      <div class="bd-art">${badgeArt(b)}</div>
      <h2 id="sheetTitle">${esc(b.name)}</h2>
      <p class="bd-how"><strong>How to get it:</strong> ${esc(b.how)}</p>
      ${status}
      <div class="sheet-actions"><button class="btn-main" type="button" data-act="close">OK</button></div>
    </div>`);
  body.querySelector('[data-act="close"]').addEventListener('click', closeSheet);
}
// Keeps state.badges up to date and tells the kid about a new one.
export function checkBadges() {
  const now = earnedBadges().map((b) => b.id);
  const fresh = now.filter((id) => !ctx.state.badges.includes(id));
  if (fresh.length) {
    ctx.state.badges.push(...fresh);
    ctx.save();
    ctx.toast(`New badge: ${BADGES.find((b) => b.id === fresh[0]).name}!`);
  }
}

export function initQuests(c) {
  ctx = c;
  ctx.$('questDemo').addEventListener('click', () => {
    ctx.state.demoDay = ctx.state.day;
    if (ctx.state.steps < 5000) ctx.addSteps(5000 - ctx.state.steps);
    ctx.save();
    renderQuests();
    ctx.updateDots();
    ctx.toast('Demo: today\'s quests are done');
  });
}

function questRow(q) {
  const { fmt, esc } = ctx;
  const [a, b] = q.prog();
  const pct = Math.min(a / b, 1) * 100;
  const isDone = a >= b, isClaimed = claimed(q);
  const shown = q.unit === 'km' ? `${Math.min(a, b).toFixed(1)} / ${b} km` : `${fmt(Math.min(a, b))} / ${fmt(b)}${q.unit ? ` ${q.unit}` : ''}`;
  return `
    <li class="quest${isDone ? ' done' : ''}${isClaimed ? ' claimed' : ''}">
      <span class="q-art">${q.art()}</span>
      <span class="q-body">
        <strong>${esc(q.title)}</strong>
        ${q.team ? '<span class="q-team">Class team goal</span>' : ''}
        <span class="bar ${isDone ? 'mint' : ''}" aria-hidden="true"><span style="width:${pct}%"></span></span>
        <span class="q-num num">${shown}</span>
      </span>
      ${isClaimed
        ? '<span class="q-got" aria-label="Claimed">Got it</span>'
        : isDone
          ? `<button class="btn-main sm q-claim" type="button" data-q="${q.id}">Claim +${q.reward}</button>`
          : `<span class="q-reward"><span class="ci">${coinSVG}</span>${q.reward}</span>`}
    </li>`;
}

export function renderQuests() {
  const { $, state } = ctx;
  checkBadges();
  $('dailyList').innerHTML = QUESTS.filter((q) => q.when === 'day').map(questRow).join('');
  $('weeklyList').innerHTML = QUESTS.filter((q) => q.when === 'week').map(questRow).join('');
  document.querySelectorAll('.q-claim').forEach((btn) => btn.addEventListener('click', () => {
    const q = QUESTS.find((x) => x.id === btn.dataset.q);
    if (!done(q) || claimed(q)) return;
    state.claimed[keyOf(q)] = true;
    state.coins += q.reward;
    ctx.save();
    ctx.renderTop();
    ctx.coinBurst(btn);
    sfx('claim');
    ctx.toast(`+${q.reward} coins!`);
    renderQuests();
    ctx.updateDots();
  }));

  // Streak week: the last 7 days, oldest first.
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const walked = i === 0 ? today().walked : state.walkDays.includes(d.toLocaleDateString('en-CA'));
    days.push({ label: d.toLocaleDateString('en-SG', { weekday: 'narrow' }), walked, today: i === 0, fruit: 6 - i });
  }
  $('streakDays').innerHTML = days.map((d) => `
    <li class="${d.walked ? 'on' : ''}${d.today ? ' today' : ''}">
      <span class="sd">${d.walked ? ICONS.feet : ''}</span><span class="sl">${d.today ? 'Today' : d.label}</span>
    </li>`).join('');
  $('streakTitle').textContent = state.streak > 0 ? `${state.streak} days in a row!` : 'Start a streak today';
  $('streakLine').textContent = state.streak > 0
    ? (today().walked ? 'Awesome walking! Come back tomorrow.' : 'Walk 1,000 steps today to keep it going.')
    : 'Rest days are OK. Walk 1,000 steps to start a new streak!';

  const earned = earnedBadges().map((b) => b.id);
  $('badgeCount').textContent = `${earned.length} of ${BADGES.length}`;
  $('badgeGrid').innerHTML = badgeButtons(earned);
  wireBadges($('badgeGrid'));
}
