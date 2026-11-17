// DUSTLINE HARBOR — shared constants, names, story data. All names original.
export const STEP = 1 / 60;
export const SAVE_KEY = 'dustline-harbor-save-v1';
export const WORLD = { half: 140, roadHalf: 5, seaZ: 138 };

export const DISTRICTS = [
  { name: 'OLD TOWN', x: -20, z: -10 },
  { name: 'CONTAINER PORT', x: 112, z: 30 },
  { name: 'HARBOURFRONT', x: -10, z: 105 },
  { name: 'DUSTLINE HIGHWAY', x: 0, z: -118 },
  { name: 'SCRUB FLATS', x: -100, z: -95 },
];

export const CAR_MODELS = [
  { name: 'Dust Runner', color: 0xc96a2e, top: 30, accel: 16 },
  { name: 'Harbor Cruiser', color: 0x3f6d8e, top: 28, accel: 14 },
  { name: 'Coyote GT', color: 0xb3202e, top: 38, accel: 20 },
  { name: 'Sandpiper Taxi', color: 0xd8a928, top: 26, accel: 13 },
  { name: 'Mirage Coupe', color: 0x8e9aa8, top: 34, accel: 18 },
  { name: 'Caliche Pickup', color: 0x7a6a4a, top: 29, accel: 15 },
  { name: 'Port Hauler', color: 0x4a7a3a, top: 24, accel: 11 },
  { name: 'Dune Buggy', color: 0xe07b39, top: 32, accel: 17 },
];

export const POLICE_UNITS = [
  { id: 'SIROCCO-1', officer: 'Ofc. Rami Sol' },
  { id: 'DUNE-2', officer: 'Ofc. Petra Voss' },
  { id: 'MIRAGE-3', officer: 'Sgt. Ansel Kade' },
  { id: 'CALICHE-4', officer: 'Ofc. Yara Lind' },
  { id: 'GIBSON-5', officer: 'Ofc. Milo Ferrer' },
];
export const HELI_UNIT = { id: 'DUSTHAWK-1', officer: 'Air-1 Cpt. Nia Brandt' };

export const RADIOS = ['DUST FM 91.7', 'HARBOR HEAT 104.3', 'COYOTE RADIO 88.1'];

// Storm cycle: calm -> warning -> storm -> calm (seconds).
export const STORM = { calm: 85, warning: 20, storm: 45 };

export const MISSIONS = [
  {
    id: 1, name: 'FIRST HAUL', reward: 250,
    brief: 'Ida Kline: "Four crates at the port, Joss. Bring them to my garage — no questions, no cops."',
    intro: 'IDA: "Port crates, four of them. My garage in Old Town. Move."',
    stages: [
      { type: 'collect', text: 'Collect the port crates', need: 4, at: [[108, 8], [118, 40], [104, 62], [124, 18]] },
      { type: 'goto', text: 'Deliver the crates to Ida\'s garage', at: [[-28, -18]] },
    ],
    done: 'IDA: "Clean work. The harbor owes you one."',
  },
  {
    id: 2, name: 'DUSTLINE RUN', reward: 400,
    brief: 'Bram Okafor: "Highway checkpoints, three of them, 75 seconds. Prove that Coyote GT is yours."',
    intro: 'BRAM: "Three gates on the highway. Beat the clock or walk home."',
    stages: [
      { type: 'timed', text: 'Hit the highway gates', time: 75, at: [[-90, -118], [0, -118], [90, -118]] },
    ],
    done: 'BRAM: "Seventy-five seconds of pure dust. You drive like the storm itself."',
  },
  {
    id: 3, name: 'THE HIJACK', reward: 550,
    brief: 'Ida Kline: "Sef stole my rig. Ram it three times till it stops — then take it back."',
    intro: 'IDA: "That is my rig. Ram it. Three good hits."',
    stages: [
      { type: 'chase', text: 'Ram Sef\'s stolen rig 3 times', need: 3 },
    ],
    done: 'SEF: "Fine! Take it! You drive like a maniac, Joss."',
  },
  {
    id: 4, name: 'SMOKE AND SAND', reward: 500,
    brief: 'Bram Okafor: "The PD is on you. Shake them in the storm, then reach the safehouse."',
    intro: 'BRAM: "Three stars and counting. Lose them, then come home."',
    stages: [
      { type: 'escape', text: 'Lose the police, then reach the safehouse', at: [[-105, -60]] },
    ],
    done: 'BRAM: "Ghosted them in the dust. The harbor never saw you."',
  },
  {
    id: 5, name: 'HOLD THE YARD', reward: 600,
    brief: 'Ida Kline: "Sef\'s crew is coming for the yard. Hold it for 60 seconds. Fists or pistol — your call."',
    intro: 'IDA: "They want the yard. They do not get the yard."',
    stages: [
      { type: 'defend', text: 'Defend the container yard', time: 60, at: [[112, 30]] },
    ],
    done: 'IDA: "Yard is ours. Sef will think twice next time."',
  },
  {
    id: 6, name: 'OUTRUN THE STORM', reward: 800,
    brief: 'Bram Okafor: "A dust wall is rolling in off the flats. Race it down the highway — last gate before it eats you."',
    intro: 'BRAM: "The storm is coming. Outrun it, gate to gate."',
    stages: [
      { type: 'stormrace', text: 'Beat the storm front to the last gate', time: 90, at: [[-110, -118], [-20, -118], [80, -118], [125, -118]] },
    ],
    done: 'BRAM: "You beat the wall itself. Dustline Harbor is yours, Joss."',
  },
];

export const INTRO_TEXT = 'Dustline Harbor — a sun-bleached port town where the desert meets the sea. Joss Marek, ex-hauler, owes Ida Kline a favour. The PD is watching. The storm is coming.';
