// Dustline Harbor world: sun-bleached desert-coast port town in three.js.
// Ground, sea, road grid, desert highway, container port with cranes,
// old-town blocks, palms, cacti, dunes, dust particles + storm fog.
import * as THREE from '../vendor/three.min.js';
import { range, pick } from './rng.js';

const ROADS = [-90, -45, 0, 45, 90];
const BUILD_COLORS = [0xd9b380, 0xc98f5f, 0xe8d3a8, 0xb97a4e, 0xcfc0a0, 0xa86f4a];
const CONTAINER_COLORS = [0xb3402e, 0x2e6d8e, 0xc98a2e, 0x4a7a3a, 0x7a4a8e, 0x8e2e3e];

function windowTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#2e3a4a';
  for (let y = 10; y < 120; y += 20) for (let x = 8; x < 56; x += 16) g.fillRect(x, y, 9, 12);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createWorld(rng) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf2c98a);
  scene.fog = new THREE.Fog(0xecc489, 90, 320);

  const hemi = new THREE.HemisphereLight(0xffe6b8, 0x8a6a44, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0c8, 1.9);
  sun.position.set(80, 140, 40); scene.add(sun);

  const colliders = []; // {x0,z0,x1,z1}
  const addCollider = (x, z, w, d) => colliders.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 });

  // Sand ground + sea to the south + desert flats to the north.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(340, 340),
    new THREE.MeshLambertMaterial({ color: 0xd9b380 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(340, 60),
    new THREE.MeshLambertMaterial({ color: 0x2e7d8e }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.05, 168); scene.add(sea);
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(340, 14),
    new THREE.MeshLambertMaterial({ color: 0xead9a8 }));
  beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.06, 132); scene.add(beach);

  // Roads: grid + long desert highway along the north edge.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x4a4038 });
  const dashMat = new THREE.MeshLambertMaterial({ color: 0xe8d98a });
  for (const r of ROADS) {
    for (const [w, d, x, z] of [[280, 10, 0, r], [10, 280, r, 0]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.08, z); scene.add(m);
    }
  }
  const hwy = new THREE.Mesh(new THREE.PlaneGeometry(300, 14), roadMat);
  hwy.rotation.x = -Math.PI / 2; hwy.position.set(0, 0.08, -118); scene.add(hwy);
  for (let x = -140; x < 140; x += 12) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.5), dashMat);
    dash.rotation.x = -Math.PI / 2; dash.position.set(x, 0.09, -118); scene.add(dash);
  }
  // Highway sign posts.
  for (const x of [-100, -40, 30, 100]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 0.4), new THREE.MeshLambertMaterial({ color: 0x777777 }));
    post.position.set(x, 2, -111); scene.add(post);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(7, 2.4, 0.3), new THREE.MeshLambertMaterial({ color: 0x2e6d3e }));
    sign.position.set(x, 4.6, -111); scene.add(sign);
  }

  // Old-town buildings in the blocks between roads.
  const winTex = windowTexture();
  const blockCenters = [];
  for (const bx of [-67.5, -22.5, 22.5, 67.5]) for (const bz of [-67.5, -22.5, 22.5, 67.5]) blockCenters.push([bx, bz]);
  for (const [bx, bz] of blockCenters) {
    const n = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const w = range(rng, 12, 20), d = range(rng, 12, 20), h = range(rng, 6, 24);
      const x = bx + range(rng, -9, 9), z = bz + range(rng, -9, 9);
      const mat = new THREE.MeshLambertMaterial({ color: pick(rng, BUILD_COLORS), map: winTex });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(x, h / 2, z); scene.add(b);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6),
        new THREE.MeshLambertMaterial({ color: 0x8a5a34 }));
      roof.position.set(x, h + 0.25, z); scene.add(roof);
      addCollider(x, z, w, d);
    }
  }
  // Harbourfront row + a lighthouse at the pier.
  for (let i = 0; i < 6; i++) {
    const x = -110 + i * 42;
    const b = new THREE.Mesh(new THREE.BoxGeometry(18, range(rng, 8, 16), 14),
      new THREE.MeshLambertMaterial({ color: pick(rng, BUILD_COLORS), map: winTex }));
    b.position.set(x, 5, 108); scene.add(b); addCollider(x, 108, 18, 14);
  }
  const light = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, 22, 10),
    new THREE.MeshLambertMaterial({ color: 0xe8e0c8 }));
  light.position.set(128, 11, 118); scene.add(light); addCollider(128, 118, 5, 5);
  const lightTop = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 2, 10),
    new THREE.MeshLambertMaterial({ color: 0xb3402e, emissive: 0x661111 }));
  lightTop.position.set(128, 23, 118); scene.add(lightTop);

  // Container port (east): concrete pad, stacked containers, two cranes.
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(70, 110),
    new THREE.MeshLambertMaterial({ color: 0x9a938a }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(112, 0.07, 30); scene.add(pad);
  for (let i = 0; i < 26; i++) {
    const x = 96 + (i % 5) * 9, z = -6 + Math.floor(i / 5) * 13;
    const stack = 1 + Math.floor(rng() * 2);
    for (let s = 0; s < stack; s++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(8, 2.6, 2.6),
        new THREE.MeshLambertMaterial({ color: pick(rng, CONTAINER_COLORS) }));
      c.position.set(x, 1.3 + s * 2.6, z); c.rotation.y = (i % 2) * 0.06; scene.add(c);
    }
    addCollider(x, z, 8, 2.6);
  }
  for (const cz of [6, 52]) {
    const legMat = new THREE.MeshLambertMaterial({ color: 0xc9a03e });
    for (const dx of [-5, 5]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(1.4, 26, 1.4), legMat);
      leg.position.set(112 + dx, 13, cz); scene.add(leg);
    }
    const arm = new THREE.Mesh(new THREE.BoxGeometry(30, 1.6, 1.6), legMat);
    arm.position.set(112, 25, cz); scene.add(arm);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    cab.position.set(104, 23, cz); scene.add(cab);
    addCollider(112, cz, 12, 3);
  }

  // Palms along the harbourfront, cacti + dunes in the scrub flats.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a44 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3e7a34 });
  function palm(x, z) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 6, 6), trunkMat);
    t.position.set(x, 3, z); scene.add(t);
    for (let k = 0; k < 5; k++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.4, 4), leafMat);
      const a = (k / 5) * Math.PI * 2;
      leaf.position.set(x + Math.cos(a) * 1.2, 6.4, z + Math.sin(a) * 1.2);
      leaf.rotation.z = Math.cos(a) * 0.9; leaf.rotation.x = -Math.sin(a) * 0.9; scene.add(leaf);
    }
  }
  for (let i = 0; i < 14; i++) palm(-125 + i * 19 + range(rng, -3, 3), 122 + range(rng, -2, 2));
  for (let i = 0; i < 10; i++) palm(range(rng, -80, 80), range(rng, -100, -80));
  const cactusMat = new THREE.MeshLambertMaterial({ color: 0x4a7a3a });
  for (let i = 0; i < 26; i++) {
    const x = range(rng, -135, 135), z = range(rng, -138, -105);
    if (Math.abs(z + 118) < 9) continue;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, range(rng, 2, 4.5), 6), cactusMat);
    c.position.set(x, 1.5, z); scene.add(c);
  }
  const duneMat = new THREE.MeshLambertMaterial({ color: 0xe0c088 });
  for (let i = 0; i < 12; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(range(rng, 8, 18), 8, 6), duneMat);
    d.scale.y = 0.22; d.position.set(range(rng, -135, 135), 0, range(rng, -140, -125));
    scene.add(d);
  }
  // Sun disc in the sky for the title vista.
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(14, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0, fog: false }));
  sunDisc.position.set(-60, 90, -220); sunDisc.lookAt(0, 20, 0); scene.add(sunDisc);

  // Dust particles (Points) — density driven by the storm phase.
  const DUST_N = 700;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(DUST_N * 3);
  for (let i = 0; i < DUST_N; i++) {
    dustPos[i * 3] = range(rng, -140, 140); dustPos[i * 3 + 1] = range(rng, 0.5, 14); dustPos[i * 3 + 2] = range(rng, -140, 140);
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0xd8b078, size: 0.9, transparent: true, opacity: 0.25 });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // Traffic loops (waypoint rectangles on the road grid + highway run).
  const roadLoops = [
    [[-90, -90], [90, -90], [90, 90], [-90, 90]],
    [[-45, -45], [45, -45], [45, 45], [-45, 45]],
    [[-90, 0], [90, 0], [90, 45], [-90, 45]],
    [[-130, -118], [130, -118]],
    [[0, -90], [0, 90], [45, 90], [45, -90]],
  ];

  function makeBeacon(x, z, color) {
    const g = new THREE.Group();
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 14, 12, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
    cyl.position.y = 7; g.add(cyl);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.3, 8, 20),
      new THREE.MeshBasicMaterial({ color }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; g.add(ring);
    g.position.set(x, 0, z); g.visible = false; scene.add(g);
    return g;
  }

  let stormT = 0;
  return {
    scene, colliders, roadLoops, makeBeacon,
    // stormPhase: 0 calm, 1 warning, 2 storm. Returns dust opacity used.
    update(dt, stormPhase, px, pz) {
      stormT += dt;
      const targetFog = stormPhase === 2 ? [30, 110] : stormPhase === 1 ? [60, 220] : [90, 320];
      scene.fog.near += (targetFog[0] - scene.fog.near) * Math.min(1, dt * 0.8);
      scene.fog.far += (targetFog[1] - scene.fog.far) * Math.min(1, dt * 0.8);
      const targetOp = stormPhase === 2 ? 0.85 : stormPhase === 1 ? 0.45 : 0.18;
      dustMat.opacity += (targetOp - dustMat.opacity) * Math.min(1, dt);
      const pos = dustGeo.attributes.position.array;
      const speed = stormPhase === 2 ? 26 : stormPhase === 1 ? 12 : 4;
      for (let i = 0; i < DUST_N; i++) {
        pos[i * 3] += speed * dt * (0.6 + (i % 5) * 0.15);
        pos[i * 3 + 1] += Math.sin(stormT * 2 + i) * dt * 0.4;
        if (pos[i * 3] > px + 70) pos[i * 3] = px - 70;
        if (pos[i * 3] < px - 70) pos[i * 3] = px + 70;
        if (pos[i * 3 + 2] > pz + 70) pos[i * 3 + 2] = pz - 70;
        if (pos[i * 3 + 2] < pz - 70) pos[i * 3 + 2] = pz + 70;
      }
      dustGeo.attributes.position.needsUpdate = true;
      return dustMat.opacity;
    },
    // Push a circle (x,z,r) out of building colliders. Returns corrected x,z.
    resolveCollision(x, z, r) {
      for (const c of colliders) {
        const cx = Math.max(c.x0, Math.min(x, c.x1));
        const cz = Math.max(c.z0, Math.min(z, c.z1));
        const dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          if (d2 < 1e-6) { x = c.x1 + r; continue; }
          const d = Math.sqrt(d2);
          x = cx + (dx / d) * r; z = cz + (dz / d) * r;
        }
      }
      x = Math.max(-138, Math.min(138, x)); z = Math.max(-138, Math.min(138, z));
      return [x, z];
    },
  };
}
