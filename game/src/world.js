// The night simulation: the warden, the wisps, the braziers, the embers and
// the fuel. Pure state plus one step() — no drawing, no input here.
//
// Rules, in one place:
// - Wisps drift toward the warden. In the light they crawl at a fraction of
//   their speed; a flare freezes them outright. Light is the weapon.
// - Fuel drains every second and faster in deep dark. Embers refill it.
// - Stand beside an unlit brazier for BEACON_CHANNEL seconds and it lights,
//   pushing the dark back around it. All five lit makes the night safer.
// - A wisp touching the warden costs one life and knocks the warden away.
// - A night lasts NIGHT_SECONDS. Survive night 7 with any fuel left and dawn
//   breaks: you win. Lose all 3 lives, or run out of fuel in the dark, and
//   the dark takes you.
import {
  BEACON_CHANNEL, BEACON_LIGHT_RADIUS, BEACON_RADIUS, BEACONS, EMBER,
  FIELD, FUEL, LIVES, NIGHTS, NIGHT_SECONDS, PLAYER, STEP, WISP,
} from './config.js';
import { createRandom } from './random.js';

export const EVENT_EMBER = 'ember';
export const EVENT_BEACON = 'beacon';
export const EVENT_FLARE = 'flare';
export const EVENT_HIT = 'hit';
export const EVENT_NIGHT = 'night';
export const EVENT_WIN = 'win';
export const EVENT_OVER = 'over';

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function spawnWisp(random, night) {
  // Wisps crawl in from a random edge, outside the lantern's glow.
  const side = random.int(0, 3);
  const m = 30;
  let x, y;
  if (side === 0) { x = random.range(m, FIELD.width - m); y = m; }
  else if (side === 1) { x = random.range(m, FIELD.width - m); y = FIELD.height - m; }
  else if (side === 2) { x = m; y = random.range(m, FIELD.height - m); }
  else { x = FIELD.width - m; y = random.range(m, FIELD.height - m); }
  return { x, y, frozen: 0, wobble: random.range(0, Math.PI * 2), speed: WISP.speed + (night - 1) * WISP.speedPerNight };
}

function spawnEmber(random) {
  return {
    x: random.range(80, FIELD.width - 80),
    y: random.range(90, FIELD.height - 70),
    phase: random.range(0, Math.PI * 2),
    taken: false,
  };
}

export function createWorld(seed) {
  const random = createRandom(seed);
  const events = [];
  const state = {
    night: 1,
    nightTime: 0,
    fuel: FUEL.start,
    lives: LIVES,
    score: 0,
    beaconsLit: 0,
    embersCollected: 0,
    wispsBanished: 0,
    channel: 0,
    channelBeacon: -1,
    flareCooldown: 0,
    flareFlash: 0,
    flareAngle: -Math.PI / 2,
    flareX: 0,
    flareY: 0,
    invulnerable: 0,
    over: false,
    won: false,
    overReason: '',
    player: { x: FIELD.width / 2, y: FIELD.height / 2 + 60, vx: 0, vy: 0 },
    wisps: [],
    embers: [],
    beacons: BEACONS.map((b) => ({ x: b.x, y: b.y, lit: false })),
    particles: [],
    dripTimer: EMBER.dripInterval,
  };

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = random.range(0, Math.PI * 2);
      const s = random.range(speed * 0.3, speed);
      state.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: random.range(0.4, 0.9), max: 0.9, color,
        size: random.range(2, 5),
      });
    }
  }

  function startNight(night) {
    state.night = night;
    state.nightTime = 0;
    state.channel = 0;
    state.channelBeacon = -1;
    state.dripTimer = EMBER.dripInterval;
    // Braziers stay lit between nights; the dark only grows thicker.
    const count = WISP.baseCount + (night - 1) * WISP.perNight;
    state.wisps = [];
    for (let i = 0; i < count; i++) state.wisps.push(spawnWisp(random, night));
    state.embers = [];
    for (let i = 0; i < EMBER.perNight; i++) state.embers.push(spawnEmber(random));
    events.push(EVENT_NIGHT);
  }

  function litRadiusAt(x, y) {
    if (dist(x, y, state.player.x, state.player.y) < PLAYER.lightRadius) return true;
    for (const b of state.beacons) {
      if (b.lit && dist(x, y, b.x, b.y) < BEACON_LIGHT_RADIUS) return true;
    }
    return false;
  }

  function endGame(won, reason) {
    if (state.over) return;
    state.over = true;
    state.won = won;
    state.overReason = reason;
    events.push(won ? EVENT_WIN : EVENT_OVER);
  }

  startNight(1);

  return {
    state,
    /** Events since the last step, drained by the caller. */
    takeEvents() {
      return events.splice(0, events.length);
    },
    litAt(x, y) {
      return litRadiusAt(x, y);
    },
    step(input) {
      if (state.over) return;
      const dt = STEP;
      const p = state.player;

      // --- steering ---
      const s = input.steer();
      p.x = Math.min(FIELD.width - 24, Math.max(24, p.x + s.x * PLAYER.speed * dt));
      p.y = Math.min(FIELD.height - 24, Math.max(64, p.y + s.y * PLAYER.speed * dt));

      // --- aim + flare ---
      const aim = input.aim();
      state.flareAngle = Math.atan2(aim.y - p.y, aim.x - p.x);
      if (state.flareCooldown > 0) state.flareCooldown -= dt;
      if (state.flareFlash > 0) state.flareFlash -= dt;
      if ((input.flare || false) && state.flareCooldown <= 0 && state.fuel > PLAYER.flareCost) {
        state.fuel -= PLAYER.flareCost;
        state.flareCooldown = PLAYER.flareCooldown;
        state.flareFlash = 0.45;
        state.flareX = p.x + Math.cos(state.flareAngle) * 140;
        state.flareY = p.y + Math.sin(state.flareAngle) * 140;
        for (const w of state.wisps) {
          const d = dist(w.x, w.y, p.x, p.y);
          const ang = Math.atan2(w.y - p.y, w.x - p.x);
          let da = Math.abs(ang - state.flareAngle);
          if (da > Math.PI) da = Math.PI * 2 - da;
          if (d < PLAYER.flareRange && da < PLAYER.flareHalfAngle) {
            w.frozen = Math.max(w.frozen, PLAYER.flareFreeze);
          }
        }
        burst(state.flareX, state.flareY, '#ffe9a8', 14, 160);
        events.push(EVENT_FLARE);
      }

      // --- fuel: the lantern always burns, faster in deep dark ---
      const inLight = litRadiusAt(p.x, p.y);
      state.fuel -= (FUEL.drainPerSecond + (inLight ? 0 : FUEL.darkDrainPerSecond)) * dt;
      if (state.fuel <= 0) {
        state.fuel = 0;
        endGame(false, 'The lantern went out in the dark.');
        return;
      }
      if (state.invulnerable > 0) state.invulnerable -= dt;

      // --- braziers: stand close to channel one alight ---
      let near = -1;
      state.beacons.forEach((b, i) => {
        if (!b.lit && dist(p.x, p.y, b.x, b.y) < BEACON_RADIUS + 30) near = i;
      });
      if (near >= 0) {
        if (state.channelBeacon !== near) { state.channelBeacon = near; state.channel = 0; }
        state.channel += dt;
        if (state.channel >= BEACON_CHANNEL) {
          const b = state.beacons[near];
          b.lit = true;
          state.beaconsLit += 1;
          state.score += 50;
          state.channel = 0;
          state.channelBeacon = -1;
          burst(b.x, b.y, '#ffb347', 26, 220);
          events.push(EVENT_BEACON);
        }
      } else {
        state.channel = 0;
        state.channelBeacon = -1;
      }

      // --- embers: walk over one to feed the lantern ---
      for (const e of state.embers) {
        if (!e.taken && dist(p.x, p.y, e.x, e.y) < PLAYER.radius + EMBER.radius + 6) {
          e.taken = true;
          state.fuel = Math.min(FUEL.max, state.fuel + FUEL.emberRefill);
          state.embersCollected += 1;
          state.score += 10;
          burst(e.x, e.y, '#ff9a3c', 10, 120);
          events.push(EVENT_EMBER);
        }
      }
      state.embers = state.embers.filter((e) => !e.taken);
      state.dripTimer -= dt;
      if (state.dripTimer <= 0) {
        state.dripTimer = EMBER.dripInterval;
        state.embers.push(spawnEmber(random));
      }

      // --- wisps: they only move in the dark; light freezes them ---
      for (const w of state.wisps) {
        if (w.frozen > 0) { w.frozen -= dt; continue; }
        // Light holds wisps back but does not stop them outright: in the
        // glow they crawl at a fraction of their speed, so standing still
        // forever is not safe — the dark always closes in. A flare freezes
        // them completely. That is what makes the lantern a weapon, not a wall.
        const inLight = litRadiusAt(w.x, w.y);
        const speedFactor = inLight ? 0.16 : 1;
        w.wobble += dt * 2;
        const dx = p.x - w.x;
        const dy = p.y - w.y;
        const d = Math.hypot(dx, dy) || 1;
        const wob = Math.sin(w.wobble) * 0.35;
        const nx = dx / d;
        const ny = dy / d;
        w.x += (nx - ny * wob) * w.speed * speedFactor * dt;
        w.y += (ny + nx * wob) * w.speed * speedFactor * dt;
        // A touch costs a life — unless the warden just got hit.
        if (state.invulnerable <= 0 && dist(w.x, w.y, p.x, p.y) < WISP.radius + PLAYER.radius - 4) {
          state.lives -= 1;
          state.invulnerable = PLAYER.invulnerable;
          state.score = Math.max(0, state.score - 25);
          burst(p.x, p.y, '#8f7bff', 18, 200);
          // Knock the wisp back into the dark so one touch is one hit.
          w.x -= nx * 90;
          w.y -= ny * 90;
          w.frozen = 1.2;
          events.push(EVENT_HIT);
          if (state.lives <= 0) {
            endGame(false, 'The wisps closed in and the light went out.');
            return;
          }
        }
      }

      // --- particles fade ---
      for (const pt of state.particles) {
        pt.life -= dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vx *= 0.96;
        pt.vy *= 0.96;
      }
      state.particles = state.particles.filter((pt) => pt.life > 0);

      // --- the night ends, dawn or the next night ---
      state.nightTime += dt;
      if (state.nightTime >= NIGHT_SECONDS) {
        state.score += 100 + state.beaconsLit * 20;
        if (state.night >= NIGHTS) {
          endGame(true, 'Dawn breaks over the seventh night.');
        } else {
          startNight(state.night + 1);
        }
      }
    },
  };
}
