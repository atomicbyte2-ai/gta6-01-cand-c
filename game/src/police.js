// Wanted system: named Dustline PD units, last-known-position search,
// decay when unseen, helicopter at 3+ stars. Police never track perfectly:
// in a dust storm they lose you twice as fast; far away they search the LKP.
import * as THREE from '../vendor/three.min.js';
import { POLICE_UNITS, HELI_UNIT } from './config.js';
import { clamp, dist2 } from './rng.js';
import { makeCarMesh } from './vehicles.js';

export function createPolice(scene) {
  const units = POLICE_UNITS.map((u) => {
    const mesh = makeCarMesh({ name: 'PD Interceptor', color: 0xe8e8e8, top: 36, accel: 19 }, true);
    mesh.group.visible = false; scene.add(mesh.group);
    return { ...u, ...mesh, x: 0, z: 0, heading: 0, speed: 0, active: false, status: 'STANDBY', ramCd: 0 };
  });
  // Helicopter: body + rotor + spotlight disc.
  const heli = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 4.5),
    new THREE.MeshLambertMaterial({ color: 0x2e3a4a }));
  heli.add(body);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.12, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x141414 }));
  rotor.position.y = 1; heli.add(rotor);
  const spot = new THREE.Mesh(new THREE.CircleGeometry(3, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
  spot.rotation.x = -Math.PI / 2; spot.position.y = -14; heli.add(spot);
  heli.visible = false; scene.add(heli);
  return {
    units, heli, heliRotor: rotor, heliActive: false,
    wanted: 0, lkp: { x: 0, z: 0 }, unseen: 0, decayT: 0,
    setWanted(n, px, pz) {
      this.wanted = clamp(n, 0, 5);
      if (n > 0) { this.lkp.x = px; this.lkp.z = pz; this.unseen = 0; }
    },
    addWanted(n, px, pz) { this.setWanted(this.wanted + n, px, pz); },
  };
}

export function updatePolice(police, dt, player, stormPhase, onRam, onBusted) {
  const { units, heli } = police;
  const wanted = police.wanted;
  const px = player.x, pz = player.z;
  // Visibility: a ground unit spots the player only up close (<30 m).
  // The helicopter circles the LAST KNOWN POSITION and spots the player
  // only within 60 m of itself — it never tracks the player directly,
  // so breaking contact and going quiet really does lose the PD.
  const heliEyes = police.heliActive && stormPhase < 2;
  let seen = false;
  const activeCount = wanted === 0 ? 0 : Math.min(wanted + 1, 5);
  units.forEach((u, i) => {
    u.active = i < activeCount;
    u.group.visible = u.active;
    if (!u.active) return;
    const d = Math.hypot(px - u.x, pz - u.z);
    if (d < 30) seen = true;
  });
  if (heliEyes) {
    const hd = Math.hypot(px - heli.position.x, pz - heli.position.z);
    if (hd < 60) seen = true;
  }
  if (seen) {
    police.lkp.x = px; police.lkp.z = pz; police.unseen = 0; police.decayT = 0;
  } else {
    police.unseen += dt;
    // Decay: 9 s unseen per star (4.5 s in a storm — the storm hides you).
    const perStar = stormPhase === 2 ? 4.5 : 9;
    police.decayT += dt;
    if (police.unseen > 2 && police.decayT >= perStar && police.wanted > 0) {
      police.wanted -= 1; police.decayT = 0;
    }
  }
  // Helicopter at 3+ stars: circles the last known position, never the player.
  police.heliActive = wanted >= 3;
  heli.visible = police.heliActive;
  if (police.heliActive) {
    police.heliOrbit = (police.heliOrbit || 0) + dt * 0.35;
    const hx = police.lkp.x + Math.cos(police.heliOrbit) * 22;
    const hz = police.lkp.z + Math.sin(police.heliOrbit) * 22;
    heli.position.set(hx, 20, hz);
    heli.rotation.y += dt * 0.4;
    police.heliRotor.rotation.y += dt * 18;
  }
  // Units chase the player only when close; otherwise they search around
  // the LKP, picking fresh search points instead of sitting on one spot.
  units.forEach((u, i) => {
    if (!u.active) return;
    u.ramCd -= dt;
    const pd0 = Math.hypot(px - u.x, pz - u.z);
    let tx, tz;
    if (pd0 < 40) { tx = px; tz = pz; }
    else {
      if (!u.search || Math.hypot(u.search.x - u.x, u.search.z - u.z) < 8) {
        u.search = {
          x: police.lkp.x + (Math.random() - 0.5) * 50,
          z: police.lkp.z + (Math.random() - 0.5) * 50,
        };
      }
      tx = u.search.x; tz = u.search.z;
    }
    const dx = tx - u.x, dz = tz - u.z;
    const d = Math.hypot(dx, dz);
    if (d > 3) {
      const want = Math.atan2(dx, dz);
      let dh = want - u.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      u.heading += clamp(dh, -2.2 * dt, 2.2 * dt);
      const target = d > 60 ? 34 : d > 20 ? 26 : 16;
      u.speed += clamp(target - u.speed, -20 * dt, 14 * dt);
      u.x += Math.sin(u.heading) * u.speed * dt;
      u.z += Math.cos(u.heading) * u.speed * dt;
    } else {
      u.speed *= 0.9;
    }
    u.group.position.set(u.x, 0, u.z);
    u.group.rotation.y = u.heading;
    // Light bar flash.
    const on = Math.floor(performance.now() / 180) % 2 === 0;
    if (u.lightL) u.lightL.material.emissive.setHex(on ? 0xff0000 : 0x330000);
    if (u.lightR) u.lightR.material.emissive.setHex(on ? 0x000033 : 0x0000ff);
    // Ram: ONLY on real proximity to the actual player, throttled.
    const pd = Math.hypot(px - u.x, pz - u.z);
    u.status = pd < 12 ? 'PURSUING' : d < 30 ? 'CLOSING IN' : 'SEARCHING LKP';
    if (pd < 3.4 && u.ramCd <= 0) {
      u.ramCd = 1.2;
      onRam(9, u.id);
    }
    // Busted: on foot, surrounded at 0 speed — not implemented as arrest;
    // police rams are the on-foot pressure instead.
  });
  return { seen, activeCount };
}
