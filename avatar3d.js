// The kid's 3D avatar: a Kenney Mini Character (CC0) plus things worn from the Shop.
// Hats are built in code in the same chunky style; glasses, hearing aid and wheelchairs are Kenney models.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { rbox } from './pets3d.js';

const BASE = 'assets/avatar/';
const loader = new GLTFLoader();
const cache = new Map();
export function loadGLB(file) {
  if (!cache.has(file)) cache.set(file, new Promise((res, rej) => loader.load(BASE + file, res, undefined, rej)));
  return cache.get(file);
}

export const DEFAULT_OUTFIT = { look: 'male-a', hat: null, eyes: null, chair: null, hearing: false };
export const AVATAR_HEIGHT = 1.55;

const mat = (color, rough = 0.6) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
const put = (parent, mesh, x, y, z, rx = 0, ry = 0, rz = 0) => {
  mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); parent.add(mesh); return mesh;
};

// Hats are drawn in "head units": the head is 1 wide, the hat sits on y = 0 (top of the head), front is +z.
const HATS = {
  'cap-berry': () => cap('#D42A45', '#FFFFFF'),
  'cap-sky': () => cap('#5D7FE0', '#FFD44F'),
  bucket: () => {
    const g = new THREE.Group();
    put(g, rbox(1.36, 0.1, 1.36, '#FFD44F', 0.05), 0, 0.02, 0);
    put(g, rbox(0.98, 0.34, 0.98, '#FFD44F', 0.1), 0, 0.2, 0);
    put(g, rbox(1.0, 0.09, 1.0, '#FF9F45', 0.03), 0, 0.1, 0);
    return g;
  },
  strawberry: () => {
    const g = new THREE.Group();
    put(g, rbox(1.06, 0.42, 1.06, '#EF3E5C', 0.16), 0, 0.17, 0);
    put(g, rbox(0.84, 0.18, 0.84, '#EF3E5C', 0.08), 0, 0.42, 0);
    const seed = '#FFE07A';
    [[-0.3, 0.2], [0.05, 0.28], [0.32, 0.16], [-0.12, 0.08], [0.22, 0.34]].forEach(([x, y]) => put(g, rbox(0.07, 0.07, 0.04, seed, 0.02), x, y, 0.54));
    [[-0.54, 0.2, 0.2], [0.54, 0.24, -0.15]].forEach(([x, y, z]) => put(g, rbox(0.04, 0.07, 0.07, seed, 0.02), x, y, z));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      put(g, rbox(0.34, 0.08, 0.16, '#5CC489', 0.04), Math.sin(a) * 0.22, 0.53, Math.cos(a) * 0.22, 0, a + Math.PI / 2, 0.25);
    }
    put(g, rbox(0.08, 0.22, 0.08, '#3FA874', 0.03), 0, 0.64, 0);
    return g;
  },
  ears: () => {
    const g = new THREE.Group();
    put(g, rbox(1.04, 0.1, 0.16, '#8A5A3C', 0.04), 0, 0.03, 0);
    [-0.36, 0.36].forEach((x) => {
      put(g, rbox(0.3, 0.26, 0.14, '#8A5A3C', 0.08), x, 0.18, 0);
      put(g, rbox(0.17, 0.14, 0.05, '#E9B48F', 0.04), x, 0.17, 0.07);
    });
    return g;
  },
  party: () => {
    const g = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.8, 4, 1), mat('#A98BEA'));
    cone.rotation.y = Math.PI / 4; cone.castShadow = true;
    put(g, cone, 0.06, 0.4, 0, 0, 0, -0.12);
    put(g, rbox(0.16, 0.16, 0.16, '#FFD44F', 0.06), 0.15, 0.83, 0);
    [[0.12, 0.2], [-0.06, 0.42]].forEach(([y, s]) => put(g, rbox(0.44 - y * 0.6, 0.07, 0.44 - y * 0.6, '#FFFFFF', 0.03), 0.06 + s * 0.05, y + 0.06, 0, 0, Math.PI / 4, -0.12));
    return g;
  },
  crown: () => {
    const g = new THREE.Group();
    put(g, rbox(1.02, 0.1, 1.02, '#5FBF88', 0.04), 0, 0.03, 0);
    const cols = ['#FFFFFF', '#FFD44F', '#EF3E5C', '#A98BEA', '#FFFFFF', '#FF9F45', '#FFD44F', '#EF3E5C'];
    cols.forEach((c, i) => {
      const a = (i / cols.length) * Math.PI * 2;
      const x = Math.sin(a) * 0.5, z = Math.cos(a) * 0.5;
      put(g, rbox(0.2, 0.2, 0.08, c, 0.07), x, 0.12, z, 0, a, 0.6);
      put(g, rbox(0.07, 0.07, 0.1, '#FFD44F', 0.03), x * 1.02, 0.12, z * 1.02, 0, a, 0);
    });
    return g;
  },
};
function cap(main, trim) {
  const g = new THREE.Group();
  put(g, rbox(1.04, 0.3, 1.04, main, 0.12), 0, 0.12, 0);
  put(g, rbox(0.92, 0.07, 0.5, main, 0.03), 0, 0.02, 0.64);
  put(g, rbox(0.16, 0.06, 0.16, trim, 0.03), 0, 0.29, 0);
  put(g, rbox(0.5, 0.18, 0.05, trim, 0.04), 0, 0.14, 0.52);
  return g;
}
export function makeHat(id) {
  const g = HATS[id]?.();
  g?.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g || null;
}

// Head measurements in the head bone's own space, found once per character.
function measureHead(model, head) {
  model.updateMatrixWorld(true);
  let headMesh = null;
  model.traverse((o) => { if (o.name === 'head-mesh') headMesh = o; });
  const box = new THREE.Box3();
  if (headMesh) {
    headMesh.geometry.computeBoundingBox();
    // The head mesh is skinned to the head bone, so its bind box is in model space.
    box.copy(headMesh.geometry.boundingBox).applyMatrix4(headMesh.matrixWorld);
  } else box.setFromObject(model);
  const toLocal = (v) => head.worldToLocal(v.clone());
  const c = box.getCenter(new THREE.Vector3());
  return {
    top: toLocal(new THREE.Vector3(c.x, box.max.y, c.z)),
    center: toLocal(c),
    front: box.max.z - c.z,
    width: box.max.x - box.min.x,
    height: box.max.y - box.min.y,
    side: box.max.x - c.x,
  };
}

// Builds { root, model, animations, sitting }. root stands on y = 0 and is AVATAR_HEIGHT tall.
export async function buildAvatar(outfit = DEFAULT_OUTFIT) {
  const o = { ...DEFAULT_OUTFIT, ...outfit };
  const gltf = await loadGLB(`character-${o.look}.glb`);
  const model = cloneSkinned(gltf.scene);
  model.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  const root = new THREE.Group();
  root.add(model);

  const box = new THREE.Box3().setFromObject(model);
  const scale = AVATAR_HEIGHT / (box.max.y - box.min.y);
  model.position.y = -box.min.y;

  let head = null;
  model.traverse((m) => { if (m.name === 'head' && !m.isMesh) head = m; });
  if (head) {
    const hm = measureHead(model, head);
    if (o.hat) {
      const hat = makeHat(o.hat);
      if (hat) {
        hat.scale.setScalar(hm.width * 1.1);
        hat.position.copy(hm.top).add(new THREE.Vector3(0, -hm.height * 0.3, 0));
        hat.name = 'hat';
        head.add(hat);
      }
    }
    if (o.eyes) {
      const g = (await loadGLB(`aid-${o.eyes}.glb`)).scene.clone();
      g.position.set(hm.center.x, hm.center.y - hm.height * 0.2, hm.center.z + hm.front - 0.09);
      head.add(g);
    }
    if (o.hearing) {
      const g = (await loadGLB('aid_hearing.glb')).scene.clone();
      g.position.set(hm.center.x + hm.side, hm.center.y - hm.height * 0.25, hm.center.z);
      head.add(g);
    }
  }
  let sitting = false;
  if (o.chair) {
    const chair = (await loadGLB(`${o.chair}.glb`)).scene.clone();
    chair.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    chair.position.y = 0;
    root.add(chair);
    sitting = true;
  }
  root.scale.setScalar(scale);
  return { root, model, animations: gltf.animations, sitting };
}

// One shared offscreen renderer for still pictures (shop cards, ranks, friends).
let shotRenderer = null;
const shotCache = new Map();
function lightUp(scene) {
  scene.add(new THREE.HemisphereLight('#ffffff', '#FFD2C2', 1.8));
  const sun = new THREE.DirectionalLight('#FFF4E0', 2.2);
  sun.position.set(3, 6, 4);
  scene.add(sun);
}
export function snapshot(object, { size = 192, yaw = 0.5, pad = 2.1, lift = 0.45, focus = null } = {}) {
  try {
    if (!shotRenderer) {
      shotRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      shotRenderer.outputColorSpace = THREE.SRGBColorSpace;
      shotRenderer.setPixelRatio(1);
    }
    shotRenderer.setSize(size, size);
    const s = new THREE.Scene();
    lightUp(s);
    const holder = new THREE.Group();
    holder.add(object);
    holder.rotation.y = yaw;
    s.add(holder);
    s.updateMatrixWorld(true);
    const b = new THREE.Box3();
    (Array.isArray(focus) ? focus : [focus || holder]).forEach((f) => b.union(new THREE.Box3().setFromObject(f)));
    const c = b.getCenter(new THREE.Vector3());
    const span = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
    cam.position.set(c.x, c.y + span * lift, c.z + span * pad);
    cam.lookAt(c);
    shotRenderer.render(s, cam);
    return shotRenderer.domElement.toDataURL('image/png');
  } catch { return ''; }
}

// Picture of a whole look (or a head-and-shoulders crop), cached.
export async function avatarPicture(outfit, { size = 192, head = false } = {}) {
  const key = JSON.stringify([outfit, size, head]);
  if (shotCache.has(key)) return shotCache.get(key);
  const p = (async () => {
    const av = await buildAvatar(outfit);
    const mixer = new THREE.AnimationMixer(av.model);
    const clip = av.animations.find((a) => a.name === (av.sitting ? 'wheelchair-sit' : 'idle'));
    if (clip) { mixer.clipAction(clip).play(); mixer.update(0.4); }
    let focus = null;
    if (head) {
      av.root.updateMatrixWorld(true);
      focus = [];
      av.model.traverse((m) => { if (m.name === 'head-mesh' || m.name === 'hat') focus.push(m); });
    }
    return snapshot(av.root, head ? { size, yaw: 0.25, pad: 1.9, lift: 0.1, focus } : { size, yaw: 0.45, pad: 1.75, lift: 0.25 });
  })();
  shotCache.set(key, p);
  return p;
}

export async function itemPicture(kind, id, size = 160) {
  const key = `${kind}:${id}@${size}`;
  if (shotCache.has(key)) return shotCache.get(key);
  const p = (async () => {
    let obj;
    if (kind === 'hat') obj = makeHat(id);
    else if (kind === 'eyes') obj = (await loadGLB(`aid-${id}.glb`)).scene.clone();
    else obj = (await loadGLB(id === 'hearing' ? 'aid_hearing.glb' : `${id}.glb`)).scene.clone();
    return snapshot(obj, { size, yaw: kind === 'hat' ? 0.5 : 0.6, pad: 1.9, lift: 0.5 });
  })();
  shotCache.set(key, p);
  return p;
}
