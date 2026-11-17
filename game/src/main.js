// DUSTLINE HARBOR — boot, loop, player, storm cycle, save/load, screens.
// ?seed=N fixes the city. ?shot=cover|street|mission|start (&seed=N) stages
// that scene, renders it synchronously twice and sets window.__shotReady.
import * as THREE from '../vendor/three.min.js';
import { STEP, SAVE_KEY, MISSIONS, RADIOS, INTRO_TEXT } from './config.js';
import { createRandom, clamp } from './rng.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_PUNCH, ACTION_WEAPON, ACTION_RELOAD, ACTION_RADIO, ACTION_FIRE } from './input.js';
import { createWorld } from './world.js';
import { createVehicles, driveCar, updateTraffic } from './vehicles.js';
import { createPedestrians, updatePedestrians, updateThugs } from './pedestrians.js';
import { createPolice, updatePolice } from './police.js';
import { createMissions } from './missions.js';
import { createCombat } from './combat.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
window.addEventListener('resize', () => renderer.setSize(window.innerWidth, window.innerHeight));
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 600);

const rng = createRandom(seed);
const world = createWorld(rng);
const scene = world.scene;
const vehicles = createVehicles(scene, rng);
const peds = createPedestrians(scene, rng, 26);
const police = createPolice(scene);
const combat = createCombat();
const audio = createAudio();
const input = createInput(canvas);

// Player mesh: Joss Marek — burnt-orange jacket, dusty cap.
const playerMesh = new THREE.Group();
{
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.35), new THREE.MeshLambertMaterial({ color: 0x2e3a4a }));
  legs.position.y = 0.4; playerMesh.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 0.4), new THREE.MeshLambertMaterial({ color: 0xc96a2e }));
  torso.position.y = 1.2; playerMesh.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshLambertMaterial({ color: 0xc98f6a }));
  head.position.y = 1.8; playerMesh.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.12, 8), new THREE.MeshLambertMaterial({ color: 0x3f6d8e }));
  cap.position.y = 2.05; playerMesh.add(cap);
}
playerMesh.position.set(-28, 0, -18);
scene.add(playerMesh);

const game = {
  scene, world, rng, police, combat, audio,
  player: { x: -28, z: -18, heading: 0.6, hp: 100, armor: 50, mesh: playerMesh },
  car: null, playerSpeed: 0, playerCarSpeed: 0,
  money: 350, rep: 0, day: 1, clock: 564, radioIdx: 0,
  stormPhase: 0, stormTimer: 85, beacon: null,
  screen: 'title', camYaw: 0.6, camYawOff: 0, shotCamera: null, _auto: null,
  traffic: vehicles.traffic, parked: vehicles.parked, peds,
  districtAt(x, z) {
    if (x > 78) return 'CONTAINER PORT';
    if (z < -105) return 'DUSTLINE HIGHWAY';
    if (z > 120) return 'HARBOURFRONT';
    if (Math.abs(x) < 50 && Math.abs(z) < 50) return 'OLD TOWN';
    if (z > 80) return 'HARBOURFRONT';
    return 'SCRUB FLATS';
  },
  forceStorm() { this.stormPhase = 1; this.stormTimer = 12; },
  parkedByModel(name) { return this.parked.find((c) => c.model.name === name) || this.parked[0]; },
  enterCar(car) {
    if (!car) return false;
    const wasParked = this.parked.includes(car);
    if (wasParked && !car.stolen) { car.stolen = true; this.police.addWanted(1, this.player.x, this.player.z); this.popup('CAR STOLEN', '+1 ★ — Dustline PD noticed'); }
    if (this.traffic.includes(car)) this.traffic.splice(this.traffic.indexOf(car), 1);
    this.car = car;
    this.player.x = car.x; this.player.z = car.z; this.player.heading = car.heading;
    playerMesh.visible = false;
    this.audio.unlock();
    return true;
  },
  exitCar() {
    if (!this.car) return;
    const c = this.car;
    c.speed = 0;
    this.player.x = c.x + Math.cos(c.heading) * 2.2;
    this.player.z = c.z - Math.sin(c.heading) * 2.2;
    this.player.heading = c.heading;
    this.car = null;
    playerMesh.visible = true;
    playerMesh.position.set(this.player.x, 0, this.player.z);
  },
  driveForward(seconds) {
    this._auto = { fwd: 1, steer: 0 };
    const n = Math.round(seconds / STEP);
    for (let i = 0; i < n; i++) this.step(STEP);
    this._auto = null;
  },
  say(text, who) { hud.say(text, who); },
  banner(text) { hud.banner(text); },
  popup(title, sub) { hud.popup(title, sub); },
  hideOverlays() {
    for (const id of ['start-screen', 'pause-screen', 'wasted-screen']) document.getElementById(id).style.display = 'none';
    document.getElementById('hud').style.display = 'block';
  },
  save() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({
        money: this.money, hp: this.player.hp, armor: this.player.armor, rep: this.rep,
        day: this.day, clock: this.clock, missionIndex: this.missions.st.index,
        doneList: this.missions.st.doneList, x: this.player.x, z: this.player.z,
        wanted: this.police.wanted,
      }));
    } catch { /* storage off: session-only */ }
  },
  load() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      this.money = s.money; this.player.hp = s.hp; this.player.armor = s.armor;
      this.rep = s.rep; this.day = s.day; this.clock = s.clock;
      this.player.x = s.x; this.player.z = s.z;
      this.missions.st.index = s.missionIndex || 0;
      this.missions.st.doneList = s.doneList || [];
      this.police.setWanted(s.wanted || 0, s.x, s.z);
      return true;
    } catch { return false; }
  },
  hurt(dmg, src) {
    const absorbed = Math.min(this.player.armor, dmg);
    this.player.armor -= absorbed;
    this.player.hp -= (dmg - absorbed);
    this.audio.hurt();
    this.popup(`HIT — ${src || 'PD'}`, `-${dmg} HP`);
    if (this.player.hp <= 0) this.wasted();
  },
  wasted() {
    this.screen = 'wasted';
    this.player.hp = 0;
    this.police.setWanted(0, this.player.x, this.player.z);
    hud.setWasted(true);
    document.getElementById('hud').style.display = 'none';
  },
  retry() {
    this.player.hp = 100; this.player.armor = 50;
    this.player.x = -28; this.player.z = -18; this.player.heading = 0.6;
    this.money = Math.max(0, this.money - 100);
    if (this.car) { this.car = null; playerMesh.visible = true; }
    this.missions.st.active = false;
    if (this.beacon) this.beacon.visible = false;
    hud.setWasted(false);
    document.getElementById('hud').style.display = 'block';
    this.screen = 'play';
    this.say('IDA: "You look terrible. Garage. Now."', 'MISSION');
  },
  step(dt) {
    // Storm cycle always advances.
    this.stormTimer -= dt;
    if (this.stormTimer <= 0) {
      if (this.stormPhase === 0) { this.stormPhase = 1; this.stormTimer = 20; this.popup('STORM FRONT', 'Visibility dropping — lose the cops in the dust'); }
      else if (this.stormPhase === 1) { this.stormPhase = 2; this.stormTimer = 45; }
      else { this.stormPhase = 0; this.stormTimer = 85; }
    }
    this.clock += dt * 0.8;
    if (this.clock >= 1440) { this.clock -= 1440; this.day += 1; }
    world.update(dt, this.stormPhase, this.player.x, this.player.z);
    updateTraffic(this.traffic, dt, world, this.car, this.player);
    updatePedestrians(this.peds, dt, world, this.car ? { x: this.car.x, z: this.car.z } : this.player);
    if (this.screen !== 'play') return;
    const p = this.player;
    const ax = this._auto ? { x: 0, z: -1 } : input.axis();
    const drag = input.takeDrag();
    this.camYawOff += drag.x * 0.004;
    if (this.car) {
      const fwd = this._auto ? this._auto.fwd : (ax.z < 0 ? 1 : ax.z > 0 ? -1 : 0);
      const steer = this._auto ? this._auto.steer : (ax.x < 0 ? 1 : ax.x > 0 ? -1 : 0);
      this.playerCarSpeed = driveCar(this.car, dt, fwd, steer, world);
      this.playerSpeed = this.car.speed;
      p.x = this.car.x; p.z = this.car.z; p.heading = this.car.heading;
      this.camYaw += (p.heading - this.camYaw) * Math.min(1, dt * 2.2);
    } else {
      const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw);
      const rx = -Math.cos(this.camYaw), rz = Math.sin(this.camYaw);
      let mx = fx * -ax.z + rx * ax.x, mz = fz * -ax.z + rz * ax.x;
      const ml = Math.hypot(mx, mz);
      const run = input.run();
      const sp = run ? 9 : 6;
      if (ml > 0.01) {
        mx /= ml; mz /= ml;
        p.heading = Math.atan2(mx, mz);
        this.camYaw += (p.heading - this.camYaw) * Math.min(1, dt * 1.2);
        const nx = p.x + mx * sp * dt, nz = p.z + mz * sp * dt;
        const [rx2, rz2] = world.resolveCollision(nx, nz, 0.6);
        p.x = rx2; p.z = rz2;
        this.playerSpeed = sp;
      } else this.playerSpeed = 0;
      playerMesh.position.set(p.x, 0, p.z);
      playerMesh.rotation.y = p.heading;
      playerMesh.position.y = ml > 0.01 ? Math.abs(Math.sin(performance.now() / 160)) * 0.08 : 0;
    }
    // Police + missions + thugs.
    updatePolice(this.police, dt, p, this.stormPhase,
      (dmg, id) => this.hurt(dmg, id),
      () => {});
    this.missions.update(dt);
    updateThugs(this.missions.st.thugs, dt, world, p, (dmg) => this.hurt(dmg, 'THUG'));
    combat.tick(dt);
    this.audio.engine(this.car ? Math.abs(this.car.speed) / 38 : 0, !!this.car);
    this.audio.siren(this.police.wanted > 0);
    this.audio.radio(dt);
  },
  render() {
    if (this.shotCamera) {
      camera.position.set(...this.shotCamera.pos);
      camera.lookAt(...this.shotCamera.look);
    } else {
      const p = this.player;
      const yaw = this.camYaw + this.camYawOff;
      const dist = this.car ? 12.5 : 9.5, height = this.car ? 5.2 : 4.6;
      camera.position.set(
        p.x - Math.sin(yaw) * dist,
        height,
        p.z - Math.cos(yaw) * dist);
      camera.lookAt(p.x + Math.sin(yaw) * 6, 1.6, p.z + Math.cos(yaw) * 6);
    }
    hud.update();
    renderer.render(scene, camera);
  },
};

const hud = createHud(game);
game.missions = createMissions(game);
window.__game = game;

function nearestCar(maxD) {
  let best = null, bestD = maxD;
  for (const c of [...game.parked, ...game.traffic]) {
    const d = Math.hypot(c.x - game.player.x, c.z - game.player.z);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function handleActions() {
  const a = input.takeActions();
  if (a & ACTION_CONFIRM) {
    audio.unlock();
    if (game.screen === 'title') startPlay(false);
    else if (game.screen === 'wasted') game.retry();
    else if (game.screen === 'paused') { game.screen = 'play'; document.getElementById('pause-screen').style.display = 'none'; }
  }
  if (a & ACTION_PAUSE) {
    if (game.screen === 'play') { game.screen = 'paused'; document.getElementById('pause-screen').style.display = 'flex'; }
    else if (game.screen === 'paused') { game.screen = 'play'; document.getElementById('pause-screen').style.display = 'none'; }
  }
  if (game.screen !== 'play') return;
  if (a & ACTION_ENTER) {
    if (game.car) game.exitCar();
    else {
      const car = nearestCar(4.5);
      if (car) game.enterCar(car);
      else game.missions.start();
    }
  }
  if (a & ACTION_PUNCH) {
    const targets = [...game.peds, ...game.missions.st.thugs];
    const hit = combat.punch(targets, game.player.x, game.player.z, game.player.heading);
    if (hit) {
      audio.punch();
      if (game.peds.includes(hit)) {
        game.police.addWanted(1, game.player.x, game.player.z);
        hit.flee = 4;
        game.popup('ASSAULT', '+1 ★ — someone called it in');
      } else game.popup('HIT!', 'Thug down a peg');
    }
  }
  if (a & ACTION_WEAPON) { combat.cycle(); game.popup(combat.weapon === 'pistol' ? 'PISTOL' : 'FISTS', combat.weapon === 'pistol' ? `${combat.ammo} rounds` : ''); }
  if (a & ACTION_RELOAD) { if (combat.reload()) game.popup('RELOADED', `${combat.ammo} / ${combat.reserve}`); }
  if (a & ACTION_RADIO) { game.radioIdx = (game.radioIdx + 1) % RADIOS.length; game.popup('RADIO', RADIOS[game.radioIdx]); }
  if (a & ACTION_FIRE) {
    audio.unlock();
    if (combat.weapon === 'pistol') {
      const targets = [...game.peds, ...game.missions.st.thugs];
      const r = combat.shoot(targets, game.player.x, game.player.z, game.player.heading);
      if (r.hit) {
        audio.shot();
        if (game.peds.includes(r.hit)) { game.police.addWanted(1, game.player.x, game.player.z); r.hit.flee = 4; }
        game.popup(r.hit.dead ? 'TARGET DOWN' : 'HIT!', '');
      } else if (r.dry) game.popup('CLICK…', 'Press R to reload');
      else audio.shot();
    }
  }
}

function startPlay(fromSave) {
  if (fromSave) game.load();
  game.screen = 'play';
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  audio.unlock();
  game.say(INTRO_TEXT, 'DUSTLINE HARBOR');
  game.banner('DUSTLINE HARBOR — press E near a car to steal it, E elsewhere to start a job');
}

document.getElementById('play-btn').addEventListener('click', () => startPlay(false));
document.getElementById('load-btn').addEventListener('click', () => startPlay(true));
document.getElementById('retry-btn').addEventListener('click', () => game.retry());
document.getElementById('resume-btn').addEventListener('click', () => {
  game.screen = 'play'; document.getElementById('pause-screen').style.display = 'none';
});
document.getElementById('save-btn').addEventListener('click', () => { game.save(); game.popup('SAVED', 'Progress saved to this browser'); });

// Show LOAD SAVE only when a save exists.
try { if (window.localStorage.getItem(SAVE_KEY)) document.getElementById('load-btn').style.display = 'inline-block'; } catch { /* no storage */ }

function runShot(name) {
  stageShot(name, game);
  game.render();
  game.render();
  window.__shotReady = true;
}

function runGame() {
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    acc += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    while (acc >= STEP && game.screen !== 'paused') {
      if (game.screen === 'title' || game.screen === 'play') game.step(STEP);
      acc -= STEP;
      if (game.screen === 'wasted') { acc = 0; break; }
    }
    if (game.screen !== 'wasted') game.render();
  }
  document.getElementById('hud').style.display = 'none';
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
