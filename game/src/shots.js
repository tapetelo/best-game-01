// Deterministic screenshot states: ?shot=start|play|night|end (with &seed=N)
// stages that scene instead of running the loop, paints it, and sets
// window.__shotReady for the screenshot script. No input needed.
import { createWorld } from './world.js';
import { FIELD } from './config.js';

function fakeInput(steer, aim, flare) {
  return {
    steer: () => steer,
    aim: () => aim,
    flare: flare || false,
  };
}

export function stageShot(shot, seed) {
  const world = createWorld(seed);
  const s = world.state;
  if (shot === 'start') {
    return { screen: 'title', world, time: 0.6 };
  }
  if (shot === 'play') {
    // Night 1, mid-action: warden centre-frame, a brazier lit, embers out,
    // wisps closing in from the dark at the edges.
    s.beacons[2].lit = true;
    s.beaconsLit = 1;
    s.score = 60;
    s.embersCollected = 1;
    s.nightTime = 12;
    for (let i = 0; i < 40; i++) {
      world.step(fakeInput({ x: 0.3, y: -0.2 }, { x: 900, y: 200 }, false));
    }
    // A flare frozen mid-burst, aimed at the nearest wisp.
    s.flareFlash = 0.4;
    s.flareAngle = -0.6;
    s.fuel = 82;
    return { screen: 'play', world, time: 12.6 };
  }
  if (shot === 'night') {
    // Night 6, late and dangerous: four braziers lit, fuel low, many wisps.
    s.night = 6;
    s.nightTime = 31;
    s.fuel = 34;
    s.lives = 2;
    s.score = 480;
    s.embersCollected = 14;
    s.beacons.forEach((b, i) => { if (i !== 1) b.lit = true; });
    s.beaconsLit = 4;
    for (let i = 0; i < 9; i++) {
      s.wisps.push({ x: 120 + i * 130, y: 120 + (i % 3) * 180, frozen: i % 3 === 0 ? 1.5 : 0, wobble: i, speed: 100 });
    }
    s.player.x = FIELD.width / 2;
    s.player.y = FIELD.height / 2 + 40;
    return { screen: 'play', world, time: 31.4 };
  }
  // end: the win screen — dawn breaks after the seventh night.
  s.won = true;
  s.over = true;
  s.overReason = 'Dawn breaks over the seventh night.';
  s.night = 7;
  s.nightTime = 40;
  s.score = 1240;
  s.embersCollected = 23;
  s.beacons.forEach((b) => { b.lit = true; });
  s.beaconsLit = 5;
  s.fuel = 41;
  return { screen: 'over', world, time: 0.6 };
}
