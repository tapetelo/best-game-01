// Deterministic screenshot states: ?shot=play|title|boon|end (with &seed=N)
// stages that scene instead of running the loop, paints it, and sets
// window.__shotReady for a screenshot script. No input needed.
//
// The cover (play) is dense mid-action gameplay on night 6: twenty of the
// Murk in four kinds, an elite Wispmother, four lamps lit, the flare cone
// mid-burst, a x8 chain and the full HUD — never a title screen.
import { createWorld } from './world.js';
import { ENEMY_TYPES, FIELD } from './config.js';

function fakeEnemy(type, x, y, frozen = 0) {
  const def = ENEMY_TYPES[type];
  return {
    type, x, y, hp: def.hp, maxHp: def.hp, speed: def.speed,
    frozen, wobble: 1.2, shield: Boolean(def.shielded), blink: 2, douse: 0,
  };
}

export function stageShot(shot, seed) {
  const world = createWorld(seed, 'standard');
  const s = world.state;
  if (shot === 'title') {
    // A real lit village behind the title: three lamps burning, a few of
    // the Murk at the edges, the warden by the Beacon.
    s.lamps[0].lit = true;
    s.lamps[1].lit = true;
    s.lamps[4].lit = true;
    s.lampsLit = 3;
    s.enemies.push(fakeEnemy('gloomite', 120, 180));
    s.enemies.push(fakeEnemy('gloomite', 1160, 160));
    s.enemies.push(fakeEnemy('gnawer', 1050, 620));
    s.enemies.push(fakeEnemy('douser', 150, 620));
    s.player.x = 640;
    s.player.y = 480;
    s.best = 31750;
    return { screen: 'title', world, time: 0.6, best: 31750 };
  }
  if (shot === 'play') {
    // Night 6, mid-fight: the cover. Twenty of the Murk in four kinds plus
    // an elite Wispmother, four lamps lit, flare mid-burst, chain x8.
    s.night = 6;
    s.nightTime = 31;
    s.flame = 52;
    s.lives = 2;
    s.score = 31052;
    s.best = 41260;
    s.embers = 420;
    s.embersCollected = 86;
    s.embersBanked = 86;
    s.chain = 42;
    s.chainTimer = 2.4;
    s.bestChain = 42;
    s.chainMult = 8;
    s.kills = 791;
    s.relicsHeld = ['emberheart', 'fleetstep', 'brightwick'];
    s.incoming = { gloomite: 8, gnawer: 3, douser: 3, flicker: 3, hollow: 2, wispmother: 1 };
    s.lamps[0].lit = true;
    s.lamps[1].lit = true;
    s.lamps[3].lit = true;
    s.lamps[4].lit = true;
    s.lampsLit = 4;
    const spots = [
      ['gloomite', 180, 180], ['gloomite', 260, 240], ['gloomite', 1100, 170],
      ['gloomite', 1140, 300], ['gloomite', 200, 620], ['gloomite', 1080, 620],
      ['gloomite', 420, 620], ['gloomite', 860, 150], ['gnawer', 560, 300],
      ['gnawer', 730, 320], ['gnawer', 640, 520], ['douser', 340, 260],
      ['douser', 940, 260], ['douser', 250, 480], ['flicker', 480, 180],
      ['flicker', 820, 200], ['flicker', 980, 520], ['hollow', 300, 420],
      ['hollow', 980, 420], ['wispmother', 640, 130],
    ];
    for (const [type, x, y] of spots) s.enemies.push(fakeEnemy(type, x, y, type === 'hollow' ? 1.5 : 0));
    for (let i = 0; i < 7; i++) {
      s.groundEmbers.push({ x: 300 + i * 110, y: 500 - (i % 3) * 60, phase: i, taken: false });
    }
    s.player.x = 640;
    s.player.y = 480;
    s.flareFlash = 0.4;
    s.flareAngle = -0.7;
    s.floaters.push({ x: 700, y: 200, text: '+120', color: '#ffe9a8', life: 0.9, max: 1.1 });
    s.floaters.push({ x: 340, y: 300, text: '+80', color: '#ffe9a8', life: 0.7, max: 1.1 });
    return { screen: 'play', world, time: 31.4 };
  }
  if (shot === 'boon') {
    // Night 4 survived: the draft. Two relics, one pact, shop below, and
    // the next-night preview calling out the new Hollow.
    s.night = 4;
    s.nightTime = 40;
    s.flame = 100;
    s.flameMax = 100;
    s.score = 12090;
    s.best = 41260;
    s.embers = 54;
    s.embersCollected = 61;
    s.bestChain = 30;
    s.relicsHeld = ['brightwick'];
    s.draft = {
      nightDone: 4,
      cards: [
        { kind: 'relic', key: 'emberheart', name: 'Emberheart', family: 'FLAME', effect: '+30 max flame, mend 25 now', desc: 'The Beacon burns deeper and steadier.' },
        { kind: 'relic', key: 'dawnbell', name: 'Dawn Bell', family: 'BELL', effect: 'Chain lasts 5s instead of 3s', desc: 'Its note holds the tally a little longer.' },
        { kind: 'pact', key: 'ashentithe', name: 'Ashen Tithe', family: 'PACT · TRADE-OFF', effect: '+60% score', price: 'Beacon harm +25%', desc: 'The dark takes its cut from the flame.' },
      ],
    };
    return { screen: 'draft', world, time: 0.6 };
  }
  // end: the win screen — dawn breaks after the seventh night.
  s.won = true;
  s.over = true;
  s.overReason = 'Dawn breaks over the seventh night.';
  s.night = 7;
  s.nightTime = 40;
  s.timePlayed = 351;
  s.score = 47506;
  s.best = 41260;
  s.embersBanked = 441;
  s.embersCollected = 441;
  s.kills = 424;
  s.bestChain = 92;
  s.chainMult = 8;
  s.lampsLit = 5;
  s.flame = 22;
  s.relicsHeld = ['emberheart', 'fleetstep', 'brightwick', 'dawnbell'];
  s.pactsHeld = ['ashentithe'];
  return { screen: 'over', world, time: 0.6, best: 41260 };
}
