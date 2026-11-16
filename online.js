// Real friends between phones (Firebase). Only used for your own progress, never in Demo mode.
// Each phone signs in without a password (a hidden ID), gets its own friend code, and shares only:
// nickname, look, buddy, animals, badges, today's steps, streak and level. No chat, no search, no list of players:
// you can only find someone by their code (QR, typed, or their link), and they must tap Accept.
import { FIREBASE_CONFIG } from './firebase-config.js';

const V = '12.6.0';
const CODE_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I/L, so codes are easy to read out
export const CODE_RE = /^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/;

let fb = null;        // loaded Firebase pieces
let me = null;        // { uid, code }
let ready = null;     // promise for start()
const friends = new Map(); // uid -> profile
let cheers = [];
let listeners = new Set();
const changed = () => listeners.forEach((f) => { try { f(); } catch {} });

export const onlineAvailable = () => !!FIREBASE_CONFIG;
export const myCode = () => me?.code || null;
export const friendList = () => [...friends.values()].sort((a, b) => a.name.localeCompare(b.name));
export const cheerList = () => cheers;
let requests = [];
export const requestList = () => requests;
export function onChange(f) { listeners.add(f); return () => listeners.delete(f); }

async function load() {
  if (fb) return fb;
  const base = `https://www.gstatic.com/firebasejs/${V}/`;
  const [app, auth, store] = await Promise.all([
    import(`${base}firebase-app.js`), import(`${base}firebase-auth.js`), import(`${base}firebase-firestore.js`),
  ]);
  const a = app.initializeApp(FIREBASE_CONFIG);
  fb = { ...auth, ...store, auth: auth.getAuth(a), db: store.getFirestore(a) };
  return fb;
}

function newCode() {
  const pick = () => CODE_ABC[Math.floor(Math.random() * CODE_ABC.length)];
  return `${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}`;
}

// Signs in, makes sure this phone has a friend code, and starts listening for friends and cheers.
export function start(state) {
  if (!FIREBASE_CONFIG) return Promise.resolve(null);
  ready ||= (async () => {
    const f = await load();
    if (!f.auth.currentUser) await f.signInAnonymously(f.auth);
    const uid = f.auth.currentUser.uid;
    const ref = f.doc(f.db, 'players', uid);
    const snap = await f.getDoc(ref);
    let code = snap.exists() ? snap.data().code : null;
    if (!code) {
      // Claim a free code. The rules only let a code be created once, so a clash just tries another.
      for (let i = 0; i < 6 && !code; i++) {
        const c = newCode();
        try { await f.setDoc(f.doc(f.db, 'codes', c), { uid }); code = c; } catch {}
      }
      if (!code) throw new Error('no code');
    }
    me = { uid, code };
    await pushProfile(state, true);
    listen();
    return me;
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

const today = () => new Date().toLocaleDateString('en-CA');
function profileOf(state) {
  const pets = [...new Set(state.pets.map((p) => p.type))];
  const gold = [...new Set(state.pets.filter((p) => p.gold).map((p) => p.type))];
  return {
    code: me.code, name: String(state.nickname || 'Walker').slice(0, 16),
    outfit: { look: state.outfit.look, hat: state.outfit.hat || null, eyes: state.outfit.eyes || null, hold: state.outfit.hold || null },
    buddy: state.buddy || null, pets, gold, badges: (state.badges || []).slice(0, 20),
    today: Math.max(0, Math.round(state.steps || 0)), day: today(),
    streak: Math.max(0, state.streak || 0), level: Math.max(1, state.level || 1),
  };
}
let lastSent = '', pushTimer = 0;
// Sends your profile when it changed (at most every few seconds).
export function pushProfile(state, now = false) {
  if (!me || !fb || state.demo) return Promise.resolve();
  const send = async () => {
    const p = profileOf(state);
    const key = JSON.stringify(p);
    if (key === lastSent) return;
    lastSent = key;
    await fb.setDoc(fb.doc(fb.db, 'players', me.uid), { ...p, updated: fb.serverTimestamp() }).catch(() => { lastSent = ''; });
  };
  clearTimeout(pushTimer);
  if (now) return send();
  pushTimer = setTimeout(send, 3000);
  return Promise.resolve();
}

const friendUnsubs = new Map();
let lastIds = new Set();
function listen() {
  const f = fb;
  f.onSnapshot(f.collection(f.db, 'players', me.uid, 'friends'), (snap) => {
    const ids = new Set(snap.docs.map((d) => d.id));
    for (const [id, un] of friendUnsubs) if (!ids.has(id)) { un(); friendUnsubs.delete(id); friends.delete(id); }
    ids.forEach(function watch(id) {
      if (friendUnsubs.has(id)) return;
      // Right after you add someone, their profile can be refused for a moment (the friendship is still
      // being saved), so a refused read tries again shortly.
      friendUnsubs.set(id, f.onSnapshot(f.doc(f.db, 'players', id), (d) => {
        if (!d.exists()) return;
        const p = d.data();
        friends.set(id, {
          id, uid: id, online: true, name: p.name || 'Friend', cls: '', outfit: p.outfit || {}, buddy: p.buddy || 'otter',
          pets: p.pets || [], gold: p.gold || [], badges: p.badges || [],
          today: p.day === today() ? p.today || 0 : 0, streak: p.streak || 0, level: p.level || 1,
        });
        changed();
      }, () => {
        friendUnsubs.delete(id);
        setTimeout(() => { if (lastIds.has(id)) watch(id); }, 1500);
      }));
    });
    lastIds = ids;
    changed();
  }, () => {});
  const q = f.query(f.collection(f.db, 'players', me.uid, 'cheers'), f.orderBy('at', 'desc'), f.limit(10));
  let first = true;
  f.onSnapshot(q, (snap) => {
    const fresh = first ? [] : snap.docChanges().filter((c) => c.type === 'added').map((c) => c.doc.data());
    first = false;
    cheers = snap.docs.map((d) => ({ ...d.data(), at: d.data().at?.toMillis?.() || Date.now() }));
    changed();
    fresh.forEach((c) => newCheer?.(c));
  }, () => {});
  let firstReq = true;
  f.onSnapshot(f.collection(f.db, 'players', me.uid, 'requests'), (snap) => {
    const fresh = firstReq ? [] : snap.docChanges().filter((c) => c.type === 'added').map((c) => ({ uid: c.doc.id, ...c.doc.data() }));
    firstReq = false;
    requests = snap.docs.map((d) => ({ uid: d.id, from: d.data().from || 'A friend', at: d.data().at?.toMillis?.() || Date.now() }))
      .filter((r) => !friends.has(r.uid)).sort((a, b) => b.at - a.at);
    changed();
    fresh.forEach((r) => newRequest?.(r));
  }, () => {});
}
let newCheer = null, newRequest = null;
export function onNewCheer(f) { newCheer = f; }
export function onNewRequest(f) { newRequest = f; }

// Sends a friend request to the code you scanned, typed or opened as a link. You only become friends when they
// tap Accept. If they already asked you, this accepts theirs straight away.
export async function sendRequest(code, fromName) {
  await ready;
  const f = fb;
  code = String(code || '').trim().toUpperCase();
  if (!CODE_RE.test(code)) return { ok: false, why: 'bad' };
  if (code === me.code) return { ok: false, why: 'self' };
  const c = await f.getDoc(f.doc(f.db, 'codes', code));
  if (!c.exists()) return { ok: false, why: 'unknown' };
  const them = c.data().uid;
  if (friends.has(them)) return { ok: false, why: 'already', friend: friends.get(them) };
  const theirs = requests.find((r) => r.uid === them);
  if (theirs) { await acceptRequest(them); return { ok: true, friendNow: true, friend: await profileSoon(them, theirs.from) }; }
  try {
    await f.setDoc(f.doc(f.db, 'players', them, 'requests', me.uid), { from: String(fromName || 'A friend').slice(0, 16), at: f.serverTimestamp() });
  } catch (e) {
    // A request you sent before can't be sent twice; it is still waiting for them.
    if (e?.code === 'permission-denied') return { ok: true, again: true };
    throw e;
  }
  return { ok: true };
}

// Tapping Accept: both of you become friends, then the request is cleared.
export async function acceptRequest(fromUid) {
  await ready;
  const f = fb;
  const at = f.serverTimestamp();
  const batch = f.writeBatch(f.db);
  batch.set(f.doc(f.db, 'players', me.uid, 'friends', fromUid), { at, by: me.uid });
  batch.set(f.doc(f.db, 'players', fromUid, 'friends', me.uid), { at, by: me.uid });
  await batch.commit();
  await f.deleteDoc(f.doc(f.db, 'players', me.uid, 'requests', fromUid)).catch(() => {});
}
export async function declineRequest(fromUid) {
  await ready;
  await fb.deleteDoc(fb.doc(fb.db, 'players', me.uid, 'requests', fromUid));
}

// A new friend's profile can be refused for a moment while the friendship saves, so this tries a few times.
async function profileSoon(uid, fallbackName) {
  const f = fb;
  for (let i = 0; i < 4; i++) {
    try {
      const p = await f.getDoc(f.doc(f.db, 'players', uid));
      if (p.exists()) return { name: p.data().name, outfit: p.data().outfit || {} };
    } catch {}
    await new Promise((r) => setTimeout(r, 800));
  }
  return { name: fallbackName || 'Your friend', outfit: {} };
}
export const friendProfile = profileSoon;

export async function sendCheer(friendUid, text, fromName) {
  await ready;
  const f = fb;
  await f.addDoc(f.collection(f.db, 'players', friendUid, 'cheers'), {
    from: String(fromName || 'A friend').slice(0, 16), fromUid: me.uid, text, at: f.serverTimestamp(),
  });
}
