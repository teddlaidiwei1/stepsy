// Quests: daily and weekly goals that pay coins, the streak week and badges.
// Wording checked by Gemini Hydrogen for 7-year-olds: positive, no pressure.
import { ICONS, eggArt, fruitSVG, coinSVG } from './art.js';
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
    walked: walks.length > 0 || state.steps >= 1000,
  };
}
function week() {
  const { state } = ctx;
  const wk = weekKey();
  const walks = state.walks.filter((w) => weekKey(new Date(w.at)) === wk);
  const days = new Set(walks.map((w) => dayOf(w.at)));
  if (today().walked) days.add(state.day);
  const km = walks.reduce((s, w) => s + (w.km || 0), 0);
  return {
    days: Math.min(DEMO_WEEK.days + days.size, 7),
    hatched: state.hatched.filter((t) => weekKey(new Date(t)) === wk).length,
    classKm: DEMO_WEEK.classKm + km,
    km: DEMO_WEEK.km + km,
  };
}

const QUESTS = [
  { id: 'd-steps', when: 'day', title: 'Walk 5,000 steps today', reward: 50, art: () => ICONS.feet, prog: () => [ctx.state.steps, 5000], unit: 'steps' },
  { id: 'd-walk', when: 'day', title: 'Go on a 15-minute walk', reward: 40, art: () => ICONS.clock, prog: () => [today().mins, 15], unit: 'min' },
  { id: 'd-egg', when: 'day', title: 'Find an egg on a walk', reward: 30, art: () => eggArt(), prog: () => [today().eggs, 1] },
  { id: 'w-days', when: 'week', title: 'Walk on 5 different days this week', reward: 120, art: () => fruitSVG(1), prog: () => [week().days, 5], unit: 'days' },
  { id: 'w-hatch', when: 'week', title: 'Hatch a pet this week', reward: 80, art: () => ICONS.pets, prog: () => [week().hatched, 1] },
  { id: 'w-class', when: 'week', title: 'Help your class walk 20 km together', reward: 150, team: true, art: () => ICONS.ranks, prog: () => [week().classKm, 20], unit: 'km' },
];
const keyOf = (q) => `${q.id}@${q.when === 'day' ? ctx.state.day : weekKey()}`;
const done = (q) => { const [a, b] = q.prog(); return a >= b; };
const claimed = (q) => !!ctx.state.claimed[keyOf(q)];
export const claimable = () => QUESTS.filter((q) => done(q) && !claimed(q)).length;

// Badges you have now (demo history + what you did in the app).
export function earnedBadges() {
  const { state } = ctx;
  const got = new Set(state.badges);
  if (state.walks.length) got.add('first');
  if (state.steps >= 5000) got.add('5k');
  if (state.streak >= 7) got.add('week');
  if (new Set(state.pets.map((p) => p.type)).size >= 3) got.add('collector');
  if (week().km >= 10) got.add('explorer');
  return BADGES.filter((b) => got.has(b.id));
}
export function badgeArt(b) {
  const inner = b.icon === 'egg' ? eggArt() : b.icon === 'fruit' ? fruitSVG(0) : ICONS[b.icon];
  return `<span class="badge-art" style="--bg:${b.color}">${inner}</span>`;
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
    ctx.toast(`+${q.reward} coins!`);
    renderQuests();
    ctx.updateDots();
  }));

  // Streak week: the last 7 days, oldest first.
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const walked = i === 0 ? today().walked : i < state.streak;
    days.push({ label: d.toLocaleDateString('en-SG', { weekday: 'narrow' }), walked, today: i === 0, fruit: 6 - i });
  }
  $('streakDays').innerHTML = days.map((d) => `
    <li class="${d.walked ? 'on' : ''}${d.today ? ' today' : ''}">
      <span class="sd">${d.walked ? fruitSVG(d.fruit) : ''}</span><span class="sl">${d.today ? 'Today' : d.label}</span>
    </li>`).join('');
  $('streakTitle').textContent = state.streak > 0 ? `${state.streak} days in a row!` : 'Start a streak today';
  $('streakLine').textContent = state.streak > 0 ? 'Awesome walking!' : 'Rest days are OK. Start a new streak today!';

  const earned = earnedBadges().map((b) => b.id);
  $('badgeCount').textContent = `${earned.length} of ${BADGES.length}`;
  $('badgeGrid').innerHTML = BADGES.map((b) => `
    <li class="${earned.includes(b.id) ? '' : 'locked'}">${badgeArt(b)}<span>${b.name}</span></li>`).join('');
}
