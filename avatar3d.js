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

export const DEFAULT_OUTFIT = { look: 'male-a', hat: null, eyes: null, hold: null, chair: null, hearing: false };
export const AVATAR_HEIGHT = 1.55;
// The fist, measured from the models: the centre of the hand end of the right arm, in the arm bone's own space.
// In the 'holding-right' pose the arm bone is turned 60 degrees, so the grip is turned back to face the front.
const HAND = { pos: [-0.255, 0, 0.07], rot: [0, -Math.PI / 3, 0] };
const HOLD_SCALE = 1.3;
// Small nudges from the fist for things that are held by the side, not by a stick (x right, y up, z front).
const HOLD_NUDGE = { football: [-0.04, -0.14, 0.06], teddy: [0, -0.06, 0.08], bottle: [0, -0.1, 0.02] };
// Things on a stick lean out to the side so they never cover the face.
const HOLD_TILT = { lollipop: 0.5, pinwheel: 0.5, racket: 0.5, bubbles: 0.45, balloon: 0.2 };
const HOLD_SIZE = { football: 0.8 };

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
  put(g, rbox(1.04, 0.26, 1.04, main, 0.12), 0, 0.1, 0);
  put(g, rbox(0.86, 0.06, 0.32, main, 0.03), 0, 0.01, 0.6);
  put(g, rbox(0.16, 0.06, 0.16, trim, 0.03), 0, 0.25, 0);
  put(g, rbox(0.44, 0.15, 0.05, trim, 0.04), 0, 0.12, 0.52);
  return g;
}
// ---------- Things to hold (right hand) ----------
// Drawn in "head units" like the hats: the grip is at the origin and the thing points up (+y), front is +z.
const cyl = (r, h, color, seg = 10) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat(color)); m.castShadow = true; return m; };
const ball = (r, color, seg = 16) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), mat(color, 0.45)); m.castShadow = true; return m; };
const ring = (r, t, color) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 24), mat(color, 0.4)); m.castShadow = true; return m; };
const HOLDS = {
  lollipop: () => {
    const g = new THREE.Group();
    put(g, cyl(0.035, 0.62, '#FFFFFF'), 0, 0.22, 0);
    put(g, cyl(0.26, 0.09, '#FF7FB0', 24), 0, 0.72, 0, Math.PI / 2, 0, 0);
    put(g, ring(0.17, 0.035, '#FFFFFF'), 0, 0.72, 0.05);
    put(g, ring(0.08, 0.03, '#FFD44F'), 0, 0.72, 0.05);
    return g;
  },
  balloon: () => {
    const g = new THREE.Group();
    put(g, cyl(0.012, 1.0, '#FFFFFF', 6), 0, 0.42, 0);
    const b = ball(0.3, '#EF3E5C', 20); b.scale.set(1, 1.18, 1); put(g, b, 0, 1.22, 0);
    put(g, rbox(0.08, 0.07, 0.08, '#C42A45', 0.02), 0, 0.88, 0);
    put(g, ball(0.06, '#FFFFFF', 8), -0.1, 1.36, 0.25);
    return g;
  },
  football: () => {
    const g = new THREE.Group();
    const R = 0.2;
    put(g, ball(R, '#FFFFFF', 28), 0, 0, 0);
    const ico = new THREE.IcosahedronGeometry(1, 0).getAttribute('position');
    const seen = [];
    for (let k = 0; k < ico.count; k++) {
      const d = new THREE.Vector3().fromBufferAttribute(ico, k).normalize();
      if (seen.some((v) => v.distanceTo(d) < 0.01)) continue;
      seen.push(d);
      const patch = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.016, 5), mat('#2B2B33', 0.5));
      patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      patch.position.copy(d).multiplyScalar(R - 0.002);
      g.add(patch);
    }
    return g;
  },
  teddy: () => {
    const g = new THREE.Group();
    const fur = '#C98B5A', light = '#F1D2B0', dark = '#2B1710';
    put(g, rbox(0.26, 0.26, 0.2, fur, 0.09), 0, -0.04, 0);                 // body
    put(g, rbox(0.15, 0.13, 0.04, light, 0.04), 0, -0.05, 0.1);            // tummy
    put(g, rbox(0.3, 0.26, 0.24, fur, 0.1), 0, 0.22, 0);                   // head
    [-0.12, 0.12].forEach((x) => {
      put(g, rbox(0.1, 0.1, 0.07, fur, 0.04), x, 0.36, 0);                // ears
      put(g, rbox(0.05, 0.05, 0.02, light, 0.02), x, 0.36, 0.04);
      put(g, rbox(0.09, 0.16, 0.09, fur, 0.04), x * 1.45, 0.0, 0.02, 0, 0, x > 0 ? 0.5 : -0.5); // arms
      put(g, rbox(0.1, 0.12, 0.13, fur, 0.04), x * 0.75, -0.2, 0.05);     // legs
      put(g, rbox(0.07, 0.07, 0.02, light, 0.02), x * 0.75, -0.21, 0.12); // paw pads
    });
    put(g, rbox(0.14, 0.09, 0.06, light, 0.03), 0, 0.17, 0.12);            // muzzle
    put(g, rbox(0.05, 0.035, 0.03, dark, 0.01), 0, 0.2, 0.155);            // nose
    [-0.07, 0.07].forEach((x) => put(g, rbox(0.04, 0.04, 0.02, dark, 0.01), x, 0.26, 0.12)); // eyes
    put(g, rbox(0.2, 0.05, 0.2, '#D42A45', 0.02), 0, 0.09, 0.01);          // bow ribbon
    put(g, rbox(0.1, 0.07, 0.04, '#D42A45', 0.02), 0, 0.09, 0.12);
    return g;
  },
  pinwheel: () => {
    const g = new THREE.Group();
    put(g, cyl(0.03, 0.8, '#7FD8A6'), 0, 0.3, 0);
    const head = new THREE.Group(); head.position.set(0, 0.74, 0.05); head.name = 'spin'; g.add(head);
    ['#EF3E5C', '#FFD44F', '#5D7FE0', '#7FD8A6'].forEach((c, i) => {
      const blade = new THREE.Group(); blade.rotation.z = (i / 4) * Math.PI * 2; head.add(blade);
      put(blade, rbox(0.12, 0.26, 0.02, c, 0.01), 0.06, 0.14, 0, 0, 0, -0.35);
    });
    put(head, ball(0.045, '#FFFFFF', 8), 0, 0, 0.02);
    return g;
  },
  bottle: () => {
    const g = new THREE.Group();
    put(g, rbox(0.2, 0.44, 0.2, '#8FD3F4', 0.07), 0, 0.12, 0.04);
    put(g, rbox(0.21, 0.1, 0.21, '#FFFFFF', 0.03), 0, 0.06, 0.04);
    put(g, rbox(0.13, 0.09, 0.13, '#3FA874', 0.03), 0, 0.38, 0.04);
    return g;
  },
  racket: () => {
    const g = new THREE.Group();
    put(g, cyl(0.04, 0.34, '#3B3B48'), 0, 0.06, 0);
    put(g, cyl(0.018, 0.22, '#C1C1D8'), 0, 0.33, 0);
    const frame = ring(0.18, 0.025, '#D42A45'); frame.scale.set(1, 1.25, 1); put(g, frame, 0, 0.66, 0);
    const net = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), new THREE.MeshStandardMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    net.scale.set(1, 1.25, 1); put(g, net, 0, 0.66, 0);
    return g;
  },
  bubbles: () => {
    const g = new THREE.Group();
    put(g, cyl(0.03, 0.56, '#A98BEA'), 0, 0.2, 0);
    put(g, ring(0.12, 0.03, '#A98BEA'), 0, 0.6, 0);
    const soap = (r) => new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), new THREE.MeshStandardMaterial({ color: '#C6EBFB', transparent: true, opacity: 0.45, roughness: 0.1 }));
    [[0.22, 0.9, 0.1, 0.1], [-0.12, 1.08, 0.05, 0.07], [0.08, 1.24, -0.04, 0.05]].forEach(([x, y, z, r]) => put(g, soap(r), x, y, z));
    return g;
  },
};
export function makeHold(id) {
  const g = HOLDS[id]?.();
  g?.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g || null;
}

// ---------- More avatars: recoloured versions of each look ----------
// "male-a.2" = male-a with new clothes colours and another skin tone, made by repainting the shared colour texture.
export const VARIANTS = { 2: { hue: 140, skin: '#EFBA94' }, 3: { hue: 230, skin: '#C99068' } };
const hsv = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h * 60) + 360) % 360, mx ? d / mx : 0, mx / 255];
};
const isSkin = ([h, s, v]) => h >= 8 && h <= 34 && s >= 0.22 && s <= 0.68 && v >= 0.4 && v <= 0.98;
function hueRotate(r, g, b, deg) {
  const [h, s, v] = hsv(r, g, b);
  const nh = (h + deg) % 360, c = v * s, x = c * (1 - Math.abs(((nh / 60) % 2) - 1)), m = v - c;
  const [r1, g1, b1] = nh < 60 ? [c, x, 0] : nh < 120 ? [x, c, 0] : nh < 180 ? [0, c, x] : nh < 240 ? [0, x, c] : nh < 300 ? [x, 0, c] : [c, 0, x];
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255].map(Math.round);
}
const variantTex = new Map();
function recolour(model, look, spec) {
  let map = null;
  model.traverse((m) => { if (m.isMesh && m.material?.map) map ||= m.material.map; });
  if (!map?.image) return;
  let tex = variantTex.get(look);
  if (!tex) {
    const img = map.image, W = img.width, H = img.height;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    const data = cx.getImageData(0, 0, W, H), px = data.data;
    // Which texture colours this character uses, and its skin colour (most common skin-like colour on the head).
    const used = new Set(), headSkin = new Map();
    model.traverse((m) => {
      const uv = m.isMesh && m.geometry.attributes.uv;
      if (!uv) return;
      for (let i = 0; i < uv.count; i++) {
        const x = Math.min(W - 1, Math.floor(uv.getX(i) * W));
        const y = Math.min(H - 1, Math.floor((map.flipY ? 1 - uv.getY(i) : uv.getY(i)) * H));
        const k = (y * W + x) * 4, key = (px[k] << 16) | (px[k + 1] << 8) | px[k + 2];
        used.add(key);
        if (m.name === 'head-mesh' && isSkin(hsv(px[k], px[k + 1], px[k + 2]))) headSkin.set(key, (headSkin.get(key) || 0) + 1);
      }
    });
    // Of the two commonest skin-like colours on the head, the brighter one is the face (the darker may be hair).
    const top2 = [...headSkin].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
    const val = (k) => Math.max((k >> 16) & 255, (k >> 8) & 255, k & 255);
    const base = top2.sort((a, b) => val(b) - val(a))[0];
    const bc = base == null ? null : [(base >> 16) & 255, (base >> 8) & 255, base & 255];
    const bh = bc && hsv(...bc);
    // Skin = close to the face colour in hue and brightness (so hair and beards keep their own colour).
    const nearFace = (h) => bh && isSkin(h) && Math.abs(h[0] - bh[0]) <= 12 && Math.abs(h[2] - bh[2]) <= 0.25;
    const hairBrown = (h) => h[0] >= 5 && h[0] <= 40 && h[2] < 0.62;
    const tc = new THREE.Color(spec.skin);
    const target = [tc.r * 255, tc.g * 255, tc.b * 255];
    const memo = new Map();
    for (let k = 0; k < px.length; k += 4) {
      const key = (px[k] << 16) | (px[k + 1] << 8) | px[k + 2];
      let out = memo.get(key);
      if (!out) {
        const c = [px[k], px[k + 1], px[k + 2]], h = hsv(...c);
        if (nearFace(h)) out = c.map((v, i) => Math.max(0, Math.min(255, Math.round(v * target[i] / Math.max(bc[i], 1)))));
        else if (h[1] > 0.25 && !hairBrown(h) && !isSkin(h)) out = hueRotate(...c, spec.hue);
        else out = c;
        memo.set(key, out);
      }
      px[k] = out[0]; px[k + 1] = out[1]; px[k + 2] = out[2];
    }
    cx.putImageData(data, 0, 0);
    tex = new THREE.CanvasTexture(cv);
    ['flipY', 'colorSpace', 'magFilter', 'minFilter', 'wrapS', 'wrapT', 'generateMipmaps', 'anisotropy'].forEach((p) => { tex[p] = map[p]; });
    tex.needsUpdate = true;
    variantTex.set(look, tex);
  }
  model.traverse((m) => { if (m.isMesh && m.material?.map) { m.material = m.material.clone(); m.material.map = tex; } });
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
  // Lengths are measured in the head bone's own units (the bone is scaled, so model-space sizes come out wrong).
  const len = (a, b) => toLocal(a).distanceTo(toLocal(b));
  const at = (x, y, z) => new THREE.Vector3(x, y, z);
  return {
    top: toLocal(at(c.x, box.max.y, c.z)),
    center: toLocal(c),
    front: len(c, at(c.x, c.y, box.max.z)),
    width: len(at(box.min.x, c.y, c.z), at(box.max.x, c.y, c.z)),
    height: len(at(c.x, box.min.y, c.z), at(c.x, box.max.y, c.z)),
    side: len(c, at(box.max.x, c.y, c.z)),
  };
}

// Builds { root, model, animations, sitting }. root stands on y = 0 and is AVATAR_HEIGHT tall.
export async function buildAvatar(outfit = DEFAULT_OUTFIT) {
  const o = { ...DEFAULT_OUTFIT, ...outfit };
  const [baseLook, variant] = String(o.look).split('.');
  const gltf = await loadGLB(`character-${baseLook}.glb`);
  const model = cloneSkinned(gltf.scene);
  if (VARIANTS[variant]) recolour(model, o.look, VARIANTS[variant]);
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
        hat.scale.setScalar(hm.width * 1.0);
        hat.position.copy(hm.top).add(new THREE.Vector3(0, -hm.height * 0.12, 0));
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
  if (o.hold) {
    let arm = null;
    model.traverse((m) => { if (m.name === 'arm-right' && !m.isMesh) arm = m; });
    const thing = makeHold(o.hold);
    if (arm && thing) {
      const unit = head ? measureHead(model, head).width : 0.45;
      const grip = new THREE.Group();
      grip.position.set(...HAND.pos);
      grip.rotation.set(...HAND.rot);
      grip.name = 'hold';
      thing.scale.setScalar(unit * HOLD_SCALE * (HOLD_SIZE[o.hold] || 1));
      thing.position.set(...(HOLD_NUDGE[o.hold] || [0, 0, 0]));
      thing.rotation.z = HOLD_TILT[o.hold] || 0;
      grip.add(thing);
      arm.add(grip);
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
  return { root, model, animations: gltf.animations, sitting, holding: !!o.hold };
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
export function snapshot(object, { size = 192, yaw = 0.5, pad = 2.1, lift = 0.45, focus = null, box = null } = {}) {
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
    if (box) b.copy(box);
    else (Array.isArray(focus) ? focus : [focus || holder]).forEach((f) => b.union(new THREE.Box3().setFromObject(f)));
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
    const clip = av.animations.find((a) => a.name === (av.sitting ? 'wheelchair-sit' : av.holding ? 'holding-right' : 'idle'));
    if (clip) { mixer.clipAction(clip).play(); mixer.update(0.4); }
    let focus = null;
    if (head) {
      av.root.updateMatrixWorld(true);
      focus = [];
      av.model.traverse((m) => { if (m.name === 'head-mesh' || m.name === 'hat') focus.push(m); });
    }
    const top = AVATAR_HEIGHT + (outfit.hat ? 0.4 : 0.2) + (outfit.hold === 'balloon' ? 1.15 : outfit.hold === 'bubbles' ? 0.7 : outfit.hold ? 0.35 : 0);
    const box = new THREE.Box3(new THREE.Vector3(-0.7, 0, -0.5), new THREE.Vector3(0.7, top, 0.5));
    return snapshot(av.root, head ? { size, yaw: 0.25, pad: 1.9, lift: 0.1, focus } : { size, yaw: 0.45, pad: 1.9, lift: 0.18, box });
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
    else if (kind === 'hold') obj = makeHold(id);
    else if (kind === 'eyes') obj = (await loadGLB(`aid-${id}.glb`)).scene.clone();
    else obj = (await loadGLB(id === 'hearing' ? 'aid_hearing.glb' : `${id}.glb`)).scene.clone();
    return snapshot(obj, { size, yaw: kind === 'hat' ? 0.5 : 0.6, pad: 1.9, lift: 0.5 });
  })();
  shotCache.set(key, p);
  return p;
}
