// EMBERWARDEN — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.
//
// The idea: light is both weapon and resource. The warden carries the last
// lantern through seven nights. Shadow wisps only move in the dark and freeze
// in light. Lighting the five braziers pushes the dark back; embers refill
// the lantern's fuel. Survive all seven nights and dawn breaks.
export const FIELD = { width: 1280, height: 720 };

/** Fixed simulation step, in seconds: 60 updates a second whatever the rate. */
export const STEP = 1 / 60;

/** Seven nights, each one longer and darker than the last. */
export const NIGHTS = 7;
export const NIGHT_SECONDS = 40;

export const PLAYER = {
  radius: 16,
  speed: 250,
  invulnerable: 2.0,
  /** Lantern light radius around the warden, in pixels. */
  lightRadius: 170,
  /** Aimed flare: a cone of light that freezes wisps and costs fuel. */
  flareCost: 9,
  flareCooldown: 0.9,
  flareRange: 330,
  flareHalfAngle: 0.55,
  flareFreeze: 2.6,
};

export const FUEL = {
  max: 100,
  /** Fuel burned per second just for keeping the lantern lit. */
  drainPerSecond: 0.85,
  /** Extra burn while standing in deep dark (no lit brazier nearby). */
  darkDrainPerSecond: 0.55,
  emberRefill: 16,
  start: 100,
};

export const LIVES = 3;

/** Five braziers around the map. Stand close and one lights after a channel. */
export const BEACONS = [
  { x: 150, y: 140 },
  { x: 1130, y: 140 },
  { x: 640, y: 110 },
  { x: 200, y: 580 },
  { x: 1080, y: 580 },
];
export const BEACON_RADIUS = 46;
export const BEACON_LIGHT_RADIUS = 210;
export const BEACON_CHANNEL = 1.4;

export const WISP = {
  radius: 15,
  /** Base speed; each night adds a little. */
  speed: 62,
  speedPerNight: 9,
  /** A flare freezes a wisp for this long (seconds). */
  freezeInLight: 0.6,
  /** How many wisps a night starts with, plus this many per night. */
  baseCount: 4,
  perNight: 2,
  touchDamage: 1,
};

export const EMBER = {
  radius: 9,
  /** Embers on the ground at the start of a night. */
  perNight: 6,
  /** Extra embers that drift in during a night. */
  dripInterval: 7,
};

export const PALETTE = {
  night: '#05070f',
  nightFar: '#0a0e22',
  ground: '#0d1120',
  groundLine: '#1a2140',
  gold: '#ffc857',
  goldHot: '#ffe9a8',
  ember: '#ff9a3c',
  wisp: '#8f7bff',
  wispEye: '#e6dcff',
  beaconCold: '#3a4668',
  beaconLit: '#ffb347',
  text: '#f5ead0',
  muted: '#9aa3c0',
  danger: '#ff5d5d',
  panel: 'rgba(8, 10, 24, 0.82)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Best (most nights survived) kept in this browser only. */
export const BEST_KEY = 'emberwarden.best';
