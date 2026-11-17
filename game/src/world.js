// The night simulation: the warden, the Murk, the Beacon, the lamps and the
// embers. Pure state plus one step() — no drawing, no input here.
//
// Rules, in one place:
// - The Murk crawls in from the edges. Gnawers chew the Beacon, Dousers put
//   out lit lamps, the rest hunt the warden. A lit lamp slows them in its glow.
// - LMB flare is a cone of light that banishes what it catches. SPACE dashes
//   through danger. E lights the nearest unlit lamp (costs embers). Q pulses
//   a freezing burst (costs embers).
// - Kills without taking a hit build a CHAIN multiplier, up to x8; a hit
//   resets it. Kills drop embers — the currency for lamps, pulses, the
//   between-night draft and shop.
// - A night lasts 40 seconds. Survive it and pick 1 of 3 boons at dawn
//   (two relics, one pact with a trade-off), spend embers in the shop, then
//   the next night comes. Night 7 ends only when THE LONG DARK is banished:
//   then dawn breaks and you win. Beacon flame 0, or 3 lives lost, and the
//   dark takes you.
import {
  BEACON, BOSS, CHAIN, DIFFICULTIES, EMBER, ENEMY_TYPES, FIELD, LAMPS,
  LAMP_LIGHT_RADIUS, LAMP_RADIUS, NIGHTS, NIGHT_SECONDS, NIGHT_WAVES,
  PACT_POOL, PLAYER, RELIC_POOL, STEP,
} from './config.js';
import { createRandom } from './random.js';

export const EVENT_EMBER = 'ember';
export const EVENT_BEACON = 'beacon';
export const EVENT_FLARE = 'flare';
export const EVENT_HIT = 'hit';
export const EVENT_NIGHT = 'night';
export const EVENT_WIN = 'win';
export const EVENT_OVER = 'over';
export const EVENT_DASH = 'dash';
export const EVENT_PULSE = 'pulse';
export const EVENT_BOON = 'boon';
export const EVENT_BOSS = 'boss';

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function createWorld(seed, difficultyKey = 'standard') {
  const random = createRandom(seed);
  const difficulty = DIFFICULTIES.find((d) => d.key === difficultyKey) || DIFFICULTIES[1];
  const events = [];
  const state = {
    difficulty,
    night: 1,
    nightTime: 0,
    timePlayed: 0,
    flame: BEACON.flameStart,
    flameMax: BEACON.flameMax,
    lives: 3,
    score: 0,
    embers: difficulty.startEmbers,
    embersBanked: 0,
    chain: 0,
    chainTimer: 0,
    bestChain: 0,
    chainMult: 1,
    kills: 0,
    embersCollected: 0,
    lampsLit: 0,
    flareCooldown: 0,
    flareFlash: 0,
    flareAngle: -Math.PI / 2,
    flareX: 0,
    flareY: 0,
    dashCooldown: 0,
    dashTimer: 0,
    pulseCooldown: 0,
    lampCooldown: 0,
    lampChannel: 0,
    lampTarget: -1,
    invulnerable: 0,
    over: false,
    won: false,
    overReason: '',
    boss: null,
    bossSpawnTimer: 0,
    spawnQueue: [],
    spawnTimer: 0,
    incoming: {},
    nextIncoming: {},
    relicsHeld: [],
    pactsHeld: [],
    draft: null,
    // Relic modifiers, all starting at their base values.
    speedMult: 1,
    flareRangeMult: 1,
    flareDamageBonus: 0,
    chainWindow: CHAIN.windowSeconds,
    emberPerKill: 1,
    dashDamage: false,
    scoreMult: difficulty.scoreMult,
    harmMult: difficulty.harmMult,
    player: { x: FIELD.width / 2, y: FIELD.height / 2 + 130, vx: 0, vy: 0 },
    enemies: [],
    groundEmbers: [],
    lamps: LAMPS.map((l) => ({ x: l.x, y: l.y, lit: false, douse: 0 })),
    particles: [],
    floaters: [],
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

  function floater(x, y, text, color) {
    state.floaters.push({ x, y, text, color, life: 1.1, max: 1.1 });
  }

  function edgeSpawn() {
    const side = random.int(0, 3);
    const m = 26;
    if (side === 0) return { x: random.range(m, FIELD.width - m), y: m };
    if (side === 1) return { x: random.range(m, FIELD.width - m), y: FIELD.height - m };
    if (side === 2) return { x: m, y: random.range(m, FIELD.height - m) };
    return { x: FIELD.width - m, y: random.range(m, FIELD.height - m) };
  }

  function makeEnemy(type, x, y) {
    const def = ENEMY_TYPES[type];
    return {
      type, x, y,
      hp: def.hp, maxHp: def.hp,
      speed: def.speed * difficulty.speedMult * random.range(0.9, 1.1),
      frozen: 0, wobble: random.range(0, Math.PI * 2),
      shield: Boolean(def.shielded), blink: random.range(1.5, 2.5),
      douse: 0,
    };
  }

  function spawnGroundEmber() {
    state.groundEmbers.push({
      x: random.range(90, FIELD.width - 90),
      y: random.range(110, FIELD.height - 60),
      phase: random.range(0, Math.PI * 2),
      taken: false,
    });
  }

  function waveCounts(night) {
    const wave = NIGHT_WAVES[night - 1];
    const out = {};
    for (const [type, n] of Object.entries(wave)) {
      out[type] = Math.max(1, Math.round(n * difficulty.spawnMult));
    }
    return out;
  }

  function refreshIncoming() {
    const counts = {};
    for (const t of state.spawnQueue) counts[t] = (counts[t] || 0) + 1;
    for (const e of state.enemies) counts[e.type] = (counts[e.type] || 0) + 1;
    if (state.boss) counts.boss = 1;
    state.incoming = counts;
    state.nextIncoming = state.night < NIGHTS ? waveCounts(state.night + 1) : {};
  }

  function startNight(night) {
    state.night = night;
    state.nightTime = 0;
    state.channel = 0;
    state.dripTimer = EMBER.dripInterval;
    state.spawnTimer = 0.5;
    state.spawnQueue = [];
    const wave = waveCounts(night);
    for (const [type, n] of Object.entries(wave)) {
      for (let i = 0; i < n; i++) state.spawnQueue.push(type);
    }
    // Shuffle the queue so kinds arrive mixed.
    for (let i = state.spawnQueue.length - 1; i > 0; i--) {
      const j = random.int(0, i);
      [state.spawnQueue[i], state.spawnQueue[j]] = [state.spawnQueue[j], state.spawnQueue[i]];
    }
    state.enemies = [];
    state.groundEmbers = [];
    for (let i = 0; i < EMBER.perNight; i++) spawnGroundEmber();
    state.boss = null;
    state.bossSpawnTimer = BOSS.spawnInterval;
    if (night === NIGHTS) {
      const p = edgeSpawn();
      state.boss = {
        type: 'boss', x: p.x, y: p.y, hp: BOSS.hp, maxHp: BOSS.hp,
        speed: BOSS.speed, frozen: 0, wobble: 0, shield: false, blink: 0, douse: 0,
      };
      events.push(EVENT_BOSS);
    }
    refreshIncoming();
    events.push(EVENT_NIGHT);
  }

  function pickDraft() {
    const relics = RELIC_POOL.filter((r) => !state.relicsHeld.includes(r.key));
    const pacts = PACT_POOL.filter((p) => !state.pactsHeld.includes(p.key));
    const cards = [];
    const shuffled = [...relics].sort(() => random.next() - 0.5);
    for (const r of shuffled.slice(0, 2)) cards.push({ kind: 'relic', ...r });
    if (pacts.length > 0) {
      const p = pacts[Math.floor(random.next() * pacts.length)];
      cards.push({ kind: 'pact', ...p });
    } else if (shuffled.length > 2) {
      cards.push({ kind: 'relic', ...shuffled[2] });
    }
    state.draft = { cards, nightDone: state.night };
  }

  function applyRelic(key) {
    state.relicsHeld.push(key);
    if (key === 'emberheart') {
      state.flameMax += 30;
      state.flame = Math.min(state.flameMax, state.flame + 25);
    } else if (key === 'fleetstep') state.speedMult += 0.15;
    else if (key === 'brightwick') state.flareRangeMult += 0.3;
    else if (key === 'dawnbell') state.chainWindow = 5;
    else if (key === 'ironwick') state.flareDamageBonus += 1;
    else if (key === 'cinderpouch') state.emberPerKill += 1;
    else if (key === 'thornbrand') state.dashDamage = true;
    else if (key === 'hearthstone') state.lives = Math.min(3, state.lives + 1);
  }

  function applyPact(key) {
    state.pactsHeld.push(key);
    if (key === 'ashentithe') {
      state.scoreMult += 0.6;
      state.harmMult += 0.25;
    } else if (key === 'hollowvow') {
      // Flare cooldown handled in step via pactsHeld.
    } else if (key === 'gloompact') {
      state.emberPerKill += 1;
    }
  }

  function endGame(won, reason) {
    if (state.over) return;
    state.over = true;
    state.won = won;
    state.overReason = reason;
    events.push(won ? EVENT_WIN : EVENT_OVER);
  }

  function litRadiusAt(x, y) {
    if (dist(x, y, state.player.x, state.player.y) < PLAYER.lightRadius) return true;
    for (const l of state.lamps) {
      if (l.lit && dist(x, y, l.x, l.y) < LAMP_LIGHT_RADIUS) return true;
    }
    return false;
  }

  function lampSlowAt(x, y) {
    for (const l of state.lamps) {
      if (l.lit && dist(x, y, l.x, l.y) < LAMP_LIGHT_RADIUS) return true;
    }
    return false;
  }

  function killEnemy(e, index) {
    const def = ENEMY_TYPES[e.type];
    state.kills += 1;
    state.chain += 1;
    state.chainTimer = state.chainWindow;
    state.bestChain = Math.max(state.bestChain, state.chain);
    state.chainMult = Math.min(CHAIN.maxMult, 1 + Math.floor(state.chain / CHAIN.perStep));
    const gain = Math.round(def.score * state.chainMult * state.scoreMult);
    state.score += gain;
    floater(e.x, e.y - 18, `+${gain}`, '#ffe9a8');
    burst(e.x, e.y, def.color, 16, 190);
    // Embers drop: one pickup per kill, plus relic bonus as instant currency.
    state.groundEmbers.push({
      x: Math.max(60, Math.min(FIELD.width - 60, e.x + random.range(-24, 24))),
      y: Math.max(100, Math.min(FIELD.height - 40, e.y + random.range(-24, 24))),
      phase: random.range(0, Math.PI * 2), taken: false,
    });
    if (state.emberPerKill > 1) {
      state.embers += state.emberPerKill - 1;
      state.embersBanked += state.emberPerKill - 1;
    }
    if (ENEMY_TYPES[e.type].splits) {
      for (let i = 0; i < ENEMY_TYPES[e.type].splits; i++) {
        state.enemies.push(makeEnemy('gloomite', e.x + random.range(-30, 30), e.y + random.range(-30, 30)));
      }
    }
    state.enemies.splice(index, 1);
  }

  function damageEnemy(e, index, dmg) {
    if (e.shield) {
      e.shield = false;
      burst(e.x, e.y, '#c9d2e0', 10, 140);
      floater(e.x, e.y - 18, 'SHELL BROKEN', '#c9d2e0');
      return;
    }
    e.hp -= dmg;
    if (e.hp <= 0) killEnemy(e, index);
  }

  startNight(1);

  return {
    state,
    takeEvents() {
      return events.splice(0, events.length);
    },
    litAt(x, y) {
      return litRadiusAt(x, y);
    },
    /** Between-night draft: pick card i (0-2). Returns false if none. */
    chooseBoon(i) {
      if (!state.draft || !state.draft.cards[i]) return false;
      const card = state.draft.cards[i];
      if (card.kind === 'relic') applyRelic(card.key);
      else applyPact(card.key);
      state.draft = null;
      events.push(EVENT_BOON);
      return true;
    },
    /** Shop: mend (0), oil (1), reroll (2). Returns false if unaffordable. */
    buyShop(i) {
      if (i === 0) {
        if (state.embers < 20) return false;
        state.embers -= 20;
        state.flame = Math.min(state.flameMax, state.flame + 25);
      } else if (i === 1) {
        if (state.embers < 30) return false;
        state.embers -= 30;
        state.flameMax += 30;
        state.flame = Math.min(state.flameMax, state.flame + 30);
      } else if (i === 2) {
        if (state.embers < 10 || !state.draft) return false;
        state.embers -= 10;
        const done = state.draft.nightDone;
        pickDraft();
        state.draft.nightDone = done;
      } else return false;
      events.push(EVENT_BOON);
      return true;
    },
    /** Dawn: end the draft and start the next night. */
    nextNight() {
      if (state.night >= NIGHTS) return;
      startNight(state.night + 1);
    },
    /** Skip the draft with no boon. */
    skipDraft() {
      state.draft = null;
    },
    step(input) {
      if (state.over || state.draft) return;
      const dt = STEP;
      const p = state.player;
      state.timePlayed += dt;

      // --- steering + dash ---
      const s = input.steer();
      const speed = PLAYER.speed * state.speedMult;
      p.x = Math.min(FIELD.width - 24, Math.max(24, p.x + s.x * speed * dt));
      p.y = Math.min(FIELD.height - 24, Math.max(84, p.y + s.y * speed * dt));
      if (state.dashCooldown > 0) state.dashCooldown -= dt;
      if (state.dashTimer > 0) state.dashTimer -= dt;
      if (input.dash && state.dashCooldown <= 0) {
        const dashCd = state.pactsHeld.includes('hollowvow') ? PLAYER.dashCooldown * 1.5 : PLAYER.dashCooldown;
        state.dashCooldown = dashCd;
        state.dashTimer = 0.3;
        state.invulnerable = Math.max(state.invulnerable, PLAYER.dashInvuln);
        const dx = s.x !== 0 || s.y !== 0 ? s : { x: Math.cos(state.flareAngle), y: Math.sin(state.flareAngle) };
        const len = Math.hypot(dx.x, dx.y) || 1;
        const nx = p.x + (dx.x / len) * PLAYER.dashDistance;
        const ny = p.y + (dx.y / len) * PLAYER.dashDistance;
        // Thornbrand: the dash line banishes what it crosses.
        if (state.dashDamage) {
          for (let i = state.enemies.length - 1; i >= 0; i--) {
            const e = state.enemies[i];
            const midX = (p.x + nx) / 2;
            const midY = (p.y + ny) / 2;
            if (dist(e.x, e.y, midX, midY) < PLAYER.dashDistance / 2 + 20) damageEnemy(e, i, 1);
          }
        }
        p.x = Math.min(FIELD.width - 24, Math.max(24, nx));
        p.y = Math.min(FIELD.height - 24, Math.max(84, ny));
        burst(p.x, p.y, '#ffe9a8', 10, 120);
        events.push(EVENT_DASH);
      }

      // --- aim + flare ---
      const aim = input.aim();
      state.flareAngle = Math.atan2(aim.y - p.y, aim.x - p.x);
      if (state.flareCooldown > 0) state.flareCooldown -= dt;
      if (state.flareFlash > 0) state.flareFlash -= dt;
      const flareCd = state.pactsHeld.includes('hollowvow') ? PLAYER.flareCooldown * 0.6 : PLAYER.flareCooldown;
      if (input.flare && state.flareCooldown <= 0) {
        state.flareCooldown = flareCd;
        state.flareFlash = 0.4;
        state.flareX = p.x + Math.cos(state.flareAngle) * 130;
        state.flareY = p.y + Math.sin(state.flareAngle) * 130;
        const range = PLAYER.flareRange * state.flareRangeMult;
        const dmg = PLAYER.flareDamage + state.flareDamageBonus;
        for (let i = state.enemies.length - 1; i >= 0; i--) {
          const e = state.enemies[i];
          const d = dist(e.x, e.y, p.x, p.y);
          const ang = Math.atan2(e.y - p.y, e.x - p.x);
          let da = Math.abs(ang - state.flareAngle);
          if (da > Math.PI) da = Math.PI * 2 - da;
          if (d < range && da < PLAYER.flareHalfAngle) damageEnemy(e, i, dmg);
        }
        if (state.boss) {
          const d = dist(state.boss.x, state.boss.y, p.x, p.y);
          const ang = Math.atan2(state.boss.y - p.y, state.boss.x - p.x);
          let da = Math.abs(ang - state.flareAngle);
          if (da > Math.PI) da = Math.PI * 2 - da;
          if (d < range && da < PLAYER.flareHalfAngle) {
            state.boss.hp -= dmg;
            floater(state.boss.x, state.boss.y - 50, `-${dmg}`, '#ffe9a8');
          }
        }
        burst(state.flareX, state.flareY, '#ffe9a8', 12, 150);
        events.push(EVENT_FLARE);
      }

      // --- pulse (Q): freeze everything near, costs embers ---
      if (state.pulseCooldown > 0) state.pulseCooldown -= dt;
      if (input.pulse && state.pulseCooldown <= 0 && state.embers >= PLAYER.pulseCost) {
        state.embers -= PLAYER.pulseCost;
        state.pulseCooldown = PLAYER.pulseCooldown;
        for (const e of state.enemies) {
          if (dist(e.x, e.y, p.x, p.y) < PLAYER.pulseRadius) e.frozen = Math.max(e.frozen, PLAYER.pulseFreeze);
        }
        if (state.boss && dist(state.boss.x, state.boss.y, p.x, p.y) < PLAYER.pulseRadius) {
          state.boss.frozen = Math.max(state.boss.frozen, PLAYER.pulseFreeze);
        }
        burst(p.x, p.y, '#9fd8ff', 22, 260);
        events.push(EVENT_PULSE);
      }

      // --- lamp (E): light the nearest unlit lamp ---
      if (state.lampCooldown > 0) state.lampCooldown -= dt;
      const lampCost = PLAYER.lampCost + (state.pactsHeld.includes('gloompact') ? 4 : 0);
      if (input.lamp && state.lampCooldown <= 0 && state.embers >= lampCost) {
        let bestIdx = -1;
        let bestD = PLAYER.lampReach + 60;
        state.lamps.forEach((l, i) => {
          if (!l.lit) {
            const d = dist(p.x, p.y, l.x, l.y);
            if (d < bestD) { bestD = d; bestIdx = i; }
          }
        });
        if (bestIdx >= 0) {
          state.embers -= lampCost;
          state.lampCooldown = PLAYER.lampCooldown;
          const l = state.lamps[bestIdx];
          l.lit = true;
          state.lampsLit += 1;
          state.score += 25;
          burst(l.x, l.y, '#ffb347', 22, 200);
          events.push(EVENT_BEACON);
        }
      }
      if (state.invulnerable > 0) state.invulnerable -= dt;

      // --- spawning ---
      if (state.spawnQueue.length > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          state.spawnTimer = 0.85;
          const type = state.spawnQueue.shift();
          const pos = edgeSpawn();
          state.enemies.push(makeEnemy(type, pos.x, pos.y));
        }
      }
      // Night 7: the boss keeps calling Gloomites.
      if (state.boss) {
        state.bossSpawnTimer -= dt;
        if (state.bossSpawnTimer <= 0) {
          state.bossSpawnTimer = BOSS.spawnInterval;
          const alive = state.enemies.length;
          if (alive < 8) {
            const pos = edgeSpawn();
            state.enemies.push(makeEnemy('gloomite', pos.x, pos.y));
          }
        }
      }

      // --- ground embers: walk over one to bank it ---
      for (const e of state.groundEmbers) {
        if (!e.taken && dist(p.x, p.y, e.x, e.y) < PLAYER.radius + EMBER.radius + 6) {
          e.taken = true;
          state.embers += 1;
          state.embersBanked += 1;
          state.embersCollected += 1;
          burst(e.x, e.y, '#ff9a3c', 8, 110);
          events.push(EVENT_EMBER);
        }
      }
      state.groundEmbers = state.groundEmbers.filter((e) => !e.taken);
      state.dripTimer -= dt;
      if (state.dripTimer <= 0) {
        state.dripTimer = EMBER.dripInterval;
        spawnGroundEmber();
      }

      // --- chain decay ---
      if (state.chainTimer > 0) {
        state.chainTimer -= dt;
        if (state.chainTimer <= 0) {
          state.chain = 0;
          state.chainMult = 1;
        }
      }

      // --- Beacon flame: gnawers chew it, it slowly rekindles ---
      let gnawing = false;
      for (const e of state.enemies) {
        if (e.type === 'gnawer' && dist(e.x, e.y, BEACON.x, BEACON.y) < BEACON.radius + ENEMY_TYPES.gnawer.radius + 4) {
          gnawing = true;
          state.flame -= BEACON.gnawPerSecond * state.harmMult * dt;
        }
      }
      if (state.boss && dist(state.boss.x, state.boss.y, BEACON.x, BEACON.y) < BEACON.radius + BOSS.radius + 4) {
        gnawing = true;
        state.flame -= BEACON.bossGnawPerSecond * state.harmMult * dt;
      }
      if (!gnawing) state.flame = Math.min(state.flameMax, state.flame + BEACON.regenPerSecond * dt);
      if (state.flame <= 0) {
        state.flame = 0;
        endGame(false, 'The Beacon flame went out.');
        return;
      }

      // --- enemies move, chew, douse, hunt ---
      const targets = [];
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        const def = ENEMY_TYPES[e.type];
        if (e.frozen > 0) { e.frozen -= dt; continue; }
        // Flicker blinks sideways every couple of seconds.
        if (e.type === 'flicker') {
          e.blink -= dt;
          if (e.blink <= 0) {
            e.blink = 2.2;
            const a = random.range(0, Math.PI * 2);
            e.x = Math.max(30, Math.min(FIELD.width - 30, e.x + Math.cos(a) * 70));
            e.y = Math.max(90, Math.min(FIELD.height - 30, e.y + Math.sin(a) * 70));
            burst(e.x, e.y, def.color, 6, 90);
          }
        }
        let tx = p.x;
        let ty = p.y;
        if (e.type === 'gnawer') { tx = BEACON.x; ty = BEACON.y; }
        else if (e.type === 'douser') {
          let lit = null;
          let ld = Infinity;
          for (const l of state.lamps) {
            if (l.lit) {
              const d = dist(e.x, e.y, l.x, l.y);
              if (d < ld) { ld = d; lit = l; }
            }
          }
          if (lit) { tx = lit.x; ty = lit.y; }
          else { tx = BEACON.x; ty = BEACON.y; }
        }
        const dx = tx - e.x;
        const dy = ty - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const slow = lampSlowAt(e.x, e.y) ? 0.5 : 1;
        const inLight = litRadiusAt(e.x, e.y);
        const speedFactor = slow * (inLight ? 0.85 : 1);
        e.wobble += dt * 2;
        const wob = Math.sin(e.wobble) * 0.3;
        const nx = dx / d;
        const ny = dy / d;
        e.x += (nx - ny * wob) * e.speed * speedFactor * dt;
        e.y += (ny + nx * wob) * e.speed * speedFactor * dt;
        // Douser at a lit lamp puts it out after a short channel.
        if (e.type === 'douser') {
          let lamp = null;
          for (const l of state.lamps) {
            if (l.lit && dist(e.x, e.y, l.x, l.y) < LAMP_RADIUS + 16) lamp = l;
          }
          if (lamp) {
            e.douse += dt;
            if (e.douse >= 1.2) {
              lamp.lit = false;
              state.lampsLit = Math.max(0, state.lampsLit - 1);
              e.douse = 0;
              burst(lamp.x, lamp.y, '#6fc3ff', 16, 160);
              floater(lamp.x, lamp.y - 30, 'LAMP DOUSED', '#6fc3ff');
            }
          } else e.douse = 0;
        }
        // A touch costs a life — unless the warden just got hit or dashed.
        if (state.invulnerable <= 0 && dist(e.x, e.y, p.x, p.y) < def.radius + PLAYER.radius - 4) {
          state.lives -= 1;
          state.chain = 0;
          state.chainMult = 1;
          state.chainTimer = 0;
          state.invulnerable = PLAYER.invulnerable;
          state.score = Math.max(0, state.score - 25);
          burst(p.x, p.y, def.color, 18, 200);
          e.x -= nx * 90;
          e.y -= ny * 90;
          e.frozen = 1.0;
          events.push(EVENT_HIT);
          if (state.lives <= 0) {
            endGame(false, 'The Murk closed in and the light went out.');
            return;
          }
        }
        targets.push(e);
      }

      // --- the boss moves, hunts, calls the dark ---
      if (state.boss) {
        const b = state.boss;
        if (b.frozen > 0) b.frozen -= dt;
        else {
          const dx = p.x - b.x;
          const dy = p.y - b.y;
          const d = Math.hypot(dx, dy) || 1;
          b.x += (dx / d) * b.speed * dt;
          b.y += (dy / d) * b.speed * dt;
          if (state.invulnerable <= 0 && dist(b.x, b.y, p.x, p.y) < BOSS.radius + PLAYER.radius - 6) {
            state.lives -= 1;
            state.chain = 0;
            state.chainMult = 1;
            state.invulnerable = PLAYER.invulnerable;
            burst(p.x, p.y, BOSS.eye, 22, 240);
            events.push(EVENT_HIT);
            if (state.lives <= 0) {
              endGame(false, 'THE LONG DARK took the warden.');
              return;
            }
          }
        }
        if (b.hp <= 0) {
          state.score += Math.round(BOSS.score * state.scoreMult);
          burst(b.x, b.y, '#ffe9a8', 40, 320);
          state.boss = null;
          endGame(true, 'Dawn breaks over the seventh night.');
          return;
        }
      }

      // --- particles and floaters fade ---
      for (const pt of state.particles) {
        pt.life -= dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vx *= 0.96;
        pt.vy *= 0.96;
      }
      state.particles = state.particles.filter((pt) => pt.life > 0);
      for (const f of state.floaters) {
        f.life -= dt;
        f.y -= 26 * dt;
      }
      state.floaters = state.floaters.filter((f) => f.life > 0);

      refreshIncoming();

      // --- the night ends: draft, or dawn on night 7 ---
      state.nightTime += dt;
      if (state.nightTime >= NIGHT_SECONDS) {
        if (state.night >= NIGHTS) {
          // Night 7 has no clock-out: the boss must be banished.
          state.nightTime = NIGHT_SECONDS;
        } else {
          state.score += 100 + state.lampsLit * 20;
          // The remaining Murk burns away at dawn.
          for (const e of state.enemies) burst(e.x, e.y, '#ffe9a8', 8, 140);
          state.enemies = [];
          pickDraft();
        }
      }
    },
  };
}
