// Deterministic ?shot= states: stage real gameplay from a seeded world,
// then main.js renders synchronously and sets window.__shotReady.
import { STEP } from './config.js';

function stepN(game, seconds) {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i++) game.step(STEP);
}

export function stageShot(name, game) {
  const g = game;
  if (name === 'start') {
    g.screen = 'title';
    g.shotCamera = { pos: [70, 42, 130], look: [0, 8, -20] };
    stepN(g, 2);
    return;
  }
  g.screen = 'play';
  g.hideOverlays();
  if (name === 'street') {
    // On foot in Old Town, first job live, peds on the street.
    g.player.x = -22; g.player.z = -14; g.player.heading = 0.6;
    g.missions.start();
    g.say('IDA: "Port crates, four of them. My garage in Old Town. Move."', 'MISSION');
    stepN(g, 1.5);
    g.shotCamera = null;
    return;
  }
  if (name === 'mission') {
    // First haul at the port: Coyote GT on the approach road, beacon on the
    // crates ahead, containers and cranes in frame. No driving — the pad is dense.
    g.missions.start();
    g.enterCar(g.parkedByModel('Coyote GT'));
    g.player.x = 90; g.player.z = 8; g.player.heading = Math.PI / 2;
    if (g.car) { g.car.x = 90; g.car.z = 8; g.car.heading = Math.PI / 2; g.car.speed = 0; }
    g.say('IDA: "That crate, then the next three. Quick hands, Joss."', 'MISSION');
    stepN(g, 0.6);
    return;
  }
  // cover: high-speed highway chase, 3 stars, PD roster, heli, storm front.
  g.missions.st.index = 5;
  g.missions.start(); // OUTRUN THE STORM — forces the storm warning + banner.
  g.enterCar(g.parkedByModel('Coyote GT'));
  g.player.x = -30; g.player.z = -118; g.player.heading = Math.PI / 2;
  if (g.car) { g.car.x = -30; g.car.z = -118; g.car.heading = Math.PI / 2; g.car.speed = 30; }
  g.police.setWanted(3, g.player.x, g.player.z);
  g.driveForward(1.6);
  // Refresh the LKP to the chase so the heli circles overhead in frame.
  g.police.lkp.x = g.player.x; g.police.lkp.z = g.player.z;
  // Place units around the player's final spot so the chase reads in frame:
  // two ahead on the highway, one closing from behind.
  const fx = g.player.x, fz = g.player.z;
  const spots = [[fx + 26, fz - 5], [fx + 34, fz + 6], [fx - 16, fz + 2]];
  g.police.units.forEach((u, i) => {
    if (i < 3) { u.x = spots[i][0]; u.z = spots[i][1]; u.heading = Math.PI / 2; u.speed = 28; u.active = true; }
  });
  g.say('BRAM: "The storm is coming. Outrun it, gate to gate."', 'MISSION');
  g.popup('NEAR MISS +40', 'DRIFT +120');
  stepN(g, 0.8);
}
