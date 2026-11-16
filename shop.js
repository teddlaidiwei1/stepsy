// Shop: dress your avatar with coins earned by walking. Looks are always free.
import { createStage } from './scene.js';
import { avatarPicture, itemPicture } from './avatar3d.js';
import { LOOKS, SHOP, SHOP_TABS } from './data.js';
import { coinSVG } from './art.js';
import { play as sfx } from './sfx.js';

let ctx, stage = null, tab = 'looks', tried = null; // tried = { kind, id }

const slotOf = (kind) => (kind === 'look' ? 'look' : kind);
const isWearing = (o, kind, id) => (kind === 'hearing' ? !!o.hearing : o[slotOf(kind)] === id);
const owns = (item) => item.price === 0 || ctx.state.owned.includes(item.id);
const itemOf = (kind, id) => (kind === 'look' ? { kind, id, name: 'New look', price: 0 } : SHOP.find((s) => s.id === id));

function previewOutfit() {
  const o = { ...ctx.state.outfit };
  if (!tried) return o;
  if (tried.kind === 'hearing') o.hearing = true;
  else o[slotOf(tried.kind)] = tried.id;
  return o;
}

export function initShop(c) {
  ctx = c;
  const { $ } = ctx;
  $('shopTabs').innerHTML = SHOP_TABS.map((t) => `<button type="button" role="tab" data-t="${t.id}">${t.label}</button>`).join('');
  $('shopTabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    tab = b.dataset.t;
    renderGrid();
  });
  $('tryBtn').addEventListener('click', onAction);
}

export function showShop() {
  tried = null;
  if (!stage) stage = createStage(ctx.$('dressStage'), { outfit: ctx.state.outfit, mode: 'dress' });
  else stage.setOutfit(ctx.state.outfit);
  renderGrid();
  renderBar();
}

function renderGrid() {
  const { $, esc, fmt, state } = ctx;
  $('shopTabs').querySelectorAll('[data-t]').forEach((b) => {
    const on = b.dataset.t === tab;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on);
  });
  const grid = $('shopGrid');
  grid.innerHTML = '';
  const def = SHOP_TABS.find((t) => t.id === tab);
  const list = tab === 'looks' ? LOOKS.map((id) => ({ kind: 'look', id, name: '', price: 0 })) : SHOP.filter((s) => def.kinds.includes(s.kind));
  list.forEach((item, i) => {
    const wearing = isWearing(state.outfit, item.kind, item.id);
    const sel = tried && tried.kind === item.kind && tried.id === item.id;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `item-card sticker${sel ? ' sel' : ''}${wearing ? ' wearing' : ''}`;
    const tag = wearing ? '<span class="tag on">Wearing</span>'
      : item.price === 0 ? '<span class="tag">Free</span>'
      : owns(item) ? '<span class="tag">Owned</span>'
      : `<span class="tag price"><span class="ci">${coinSVG}</span>${fmt(item.price)}</span>`;
    b.innerHTML = `<span class="ph"><img alt=""></span>${item.name ? `<span class="nm">${esc(item.name)}</span>` : ''}${tag}`;
    b.setAttribute('aria-label', `${item.name || `Look ${i + 1}`}${wearing ? ', wearing' : ''}`);
    const img = b.querySelector('img');
    (item.kind === 'look' ? avatarPicture({ look: item.id }, { size: 192 }) : itemPicture(item.kind, item.id, 160))
      .then((src) => { img.src = src; });
    b.addEventListener('click', () => {
      tried = sel ? null : { kind: item.kind, id: item.id };
      stage.setOutfit(previewOutfit());
      renderGrid();
      renderBar();
    });
    grid.appendChild(b);
  });
}

function renderBar() {
  const { $, fmt, state } = ctx;
  const btn = $('tryBtn');
  btn.disabled = false;
  btn.className = 'btn-main';
  if (!tried) {
    $('tryName').textContent = 'Your look';
    $('tryNote').textContent = 'Tap something to try it on';
    btn.hidden = true;
    return;
  }
  btn.hidden = false;
  const item = itemOf(tried.kind, tried.id);
  const wearing = isWearing(state.outfit, tried.kind, tried.id);
  $('tryName').textContent = tried.kind === 'look' ? `Look ${LOOKS.indexOf(tried.id) + 1}` : item.name;
  if (wearing) {
    $('tryNote').textContent = 'You are wearing this';
    if (tried.kind === 'look') { btn.hidden = true; return; }
    btn.textContent = tried.kind === 'hold' ? 'Put down' : 'Take off';
    btn.className = 'btn-soft';
  } else if (owns(item)) {
    $('tryNote').textContent = item.price === 0 ? 'Free' : 'You own this';
    btn.textContent = 'Wear';
  } else if (state.coins >= item.price) {
    $('tryNote').textContent = `${fmt(item.price)} coins`;
    btn.innerHTML = `Buy <span class="ci">${coinSVG}</span>${fmt(item.price)}`;
  } else {
    $('tryNote').textContent = `${fmt(item.price)} coins. Walk to earn ${fmt(item.price - state.coins)} more!`;
    btn.textContent = 'Not enough coins';
    btn.disabled = true;
    btn.className = 'btn-soft';
  }
}

function wear(o) {
  ctx.state.outfit = o;
  ctx.save();
  ctx.applyOutfit(o);
}

function onAction() {
  if (!tried) return;
  const { state, toast, fmt } = ctx;
  const item = itemOf(tried.kind, tried.id);
  const o = { ...state.outfit };
  if (isWearing(o, tried.kind, tried.id)) {
    if (tried.kind === 'hearing') o.hearing = false; else o[slotOf(tried.kind)] = null;
    wear(o);
    toast(`Took off ${item.name.toLowerCase()}`);
  } else {
    if (!owns(item)) {
      if (state.coins < item.price) return;
      state.coins -= item.price;
      state.owned.push(item.id);
      ctx.renderTop();
      sfx('buy');
      toast(`Bought ${item.name}! -${fmt(item.price)} coins`);
    } else toast(tried.kind === 'look' ? 'New look on!' : `Wearing ${item.name}`);
    if (tried.kind === 'hearing') o.hearing = true; else o[slotOf(tried.kind)] = tried.id;
    wear(o);
  }
  stage.setOutfit(previewOutfit());
  renderGrid();
  renderBar();
}
