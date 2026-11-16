// Sound effects: Kenney CC0 sounds (see assets/sfx/License-*.txt) layered with notes made in code,
// built by assets/sfx/build_sfx.py.
// Played with Web Audio so they start instantly on iPhone. Respects the phone's silent switch ("ambient")
// and never stops music the kid is already playing. Kids (or parents) can turn sound off on the Me screen.
const VOL = {
  tap: 0.45, open: 0.6, close: 0.5, mark: 0.9, coin: 0.85, egg: 0.95, shake: 0.85, hatch: 1, buy: 0.85, nope: 0.6,
  walkstart: 0.85, walkend: 0.9, alert: 0.8, pet: 0.8, avatar: 0.75, cheer: 0.85, claim: 0.95, levelup: 1,
};
const KEY = 'stepsy-sound';
let ac = null, on = true, pendingTap = 0;
const bufs = {};
try { on = localStorage.getItem(KEY) !== 'off'; } catch {}

function unlock() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    Object.keys(VOL).forEach((name) => {
      fetch(`assets/sfx/${name}.mp3`).then((r) => r.arrayBuffer())
        .then((b) => new Promise((res, rej) => ac.decodeAudioData(b, res, rej)))
        .then((buf) => { bufs[name] = buf; }).catch(() => {});
    });
  }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
}

export function play(name) {
  if (name !== 'tap') { clearTimeout(pendingTap); pendingTap = 0; }
  if (!on || !ac || !bufs[name]) return;
  try {
    const src = ac.createBufferSource();
    const gain = ac.createGain();
    src.buffer = bufs[name];
    gain.gain.value = VOL[name] ?? 0.5;
    src.connect(gain).connect(ac.destination);
    src.start();
  } catch {}
}

export const soundOn = () => on;
export function setSound(value) {
  on = !!value;
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {}
  if (on) { unlock(); setTimeout(() => play('tap'), 60); }
}

export function initSfx() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch {}
  // Browsers only allow sound after the first touch, so the player starts on the first tap.
  ['pointerdown', 'touchend', 'keydown'].forEach((ev) => addEventListener(ev, unlock, { capture: true, passive: true }));
  // Every button gets a soft tap, unless something louder plays for that same tap (buy, claim, cheer...).
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled || b.dataset.sfx === 'none') return;
    clearTimeout(pendingTap);
    pendingTap = setTimeout(() => { pendingTap = 0; play('tap'); }, 0);
  }, true);
}
