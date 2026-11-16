// Blocky 3D pets built in code, in the same chunky style as the Kenney avatars.
// Every pet faces +z, stands on y = 0 and is roughly 1 unit long.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const geoCache = new Map();
function mat(color, rough = 0.65) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
}
export function rbox(w, h, d, color, r = 0.06) {
  const key = `${w}|${h}|${d}|${r}`;
  if (!geoCache.has(key)) geoCache.set(key, new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)));
  const m = new THREE.Mesh(geoCache.get(key), mat(color));
  m.castShadow = true;
  return m;
}
const put = (parent, mesh, x, y, z, rx = 0, ry = 0, rz = 0) => {
  mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); parent.add(mesh); return mesh;
};
const INK = '#2B1710';

// Two eyes with white glints on a head group, facing +z at depth z.
function eyes(head, x, y, z, size = 0.07) {
  for (const s of [-1, 1]) {
    put(head, rbox(size, size * 1.2, 0.03, INK, 0.015), x * s, y, z);
    put(head, rbox(size * 0.35, size * 0.35, 0.01, '#ffffff', 0.004), x * s + size * 0.2, y + size * 0.3, z + 0.017).userData.keepColor = true;
  }
}
function cheeks(head, x, y, z) {
  for (const s of [-1, 1]) put(head, rbox(0.06, 0.035, 0.02, '#F59A9A', 0.01), x * s, y, z);
}

function otter() {
  const brown = '#7E5236', dark = '#5E3A24', cream = '#EED3B0';
  const g = new THREE.Group();
  put(g, rbox(0.5, 0.38, 1.0, brown, 0.14), 0, 0.27, 0);
  put(g, rbox(0.36, 0.26, 0.05, cream, 0.03), 0, 0.3, 0.5);
  const head = new THREE.Group(); head.position.set(0, 0.5, 0.55); g.add(head);
  head.add(rbox(0.5, 0.34, 0.42, brown, 0.12));
  put(head, rbox(0.38, 0.17, 0.14, cream, 0.06), 0, -0.07, 0.22);
  put(head, rbox(0.13, 0.07, 0.05, INK, 0.02), 0, -0.01, 0.3);
  eyes(head, 0.12, 0.07, 0.215, 0.065);
  cheeks(head, 0.19, -0.03, 0.215);
  for (const s of [-1, 1]) {
    put(head, rbox(0.07, 0.06, 0.05, dark, 0.02), 0.22 * s, 0.15, -0.06);
    for (const k of [0, 1]) put(head, rbox(0.16, 0.012, 0.012, '#FFF8EE', 0.004), 0.25 * s, -0.06 - k * 0.04, 0.27, 0, 0, (k ? -0.12 : 0.12) * s);
    put(g, rbox(0.13, 0.12, 0.15, dark, 0.04), 0.17 * s, 0.06, 0.38);
    put(g, rbox(0.15, 0.1, 0.2, dark, 0.04), 0.18 * s, 0.05, -0.34);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.18, -0.5); g.add(tail);
  put(tail, rbox(0.24, 0.18, 0.34, brown, 0.07), 0, 0, -0.14);
  put(tail, rbox(0.16, 0.12, 0.3, dark, 0.05), 0, -0.04, -0.42);
  g.userData = { head, tail };
  return g;
}

function kingfisher() {
  const blue = '#2F7FD8', brown = '#7A3B22', white = '#FFFFFF', red = '#E2342F';
  const g = new THREE.Group();
  put(g, rbox(0.42, 0.44, 0.52, blue, 0.14), 0, 0.42, -0.02);
  put(g, rbox(0.3, 0.3, 0.06, white, 0.04), 0, 0.46, 0.24);
  const head = new THREE.Group(); head.position.set(0, 0.8, 0.06); g.add(head);
  head.add(rbox(0.4, 0.36, 0.38, brown, 0.12));
  put(head, rbox(0.3, 0.14, 0.05, white, 0.03), 0, -0.14, 0.18);
  put(head, rbox(0.1, 0.09, 0.42, red, 0.03), 0, -0.04, 0.36);
  eyes(head, 0.12, 0.05, 0.19, 0.06);
  for (const s of [-1, 1]) {
    put(g, rbox(0.06, 0.3, 0.4, '#1F5FB0', 0.03), 0.23 * s, 0.44, -0.06);
    put(g, rbox(0.05, 0.16, 0.05, red, 0.02), 0.09 * s, 0.1, 0.02);
    put(g, rbox(0.08, 0.03, 0.12, red, 0.01), 0.09 * s, 0.02, 0.05);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.3, -0.3); g.add(tail);
  put(tail, rbox(0.2, 0.06, 0.3, '#3FA0E8', 0.03), 0, 0, -0.1, 0.5);
  g.userData = { head, tail };
  return g;
}

function monitor() {
  const olive = '#56633E', dark = '#3E4A2C', spot = '#E8D36A', belly = '#B9B88A';
  const g = new THREE.Group();
  put(g, rbox(0.42, 0.24, 0.62, olive, 0.1), 0, 0.2, 0);
  put(g, rbox(0.3, 0.06, 0.5, belly, 0.03), 0, 0.09, 0);
  [[-0.1, 0.15], [0.12, -0.05], [-0.08, -0.2], [0.1, 0.22], [0, 0.02]].forEach(([x, z]) => put(g, rbox(0.07, 0.03, 0.07, spot, 0.012), x, 0.325, z));
  const head = new THREE.Group(); head.position.set(0, 0.24, 0.4); g.add(head);
  head.add(rbox(0.28, 0.18, 0.3, olive, 0.07));
  put(head, rbox(0.2, 0.12, 0.18, olive, 0.05), 0, -0.02, 0.2);
  eyes(head, 0.1, 0.05, 0.155, 0.055);
  put(head, rbox(0.03, 0.015, 0.1, '#E2557A', 0.006), 0, -0.05, 0.33);
  for (const s of [-1, 1]) {
    put(g, rbox(0.12, 0.08, 0.12, dark, 0.03), 0.27 * s, 0.06, 0.2, 0, 0.3 * s);
    put(g, rbox(0.12, 0.08, 0.12, dark, 0.03), 0.27 * s, 0.06, -0.2, 0, -0.3 * s);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.18, -0.3); g.add(tail);
  put(tail, rbox(0.22, 0.16, 0.3, olive, 0.06), 0, 0, -0.12);
  put(tail, rbox(0.15, 0.12, 0.3, dark, 0.05), 0, -0.02, -0.38);
  put(tail, rbox(0.09, 0.08, 0.26, olive, 0.03), 0, -0.04, -0.62);
  g.userData = { head, tail };
  return g;
}

function hornbill() {
  const black = '#26262B', white = '#F4F4F4', bill = '#F2D16B';
  const g = new THREE.Group();
  put(g, rbox(0.42, 0.46, 0.5, black, 0.14), 0, 0.42, -0.04);
  put(g, rbox(0.32, 0.26, 0.06, white, 0.04), 0, 0.34, 0.22);
  const head = new THREE.Group(); head.position.set(0, 0.82, 0.06); g.add(head);
  head.add(rbox(0.36, 0.34, 0.34, black, 0.11));
  put(head, rbox(0.12, 0.13, 0.4, bill, 0.04), 0, -0.04, 0.33, 0.15);
  put(head, rbox(0.1, 0.1, 0.28, bill, 0.04), 0, 0.08, 0.26);
  put(head, rbox(0.06, 0.05, 0.08, black, 0.015), 0, 0.09, 0.4);
  for (const s of [-1, 1]) {
    put(head, rbox(0.1, 0.1, 0.02, white, 0.02), 0.11 * s, 0.04, 0.17);
    put(head, rbox(0.05, 0.06, 0.03, INK, 0.012), 0.11 * s, 0.04, 0.18);
    put(g, rbox(0.06, 0.32, 0.38, black, 0.03), 0.23 * s, 0.44, -0.08);
    put(g, rbox(0.05, 0.14, 0.05, '#4A4A50', 0.02), 0.09 * s, 0.1, 0);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.35, -0.3); g.add(tail);
  put(tail, rbox(0.22, 0.06, 0.42, black, 0.03), 0, 0, -0.16, 0.45);
  put(tail, rbox(0.22, 0.065, 0.1, white, 0.03), 0, -0.17, -0.36, 0.45);
  g.userData = { head, tail };
  return g;
}

function pangolin() {
  const scale = '#9A6A43', scaleDark = '#7A5032', skin = '#C79A78';
  const g = new THREE.Group();
  put(g, rbox(0.4, 0.24, 0.6, skin, 0.1), 0, 0.2, 0);
  // Pinecone-like scale plates over an arched back: rows of 3, every other row offset.
  for (let i = 0; i < 5; i++) {
    const z = 0.26 - i * 0.13, arch = Math.sin((i + 0.5) / 5 * Math.PI);
    const y = 0.3 + arch * 0.12;
    const xs = i % 2 ? [-0.1, 0.1] : [-0.17, 0, 0.17];
    xs.forEach((x, k) => {
      const plate = put(g, rbox(0.17, 0.07, 0.16, (i + k) % 2 ? scaleDark : scale, 0.03), x, y - Math.abs(x) * 0.35, z, -0.35, 0, -x * 1.6);
      plate.scale.setScalar(1 - Math.abs(x) * 0.6);
    });
  }
  const head = new THREE.Group(); head.position.set(0, 0.26, 0.36); g.add(head);
  head.add(rbox(0.24, 0.2, 0.24, skin, 0.08));
  put(head, rbox(0.12, 0.1, 0.18, skin, 0.04), 0, -0.04, 0.17);
  put(head, rbox(0.06, 0.04, 0.03, INK, 0.012), 0, -0.03, 0.27);
  eyes(head, 0.07, 0.04, 0.125, 0.045);
  put(head, rbox(0.2, 0.09, 0.14, scale, 0.04), 0, 0.12, -0.02, -0.2);
  for (const s of [-1, 1]) {
    put(g, rbox(0.09, 0.1, 0.1, skin, 0.03), 0.16 * s, 0.05, 0.18);
    put(g, rbox(0.09, 0.1, 0.1, skin, 0.03), 0.16 * s, 0.05, -0.18);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.22, -0.32); g.add(tail);
  put(tail, rbox(0.3, 0.12, 0.2, scale, 0.05), 0, 0, -0.08, 0.35);
  put(tail, rbox(0.22, 0.1, 0.2, scaleDark, 0.04), 0, -0.07, -0.25, 0.35);
  put(tail, rbox(0.14, 0.08, 0.18, scale, 0.03), 0, -0.13, -0.4, 0.35);
  g.userData = { head, tail };
  return g;
}

function mousedeer() {
  const fur = '#A86A3F', dark = '#7A4A2A', white = '#F6EBDD';
  const g = new THREE.Group();
  put(g, rbox(0.34, 0.3, 0.56, fur, 0.12), 0, 0.42, 0);
  put(g, rbox(0.22, 0.14, 0.05, white, 0.03), 0, 0.42, 0.28);
  const head = new THREE.Group(); head.position.set(0, 0.68, 0.3); g.add(head);
  head.add(rbox(0.3, 0.28, 0.28, fur, 0.1));
  put(head, rbox(0.16, 0.12, 0.16, fur, 0.05), 0, -0.07, 0.17);
  put(head, rbox(0.07, 0.05, 0.03, INK, 0.012), 0, -0.05, 0.26);
  eyes(head, 0.09, 0.03, 0.145, 0.08);
  cheeks(head, 0.12, -0.06, 0.145);
  for (const s of [-1, 1]) {
    put(head, rbox(0.08, 0.09, 0.04, dark, 0.02), 0.15 * s, 0.15, -0.04, 0, 0, -0.7 * s);
    put(g, rbox(0.06, 0.32, 0.06, dark, 0.02), 0.11 * s, 0.16, 0.17);
    put(g, rbox(0.06, 0.32, 0.06, dark, 0.02), 0.11 * s, 0.16, -0.17);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.5, -0.28); g.add(tail);
  put(tail, rbox(0.08, 0.08, 0.06, white, 0.03), 0, 0, -0.02);
  g.userData = { head, tail };
  return g;
}

function turtle() {
  const shell = '#B5722E', patch = '#6B3A17', light = '#E2A74F', skin = '#D9B46E';
  const g = new THREE.Group();
  put(g, rbox(0.62, 0.14, 0.72, '#EBD7A4', 0.05), 0, 0.12, 0);
  put(g, rbox(0.6, 0.2, 0.7, shell, 0.1), 0, 0.26, 0);
  put(g, rbox(0.42, 0.14, 0.5, shell, 0.07), 0, 0.4, 0);
  [[-0.14, 0.12], [0.14, 0.1], [0, -0.06], [-0.12, -0.2], [0.13, -0.18]].forEach(([x, z], i) =>
    put(g, rbox(0.12, 0.03, 0.12, i % 2 ? light : patch, 0.015), x, 0.475, z));
  const head = new THREE.Group(); head.position.set(0, 0.24, 0.42); g.add(head);
  head.add(rbox(0.24, 0.2, 0.24, skin, 0.08));
  put(head, rbox(0.1, 0.07, 0.06, '#8C6A3A', 0.02), 0, -0.04, 0.13);
  eyes(head, 0.08, 0.04, 0.125, 0.055);
  for (const s of [-1, 1]) {
    put(g, rbox(0.3, 0.05, 0.16, skin, 0.025), 0.4 * s, 0.14, 0.18, 0, -0.4 * s);
    put(g, rbox(0.16, 0.05, 0.12, skin, 0.02), 0.32 * s, 0.12, -0.26, 0, 0.3 * s);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.14, -0.38); g.add(tail);
  put(tail, rbox(0.08, 0.05, 0.1, skin, 0.02), 0, 0, -0.03);
  g.userData = { head, tail };
  return g;
}

const BUILDERS = { otter, kingfisher, monitor, hornbill, pangolin, mousedeer, turtle };
export function makePet(type, { gold = false } = {}) {
  const inner = (BUILDERS[type] || otter)();
  if (gold) {
    const dark = new Set(['5e3a24', '1f5fb0', '3e4a2c', '7a5032', '7a4a2a', '6b3a17', '8c6a3a']);
    inner.traverse((o) => {
      if (!o.isMesh || o.userData.keepColor) return;
      const m = o.material, color = m.color.getHexString();
      if (['2b1710', '26262b', '4a4a50'].includes(color)) return;
      m.color.set(dark.has(color) ? '#D9A21B' : '#F2C14E');
      m.metalness = 0.4; m.roughness = 0.35;
    });
  }
  // Wrap so stages can set scale/rotation freely; small animals get a size boost to read at a glance.
  const g = new THREE.Group();
  inner.scale.setScalar({ monitor: 1.3, pangolin: 1.25, turtle: 1.1 }[type] || 1);
  g.add(inner);
  g.userData = { ...inner.userData, type, gold };
  return g;
}
