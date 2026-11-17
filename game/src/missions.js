// Story missions: 6 jobs with dialogue, beacons, stage types
// (collect / goto / timed / chase / escape / defend / stormrace).
import { MISSIONS } from './config.js';
import { makeCarMesh } from './vehicles.js';

export function createMissions(game) {
  const st = {
    index: 0, active: false, stage: 0, count: 0, timer: 0,
    beacon: null, chaseCar: null, chaseHits: 0, thugs: [],
    doneList: [], stormForced: false,
  };
  const defs = MISSIONS;

  function current() { return defs[st.index]; }
  function stageDef() { return current() ? current().stages[st.stage] : null; }

  function setBeacon() {
    const sd = stageDef();
    if (game.beacon) game.beacon.visible = false;
    if (!sd || !sd.at) return;
    const [x, z] = sd.at[Math.min(st.count, sd.at.length - 1)];
    if (!game.beacon) game.beacon = game.world.makeBeacon(x, z, 0xffd23e);
    game.beacon.position.set(x, 0, z);
    game.beacon.visible = true;
  }

  function start() {
    const m = current();
    if (!m || st.active) return false;
    st.active = true; st.stage = 0; st.count = 0; st.chaseHits = 0; st.timer = 0;
    const sd = stageDef();
    if (sd && sd.time) st.timer = sd.time;
    game.say(m.intro, 'MISSION');
    game.banner(`${m.name} — ${m.brief}`);
    game.popup(`MISSION: ${m.name}`, `$${m.reward} — ${sd ? sd.text : ''}`);
    if (m.id === 3) spawnChaseCar();
    if (m.id === 4) game.police.setWanted(3, game.player.x, game.player.z);
    if (m.id === 5) spawnThugs();
    if (m.id === 6) game.forceStorm();
    setBeacon();
    return true;
  }

  function spawnChaseCar() {
    const mesh = makeCarMesh({ name: 'Stolen Rig', color: 0x8e2e3e, top: 30, accel: 15 }, false);
    const car = { ...mesh, model: { name: 'Stolen Rig', top: 30, accel: 15 }, x: 40, z: -88, heading: 1.57, speed: 0 };
    car.group.position.set(40, 0, -88);
    game.scene.add(car.group);
    st.chaseCar = car;
  }

  function spawnThugs() {
    import('./pedestrians.js').then((mod) => {
      st.thugs = mod.spawnThugs(game.scene, game.rng, 112, 30, 5);
    });
  }

  function advance() {
    const m = current();
    st.stage += 1; st.count = 0;
    if (st.stage >= m.stages.length) { complete(); return; }
    const sd = stageDef();
    if (sd && sd.time) st.timer = sd.time;
    game.say(sd.text, 'OBJECTIVE');
    game.popup('NEXT STAGE', sd.text);
    setBeacon();
  }

  function complete() {
    const m = current();
    game.money += m.reward;
    game.audio.cash();
    game.popup(`JOB DONE — ${m.name}`, `+$${m.reward}`);
    game.say(m.done, 'MISSION');
    game.banner(`${m.name} COMPLETE — +$${m.reward}`);
    st.doneList.push(m.name);
    st.active = false; st.index += 1;
    if (game.beacon) game.beacon.visible = false;
    if (st.chaseCar) { game.scene.remove(st.chaseCar.group); st.chaseCar = null; }
    for (const t of st.thugs) game.scene.remove(t.mesh);
    st.thugs = [];
    game.save();
  }

  function fail(reason) {
    const m = current();
    game.popup('JOB FAILED', reason);
    game.say(`${m.name} failed — ${reason}`, 'MISSION');
    st.active = false;
    if (game.beacon) game.beacon.visible = false;
    if (st.chaseCar) { game.scene.remove(st.chaseCar.group); st.chaseCar = null; }
    for (const t of st.thugs) game.scene.remove(t.mesh);
    st.thugs = [];
  }

  // Called every frame while a mission is active. Returns nothing; uses game state.
  function update(dt) {
    if (!st.active) return;
    const m = current(), sd = stageDef();
    if (!sd) return;
    const p = game.player;
    if (sd.type === 'collect' || sd.type === 'goto' || sd.type === 'timed' || sd.type === 'stormrace') {
      const target = sd.at[Math.min(st.count, sd.at.length - 1)];
      const d = Math.hypot(p.x - target[0], p.z - target[1]);
      if (d < 6) {
        st.count += 1;
        game.audio.pickup();
        game.popup(sd.type === 'collect' ? `CRATE ${st.count}/${sd.need}` : `GATE ${st.count}/${sd.at.length}`, '+$25');
        game.money += 25;
        if (st.count >= sd.at.length || (sd.type === 'collect' && st.count >= sd.need)) advance();
        else setBeacon();
      }
      if (sd.time) {
        st.timer -= dt;
        if (st.timer <= 0) fail('Out of time.');
      }
    } else if (sd.type === 'chase') {
      const cc = st.chaseCar;
      if (cc) {
        // The rig flees along the highway, weaving.
        cc.heading = 1.57 + Math.sin(performance.now() / 2400) * 0.25;
        cc.speed = 24;
        cc.x += Math.sin(cc.heading) * cc.speed * dt;
        cc.z += Math.cos(cc.heading) * cc.speed * dt;
        if (cc.x > 135) cc.x = -135;
        cc.group.position.set(cc.x, 0, cc.z);
        cc.group.rotation.y = cc.heading;
        const pd = Math.hypot(p.x - cc.x, p.z - cc.z);
        if (pd < 4.5 && game.playerSpeed > 8) {
          st.chaseHits += 1;
          game.popup(`RAM ${st.chaseHits}/3`, 'Nice hit!');
          game.audio.punch();
          cc.x += Math.sin(cc.heading) * 3; cc.z += Math.cos(cc.heading) * 3;
          game.playerCarSpeed = Math.max(0, game.playerCarSpeed - 6);
          if (game.car) game.car.speed = game.playerCarSpeed;
          if (st.chaseHits >= 3) advance();
        }
        if (game.beacon) { game.beacon.position.set(cc.x, 0, cc.z); game.beacon.visible = true; }
      }
    } else if (sd.type === 'escape') {
      if (game.police.wanted >= 3 && !st.count) { st.count = 1; game.popup('HEAT IS ON', 'Now lose them!'); }
      if (st.count === 1 && game.police.wanted === 0) {
        const [x, z] = sd.at[0];
        if (Math.hypot(p.x - x, p.z - z) < 7) advance();
        else if (game.beacon) { game.beacon.position.set(x, 0, z); game.beacon.visible = true; }
      }
    } else if (sd.type === 'defend') {
      st.timer -= dt;
      // Thugs trickle in.
      if (st.thugs.length < 5 && Math.random() < dt * 0.25) {
        import('./pedestrians.js').then((mod) => {
          const more = mod.spawnThugs(game.scene, game.rng, 112, 30, 1);
          st.thugs.push(...more);
        });
      }
      if (st.timer <= 0) advance();
    }
  }

  return {
    st, current, stageDef, start, update, complete, fail,
    objectiveText() {
      if (!st.active) {
        return st.index < defs.length
          ? `Next job: ${defs[st.index].name} — press E to start`
          : 'All jobs done — Dustline Harbor is yours.';
      }
      const sd = stageDef();
      const m = current();
      let extra = '';
      if (sd && sd.time) extra = ` — ${Math.max(0, Math.ceil(st.timer))}s`;
      if (sd && sd.type === 'collect') extra = ` — ${st.count}/${sd.need}`;
      if (sd && sd.type === 'chase') extra = ` — RAM ${st.chaseHits}/3`;
      if (sd && (sd.type === 'timed' || sd.type === 'stormrace')) extra = ` — GATE ${st.count}/${sd.at.length}${sd.time ? ` — ${Math.max(0, Math.ceil(st.timer))}s` : ''}`;
      return `${m.name}: ${sd ? sd.text : ''}${extra}`;
    },
    markerPos() {
      if (!st.active) return null;
      const sd = stageDef();
      if (sd && sd.at) return sd.at[Math.min(st.count, sd.at.length - 1)];
      if (st.chaseCar) return [st.chaseCar.x, st.chaseCar.z];
      return null;
    },
  };
}
