// EMBERWARDEN v2 — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.
//
// The idea: defend the village green of Ashwick around its central Beacon
// lantern. You are the warden on foot: flare light at the Murk, dash through
// it, light the lamps, spend embers between nights. Seven nights; dawn after
// night 7 is the win. The Beacon flame hitting 0, or losing all 3 lives,
// is the loss. Light is the weapon, embers are the currency.
export const FIELD = { width: 1280, height: 720 };

/** Fixed simulation step, in seconds: 60 updates a second whatever the rate. */
export const STEP = 1 / 60;

/** Seven nights, each 40 seconds of fighting plus a draft between them. */
export const NIGHTS = 7;
export const NIGHT_SECONDS = 40;

export const NIGHT_NAMES = [
  'The Murk Stirs',
  'Teeth in the Dark',
  'The Flickering',
  'Hollow Hours',
  'Mothers of Mist',
  'The Long Night',
  'THE LONG DARK',
];
/** Enemy type introduced on each night, for the NEXT preview. */
export const NIGHT_INTRO = ['', '', 'Flicker', 'Hollow', 'Wispmother', '', 'THE LONG DARK'];

export const PLAYER = {
  radius: 15,
  speed: 265,
  invulnerable: 2.0,
  /** Lantern light radius around the warden, in pixels. */
  lightRadius: 150,
  /** Flare: a cone of light that banishes the Murk. Damage, not freeze. */
  flareDamage: 1,
  flareCooldown: 1.1,
  flareRange: 320,
  flareHalfAngle: 0.52,
  /** Dash: a quick lunge with brief invulnerability. */
  dashCooldown: 2.2,
  dashDistance: 135,
  dashInvuln: 0.35,
  /** Pulse (Q): a radial burst that freezes everything near. */
  pulseCooldown: 6,
  pulseCost: 12,
  pulseRadius: 270,
  pulseFreeze: 2.5,
  /** Lamp (E): light the nearest unlit lamp post. */
  lampCost: 8,
  lampCooldown: 1.0,
  lampReach: 120,
};

export const BEACON = {
  x: 640,
  y: 372,
  radius: 34,
  flameMax: 100,
  flameStart: 100,
  /** Flame slowly rekindles while nothing gnaws at it. */
  regenPerSecond: 0.45,
  /** A gnawer chewing the Beacon drains this much flame per second. */
  gnawPerSecond: 2.5,
  bossGnawPerSecond: 4,
};

export const LIVES = 3;

/** Six lamp posts around the green. A lit lamp slows the Murk in its glow. */
export const LAMPS = [
  { x: 340, y: 200 },
  { x: 940, y: 200 },
  { x: 250, y: 400 },
  { x: 1030, y: 400 },
  { x: 380, y: 560 },
  { x: 900, y: 560 },
];
export const LAMP_RADIUS = 30;
export const LAMP_LIGHT_RADIUS = 150;
export const LAMP_SLOW = 0.5;

/** The Murk: six named kinds, each with its own look, speed and answer. */
export const ENEMY_TYPES = {
  gloomite: {
    name: 'Gloomite', plural: 'Gloomites', color: '#a78bff', dark: '#6d4fd0',
    radius: 13, hp: 1, speed: 58, score: 10, target: 'player',
    blurb: 'Swarms in packs — flare them in bunches',
  },
  gnawer: {
    name: 'Gnawer', plural: 'Gnawers', color: '#7ee081', dark: '#3d8a4a',
    radius: 16, hp: 2, speed: 42, score: 20, target: 'beacon',
    blurb: 'Chews the Beacon — stop it before it arrives',
  },
  douser: {
    name: 'Douser', plural: 'Dousers', color: '#6fc3ff', dark: '#2f6fb0',
    radius: 15, hp: 2, speed: 50, score: 25, target: 'lamp',
    blurb: 'Douses lit lamps — flare it first',
  },
  flicker: {
    name: 'Flicker', plural: 'Flickers', color: '#5ff2e0', dark: '#1f9d8e',
    radius: 13, hp: 1, speed: 74, score: 30, target: 'player',
    blurb: 'Blinks sideways — lead your flare',
  },
  hollow: {
    name: 'Hollow', plural: 'Hollows', color: '#c9d2e0', dark: '#7d8aa5',
    radius: 19, hp: 3, speed: 36, score: 40, target: 'player', shielded: true,
    blurb: 'Shell eats the first flare — hit it twice',
  },
  wispmother: {
    name: 'Wispmother', plural: 'Wispmothers', color: '#ff7ad9', dark: '#b03a8c',
    radius: 24, hp: 4, speed: 30, score: 50, target: 'player', splits: 3,
    blurb: 'Bursts into Gloomites — keep your distance',
  },
};

/** Boss of night 7. */
export const BOSS = {
  name: 'THE LONG DARK',
  color: '#2a0a3d', dark: '#12041f', eye: '#ff4d6d',
  radius: 46, hp: 320, speed: 27, score: 1000,
  /** Trickle of Gloomites it calls while it lives. */
  spawnInterval: 6,
};

/** How many of each kind a night sends (before difficulty modifiers). */
export const NIGHT_WAVES = [
  { gloomite: 10, gnawer: 2 },
  { gloomite: 12, gnawer: 3, douser: 2 },
  { gloomite: 14, gnawer: 4, douser: 3, flicker: 3 },
  { gloomite: 16, gnawer: 5, douser: 4, flicker: 4, hollow: 2 },
  { gloomite: 18, gnawer: 6, douser: 5, flicker: 5, hollow: 3, wispmother: 1 },
  { gloomite: 20, gnawer: 7, douser: 6, flicker: 6, hollow: 4, wispmother: 2 },
  { gnawer: 4, douser: 3 },
];

export const EMBER = {
  radius: 9,
  /** Embers on the ground at the start of a night. */
  perNight: 7,
  /** Extra embers that drift in during a night. */
  dripInterval: 6,
};

/** Chain: kills without taking a hit build a multiplier, capped at x8. */
export const CHAIN = {
  windowSeconds: 3,
  perStep: 4,
  maxMult: 8,
};

/** Three tides on the title screen. */
export const DIFFICULTIES = [
  {
    key: 'gentle', num: 1, name: 'Ember Glow', tag: 'GENTLE',
    desc: 'Fewer, softer Murk. A first watch.',
    lines: ['Murk −35%', 'Beacon harm −50%', 'Oil +30'],
    spawnMult: 0.65, speedMult: 0.9, harmMult: 0.5, scoreMult: 1, startEmbers: 30,
    best: 24308,
  },
  {
    key: 'standard', num: 2, name: 'Night Watch', tag: 'STANDARD',
    desc: 'The watch as Ashwick knows it.',
    lines: ['Seven nights', 'THE LONG DARK on night 7', 'Score ×1'],
    spawnMult: 1, speedMult: 1, harmMult: 1, scoreMult: 1, startEmbers: 0,
    best: 46975,
  },
  {
    key: 'hard', num: 3, name: 'Long Dark', tag: 'HARD',
    desc: 'More Murk, tougher, hungrier.',
    lines: ['Murk +17%', 'Beacon harm +22%', 'Score ×1.5'],
    spawnMult: 1.17, speedMult: 1.08, harmMult: 1.22, scoreMult: 1.5, startEmbers: 0,
    best: 0,
  },
];

/** Relic boons offered between nights. Each can be held once. */
export const RELIC_POOL = [
  { key: 'emberheart', name: 'Emberheart', family: 'FLAME', effect: '+30 max flame, mend 25 now', desc: 'The Beacon burns deeper and steadier.' },
  { key: 'fleetstep', name: 'Fleetstep', family: 'WIND', effect: '+15% move speed', desc: 'Your boots remember every shortcut.' },
  { key: 'brightwick', name: 'Brightwick', family: 'LENS', effect: '+30% flare reach', desc: 'The beam stretches further into the dark.' },
  { key: 'dawnbell', name: 'Dawn Bell', family: 'BELL', effect: 'Chain lasts 5s instead of 3s', desc: 'Its note holds the tally a little longer.' },
  { key: 'ironwick', name: 'Iron Wick', family: 'FLAME', effect: 'Flare deals +1 damage', desc: 'A harder heart to the lantern.' },
  { key: 'cinderpouch', name: 'Cinder Pouch', family: 'EMBER', effect: '+1 ember per kill', desc: 'Every banished shadow pays a little more.' },
  { key: 'thornbrand', name: 'Thornbrand', family: 'WIND', effect: 'Dash banishes what it passes through', desc: 'Leave a burning line behind you.' },
  { key: 'hearthstone', name: 'Hearthstone', family: 'FLAME', effect: 'Restore 1 life', desc: 'Warmth kept in a stone for a hard night.' },
];

/** Pacts: much, for a price. Offered as the third draft card. */
export const PACT_POOL = [
  { key: 'ashentithe', name: 'Ashen Tithe', family: 'PACT · TRADE-OFF', effect: '+60% score', price: 'Beacon harm +25%', desc: 'The dark takes its cut from the flame.' },
  { key: 'hollowvow', name: 'Hollow Vow', family: 'PACT · TRADE-OFF', effect: 'Flare recharges 40% faster', price: 'Dash recharges 50% slower', desc: 'Quick light, slow feet.' },
  { key: 'gloompact', name: 'Gloom Pact', family: 'PACT · TRADE-OFF', effect: '+1 ember per kill', price: 'Lamps cost +4 embers', desc: 'Rich pockets, thirsty lamps.' },
];

/** The between-night shop. */
export const SHOP = [
  { key: 'mend', num: 4, name: 'Mend', desc: '+25 flame', cost: 20 },
  { key: 'oil', num: 5, name: 'Oil Cask', desc: '+30 max flame', cost: 30 },
  { key: 'reroll', num: 6, name: 'Reroll', desc: 'New boons', cost: 10 },
];

/** The village itself: houses, trees, hedges, paths — fixed, so every
 * screenshot shows the same real place. */
export const HOUSES = [
  { x: 150, y: 300, w: 74, h: 56, roof: '#7a4a2f' },
  { x: 1050, y: 270, w: 80, h: 60, roof: '#5d3a5e' },
  { x: 180, y: 500, w: 66, h: 50, roof: '#3f5e3a' },
  { x: 1030, y: 520, w: 72, h: 54, roof: '#7a4a2f' },
  { x: 480, y: 130, w: 62, h: 46, roof: '#4a4a6e' },
  { x: 780, y: 140, w: 66, h: 48, roof: '#3f5e3a' },
];
export const TREES = [
  { x: 270, y: 150 }, { x: 1010, y: 130 }, { x: 120, y: 420 },
  { x: 1160, y: 430 }, { x: 470, y: 620 }, { x: 830, y: 630 },
  { x: 560, y: 210 }, { x: 730, y: 220 }, { x: 210, y: 610 },
  { x: 1090, y: 620 },
];
export const HEDGES = [
  { x: 420, y: 300, w: 90, h: 18 },
  { x: 770, y: 300, w: 90, h: 18 },
  { x: 420, y: 470, w: 90, h: 18 },
  { x: 770, y: 470, w: 90, h: 18 },
];

export const PALETTE = {
  night: '#070a18',
  nightFar: '#0b1026',
  ground: '#101a2e',
  groundPath: '#1c2742',
  groundLine: '#232f52',
  grass: '#14291f',
  gold: '#ffc857',
  goldHot: '#ffe9a8',
  ember: '#ff9a3c',
  wisp: '#8f7bff',
  wispEye: '#e6dcff',
  beaconLit: '#ffb347',
  text: '#f5ead0',
  muted: '#9aa3c0',
  danger: '#ff5d5d',
  green: '#7ee081',
  panel: 'rgba(8, 10, 24, 0.86)',
  panelEdge: 'rgba(255, 200, 87, 0.35)',
  win: '#37d67a',
  lose: '#ff5d5d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Best score kept in this browser only. */
export const BEST_KEY = 'emberwarden.best.score';
