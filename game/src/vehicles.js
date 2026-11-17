// Cars: mesh factory, parked stealables, traffic AI, arcade driving physics.
import * as THREE from '../vendor/three.min.js';
import { CAR_MODELS } from './config.js';
import { clamp, dist2, range } from './rng.js';

export function makeCarMesh(model, isPolice) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: isPolice ? 0xe8e8e8 : model.color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, 4.4), bodyMat);
  body.position.y = 0.65; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.2),
    new THREE.MeshLambertMaterial({ color: isPolice ? 0x222831 : 0x1e2a33 }));
  cab.position.set(0, 1.3, -0.2); g.add(cab);
  if (isPolice) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.2, 4.42),
      new THREE.MeshLambertMaterial({ color: 0x1e4fa0 }));
    stripe.position.y = 0.85; g.add(stripe);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.42, wz); g.add(w); wheels.push(w);
  }
  let lightL = null, lightR = null;
  if (isPolice) {
    lightL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xff2020, emissive: 0xff0000 }));
    lightL.position.set(-0.45, 1.75, -0.2); g.add(lightL);
    lightR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x2040ff, emissive: 0x0000ff }));
    lightR.position.set(0.45, 1.75, -0.2); g.add(lightR);
  }
  return { group: g, wheels, lightL, lightR };
}

export function placeCar(scene, car, x, z, heading) {
  car.x = x; car.z = z; car.heading = heading; car.speed = 0;
  car.group.position.set(x, 0, z); car.group.rotation.y = heading;
  scene.add(car.group);
}

export function createVehicles(scene, rng) {
  const traffic = [];
  const loops = [
    [[-90, -90], [90, -90], [90, 90], [-90, 90]],
    [[-45, -45], [45, -45], [45, 45], [-45, 45]],
    [[-90, 0], [90, 0], [90, 45], [-90, 45]],
    [[0, -90], [0, 90], [45, 90], [45, -90]],
  ];
  for (let i = 0; i < 12; i++) {
    const model = CAR_MODELS[i % CAR_MODELS.length];
    const m = makeCarMesh(model, false);
    const loop = loops[i % loops.length];
    const wp = loop[Math.floor(rng() * loop.length)];
    const car = { ...m, model, loop, wpIndex: 0, cruise: range(rng, 8, 13), x: wp[0], z: wp[1], heading: 0, speed: 0 };
    placeCar(scene, car, wp[0] + range(rng, -3, 3), wp[1] + range(rng, -3, 3), rng() * Math.PI * 2);
    traffic.push(car);
  }
  // Parked stealables along roads (clear of buildings: on road edges).
  const parked = [];
  const spots = [
    [-42, -88, 0], [20, -88, 0], [70, -43, 0], [-70, 2, 0], [30, 2, 0],
    [-20, 47, 0], [60, 47, 0], [-88, 30, 1.57], [-88, -60, 1.57], [88, -20, 1.57],
    [92, 88, 0], [-40, 88, 0], [10, -42, 0], [47, -70, 1.57],
  ];
  spots.forEach(([x, z, h], i) => {
    const model = CAR_MODELS[i % CAR_MODELS.length];
    const m = makeCarMesh(model, false);
    const car = { ...m, model, stolen: false, x, z, heading: h, speed: 0 };
    placeCar(scene, car, x, z, h);
    parked.push(car);
  });
  return { traffic, parked };
}

// Arcade drive: W accel, S brake/reverse, A/D steer. Returns speed km/h.
export function driveCar(car, dt, fwd, steer, world) {
  const top = car.model.top, acc = car.model.accel;
  if (fwd > 0) car.speed += acc * dt * fwd;
  else if (fwd < 0) car.speed += (car.speed > 0.5 ? -22 : -8) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  car.speed = clamp(car.speed, -10, top);
  const steerAmt = steer * 1.9 * dt * Math.min(1, Math.abs(car.speed) / 8) * Math.sign(car.speed || 1);
  car.heading += steerAmt;
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const [rx, rz] = world.resolveCollision(nx, nz, 1.6);
  if (rx !== nx || rz !== nz) car.speed *= 0.35;
  car.x = rx; car.z = rz;
  car.group.position.set(car.x, 0, car.z);
  car.group.rotation.y = car.heading;
  for (const w of car.wheels) w.rotation.x += car.speed * dt * 2;
  return Math.abs(car.speed) * 3.6;
}

export function updateTraffic(traffic, dt, world, playerCar, playerPos) {
  for (const car of traffic) {
    const wp = car.loop[car.wpIndex];
    const dx = wp[0] - car.x, dz = wp[1] - car.z;
    const d = Math.hypot(dx, dz);
    if (d < 4) { car.wpIndex = (car.wpIndex + 1) % car.loop.length; continue; }
    const want = Math.atan2(dx, dz);
    let dh = want - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    car.heading += clamp(dh, -1.4 * dt, 1.4 * dt);
    // Brake for the player in front.
    let target = car.cruise;
    const pd = playerPos ? dist2(car.x, car.z, playerPos.x, playerPos.z) : 1e9;
    if (pd < 49) {
      const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
      const dot = (playerPos.x - car.x) * fx + (playerPos.z - car.z) * fz;
      if (dot > 0) target = 0;
    }
    car.speed += clamp(target - car.speed, -14 * dt, 8 * dt);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    car.group.position.set(car.x, 0, car.z);
    car.group.rotation.y = car.heading;
    for (const w of car.wheels) w.rotation.x += car.speed * dt * 2;
  }
}
