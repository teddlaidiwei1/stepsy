// 3D stages: the Home stage (Kenney avatar + buddy pet on a grass mound) and the Pets viewer (one pet on a mound).
import * as THREE from 'three';
import { makePet, rbox } from './pets3d.js';
import { buildAvatar, AVATAR_HEIGHT } from './avatar3d.js';
import { play as sfx } from './sfx.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0 });

function addLights(scene) {
  scene.add(new THREE.HemisphereLight('#ffffff', '#FFD2C2', 1.7));
  const sun = new THREE.DirectionalLight('#FFF4E0', 2.3);
  sun.position.set(3, 6, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 });
  sun.shadow.radius = 4;
  scene.add(sun);
}

function makeMound(radius = 2.25) {
  const mound = new THREE.Group();
  const side = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + 0.2, 0.42, 64), mat('#5FBF88'));
  side.position.y = -0.21; side.receiveShadow = true; mound.add(side);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.02, 64), mat('#8EDDB0'));
  top.receiveShadow = true; mound.add(top);
  const cols = ['#FFD44F', '#EF3E5C', '#ffffff', '#A98BEA'];
  [[-1.6, 0.6], [1.7, 0.4], [-1.2, -0.9], [1.3, -1.1], [0.2, 1.3], [-0.3, -1.5]].forEach(([x, z], i) => {
    if (Math.hypot(x, z) > radius - 0.2) return;
    const f = rbox(0.12, 0.08, 0.12, cols[i % 4], 0.03); f.position.set(x, 0.05, z); mound.add(f);
  });
  return mound;
}

// Idle life for any pet: head tilt, tail wag, small breathing bob. Hop on tap.
function animatePet(pet, t, baseYaw, hop) {
  const { head, tail } = pet.userData;
  if (!reduceMotion) {
    if (head) head.rotation.z = Math.sin(t * 1.3) * 0.08;
    if (tail) tail.rotation.y = Math.sin(t * 2.2) * 0.35;
    pet.position.y = Math.abs(Math.sin(t * 2.2)) * 0.015;
  }
  if (hop.t >= 0) {
    const p = Math.min(hop.t / 0.55, 1);
    pet.position.y = Math.sin(p * Math.PI) * 0.45;
    pet.rotation.y = baseYaw + p * Math.PI * 2;
    if (p >= 1) { hop.t = -1; pet.rotation.y = baseYaw; }
  }
}

// mode: 'home' (avatar + buddy), 'viewer' (one pet, Pets tab), 'dress' (avatar alone, Shop).
export function createStage(container, { outfit = null, pet = null, mode = 'home', onReady } = {}) {
  const viewer = mode === 'viewer', dress = mode === 'dress';
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  const lookY = viewer ? 0.35 : dress ? 0.78 : 0.75;
  if (dress) camera.position.set(0, 1.6, 5.4);
  else camera.position.set(0, viewer ? 1.7 : 2.4, viewer ? 5.2 : 7.2);
  camera.lookAt(0, lookY, 0);
  // Tall held things (balloon, bubbles) poke out of the top, so step the camera back and up a little.
  const basePos = camera.position.clone();
  function frameFor(o) {
    const tall = o?.hold === 'balloon' || o?.hold === 'bubbles';
    camera.position.set(basePos.x, basePos.y + (tall ? 0.45 : 0), basePos.z * (tall ? 1.18 : 1));
    camera.lookAt(0, lookY + (tall ? 0.42 : 0), 0);
  }
  addLights(scene);
  scene.add(makeMound(viewer ? 1.5 : dress ? 1.35 : 2.25));

  // Pet slot
  const PET_YAW = viewer ? 0.5 : -0.7;
  let petObj = null;
  const hop = { t: -1 };
  function setPet(type) {
    if (petObj) scene.remove(petObj);
    petObj = null;
    if (!type) return;
    petObj = makePet(type);
    if (viewer) { petObj.position.set(0, 0, 0); petObj.scale.setScalar(1.25); }
    else { petObj.position.set(1.05, 0, 0.15); petObj.scale.setScalar(0.88); }
    petObj.rotation.y = PET_YAW;
    scene.add(petObj);
    renderer.render(scene, camera);
  }
  setPet(pet);

  // Avatar (Home and Shop)
  const AV_YAW = dress ? 0.35 : 0.32;
  let avatar = null, mixer = null, current = null, sitting = false, holding = false, token = 0, spin = 0;
  let actions = {};
  function play(name, once = false) {
    const next = actions[name];
    if (!next || next === current) return;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat);
    next.clampWhenFinished = once;
    next.fadeIn(0.2).play();
    if (current) current.fadeOut(0.2);
    current = next;
  }
  const idleName = () => (sitting ? 'wheelchair-sit' : holding ? 'holding-right' : 'idle');
  async function setOutfit(o) {
    const my = ++token;
    const av = await buildAvatar(o);
    if (my !== token) return;
    if (avatar) scene.remove(avatar);
    mixer?.stopAllAction();
    avatar = av.root;
    sitting = av.sitting;
    holding = av.holding;
    avatar.position.set(dress ? 0 : -0.72, 0, 0);
    avatar.rotation.y = AV_YAW + spin;
    if (!viewer) frameFor(o);
    scene.add(avatar);
    mixer = new THREE.AnimationMixer(av.model);
    actions = {}; current = null;
    av.animations.forEach((clip) => { actions[clip.name] = mixer.clipAction(clip); });
    mixer.addEventListener('finished', () => play(idleName()));
    play(idleName());
    mixer.update(0.4); // pose the first frame now; the loop may be paused in a background tab
    renderer.render(scene, camera);
    kick();
    onReady?.(snapshotHead());
  }
  if (outfit) setOutfit(outfit);

  // Small round headshot for the profile badge, rendered from the main scene.
  function snapshotHead() {
    try {
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setSize(128, 128); r.outputColorSpace = THREE.SRGBColorSpace;
      avatar.updateMatrixWorld(true);
      let headBone = null;
      avatar.traverse((o) => { if (o.name === 'head' && !o.isMesh) headBone = o; });
      const hgt = AVATAR_HEIGHT;
      const hp = new THREE.Vector3();
      if (headBone) headBone.getWorldPosition(hp); else new THREE.Box3().setFromObject(avatar).getCenter(hp);
      const headY = hp.y + hgt * 0.2;
      const c = new THREE.PerspectiveCamera(24, 1, 0.01, 100);
      const yaw = avatar.rotation.y;
      const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      c.position.set(hp.x + dir.x * hgt * 1.4, headY + hgt * 0.05, hp.z + dir.z * hgt * 1.4);
      c.lookAt(hp.x, headY, hp.z);
      if (petObj) petObj.visible = false;
      r.render(scene, c);
      if (petObj) petObj.visible = true;
      const url = r.domElement.toDataURL('image/png');
      r.dispose();
      return url;
    } catch { return null; }
  }

  // Taps: pet hops, avatar cheers or jumps (looks around when in a wheelchair).
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let downX = 0;
  renderer.domElement.addEventListener('pointerdown', (e) => { downX = e.clientX; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (Math.abs(e.clientX - downX) > 8) return; // a drag, not a tap
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    if (petObj && ray.intersectObject(petObj, true).length) { hop.t = 0; sfx('pet'); kick(); return; }
    if (avatar && ray.intersectObject(avatar, true).length) {
      sfx('avatar');
      if (sitting) play(Math.random() < 0.5 ? 'wheelchair-look-left' : 'wheelchair-look-right', true);
      else play(Math.random() < 0.5 ? 'emote-yes' : 'jump', true);
      kick();
    }
  });

  // Shop: drag sideways to turn the avatar.
  if (dress) {
    let dragX = null;
    renderer.domElement.addEventListener('pointerdown', (e) => { dragX = e.clientX; });
    renderer.domElement.addEventListener('pointermove', (e) => {
      if (dragX == null || !avatar) return;
      spin += (e.clientX - dragX) * 0.012; dragX = e.clientX;
      avatar.rotation.y = AV_YAW + spin; kick();
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => renderer.domElement.addEventListener(ev, () => { dragX = null; }));
    renderer.domElement.style.touchAction = 'pan-y';
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1.1 ? 32 : 26;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // Render only while visible on screen and the tab is in front.
  const clock = new THREE.Clock();
  let onScreen = true, t = 0, raf = 0;
  const shouldRun = () => onScreen && !document.hidden && container.offsetParent !== null;
  function loop() {
    raf = 0;
    if (!shouldRun()) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    mixer?.update(dt);
    if (hop.t >= 0) hop.t += dt;
    if (petObj) animatePet(petObj, t, PET_YAW, hop);
    if (viewer && petObj && hop.t < 0 && !reduceMotion) petObj.rotation.y = PET_YAW + Math.sin(t * 0.6) * 0.6;
    renderer.render(scene, camera);
  }
  function kick() { if (!raf && shouldRun()) { clock.getDelta(); loop(); } }
  new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; kick(); }).observe(container);
  document.addEventListener('visibilitychange', kick);
  kick();

  return { play, setPet, setOutfit, kick, hop: () => { hop.t = 0; kick(); } };
}

// One shared offscreen renderer for pet portraits (cards, hatch reveal).
let portraitRenderer = null;
const portraitCache = new Map();
export function petPortrait(type, size = 256) {
  const key = `${type}@${size}`;
  if (portraitCache.has(key)) return portraitCache.get(key);
  try {
    if (!portraitRenderer) {
      portraitRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      portraitRenderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    const r = portraitRenderer;
    r.setPixelRatio(1);
    r.setSize(size, size);
    const s = new THREE.Scene();
    addLights(s);
    const p = makePet(type);
    p.rotation.y = 0.55;
    s.add(p);
    const b = new THREE.Box3().setFromObject(p);
    const c = b.getCenter(new THREE.Vector3());
    const span = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
    cam.position.set(c.x, c.y + span * 0.55, c.z + span * 2.1);
    cam.lookAt(c);
    r.render(s, cam);
    const url = r.domElement.toDataURL('image/png');
    portraitCache.set(key, url);
    return url;
  } catch { return ''; }
}
