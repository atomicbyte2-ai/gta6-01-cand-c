// Pedestrians (wander, flee from violence) and thugs (defend-mission attackers).
import * as THREE from '../vendor/three.min.js';
import { range, pick, dist2 } from './rng.js';

const SHIRTS = [0xe8e0c8, 0xc96a2e, 0x3f6d8e, 0x7a4a8e, 0x4a7a3a, 0xd8a928, 0x8e2e3e];
const PANTS = [0x2e3a4a, 0x4a4038, 0x6a5a3a];

function makePersonMesh(shirt, pants, skin) {
  const g = new THREE.Group();
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.35),
    new THREE.MeshLambertMaterial({ color: pants }));
  legs.position.y = 0.4; g.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 0.4),
    new THREE.MeshLambertMaterial({ color: shirt }));
  torso.position.y = 1.2; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42),
    new THREE.MeshLambertMaterial({ color: skin }));
  head.position.y = 1.8; g.add(head);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.12, 8),
    new THREE.MeshLambertMaterial({ color: 0xc9a03e }));
  hat.position.y = 2.05; g.add(hat);
  return g;
}

export function createPedestrians(scene, rng, count) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const mesh = makePersonMesh(pick(rng, SHIRTS), pick(rng, PANTS), pick(rng, [0xc98f6a, 0x8a5a3a, 0xe8b890]));
    const x = range(rng, -95, 95), z = range(rng, -95, 115);
    mesh.position.set(x, 0, z); scene.add(mesh);
    peds.push({
      mesh, x, z, hp: 100, heading: rng() * Math.PI * 2,
      speed: range(rng, 1, 1.8), wait: range(rng, 0, 3), flee: 0, dead: false,
    });
  }
  return peds;
}

export function spawnThugs(scene, rng, x, z, n) {
  const thugs = [];
  for (let i = 0; i < n; i++) {
    const mesh = makePersonMesh(0x222222, 0x222222, pick(rng, [0xc98f6a, 0x8a5a3a]));
    const tx = x + range(rng, -14, 14), tz = z + range(rng, -14, 14);
    mesh.position.set(tx, 0, tz); scene.add(mesh);
    thugs.push({ mesh, x: tx, z: tz, hp: 100, heading: 0, speed: 3.2, dead: false, punchCd: 0 });
  }
  return thugs;
}

export function updatePedestrians(peds, dt, world, danger) {
  for (const p of peds) {
    if (p.dead) continue;
    let fleeing = p.flee > 0;
    if (danger && dist2(p.x, p.z, danger.x, danger.z) < 100) { p.flee = 2.5; fleeing = true; }
    if (p.flee > 0) p.flee -= dt;
    if (p.wait > 0 && !fleeing) { p.wait -= dt; continue; }
    const dir = fleeing && danger
      ? Math.atan2(p.x - danger.x, p.z - danger.z)
      : p.heading;
    if (!fleeing && Math.random() < dt * 0.08) p.heading = Math.random() * Math.PI * 2;
    const sp = fleeing ? 4.2 : p.speed;
    const nx = p.x + Math.sin(dir) * sp * dt;
    const nz = p.z + Math.cos(dir) * sp * dt;
    const [rx, rz] = world.resolveCollision(nx, nz, 0.5);
    p.x = rx; p.z = rz; p.heading = dir;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
    if (!fleeing && Math.random() < dt * 0.05) p.wait = 1 + Math.random() * 3;
    p.mesh.position.y = Math.abs(Math.sin(performance.now() / 180 + p.x)) * 0.05;
  }
}

export function updateThugs(thugs, dt, world, player, onHitPlayer) {
  for (const t of thugs) {
    if (t.dead) continue;
    t.punchCd -= dt;
    const d = Math.hypot(player.x - t.x, player.z - t.z);
    if (d > 1.6) {
      t.heading = Math.atan2(player.x - t.x, player.z - t.z);
      const nx = t.x + Math.sin(t.heading) * t.speed * dt;
      const nz = t.z + Math.cos(t.heading) * t.speed * dt;
      const [rx, rz] = world.resolveCollision(nx, nz, 0.5);
      t.x = rx; t.z = rz;
    } else if (t.punchCd <= 0) {
      t.punchCd = 1.1; onHitPlayer(8);
    }
    t.mesh.position.set(t.x, 0, t.z);
    t.mesh.rotation.y = t.heading;
  }
}
