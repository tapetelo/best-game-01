// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between five screens: title (pick a watch), play, draft (boons + shop),
// paused and game over.
//
// ?seed=N fixes the night's pattern. ?shot=play|title|boon|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import {
  createWorld, EVENT_BEACON, EVENT_BOON, EVENT_BOSS, EVENT_DASH,
  EVENT_EMBER, EVENT_FLARE, EVENT_HIT, EVENT_NIGHT, EVENT_OVER, EVENT_PULSE,
  EVENT_WIN,
} from './world.js';
import {
  ACTION_1, ACTION_2, ACTION_3, ACTION_4, ACTION_5, ACTION_6,
  ACTION_CONFIRM, ACTION_DASH, ACTION_FLARE, ACTION_LAMP, ACTION_MUTE,
  ACTION_PAUSE, ACTION_PULSE, createInput,
} from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer, DRAFT_CARDS, SCREEN_DRAFT, SCREEN_OVER, SCREEN_PAUSED,
  SCREEN_PLAY, SCREEN_TITLE, SHOP_RECTS, TITLE_CARDS,
} from './render.js';
import { stageShot } from './shots.js';
import { createScene3D } from './scene3d.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const renderer = createRenderer(canvas);
const scene3d = createScene3D(document.getElementById('gl'));
renderer.setProjector((x, y) => scene3d.project(x, y));
const input = createInput(canvas);
const audio = createAudio();

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || '1') || 1;
const shot = params.get('shot');

let world = createWorld(seed);
let screen = SCREEN_TITLE;
let time = 0;
let best = Number(localStorage.getItem(BEST_KEY) || '0') || 0;
let difficultyKey = 'standard';

function announce(message) {
  statusEl.textContent = message;
}

function handleEvents() {
  for (const event of world.takeEvents()) {
    if (event === EVENT_EMBER) audio.ember();
    else if (event === EVENT_BEACON) audio.beacon();
    else if (event === EVENT_FLARE) audio.flare();
    else if (event === EVENT_HIT) audio.hit();
    else if (event === EVENT_NIGHT) audio.night();
    else if (event === EVENT_DASH) audio.dash();
    else if (event === EVENT_PULSE) audio.pulse();
    else if (event === EVENT_BOON) audio.boon();
    else if (event === EVENT_BOSS) audio.boss();
    else if (event === EVENT_WIN) {
      audio.dawn();
      audio.stopHum();
    } else if (event === EVENT_OVER) audio.stopHum();
  }
  const s = world.state;
  if (s.draft && screen === SCREEN_PLAY) {
    screen = SCREEN_DRAFT;
    audio.stopHum();
    announce(`Night ${s.draft.nightDone} survived. Choose a boon.`);
  }
  if (s.over) {
    best = Math.max(best, s.score);
    localStorage.setItem(BEST_KEY, String(best));
    screen = SCREEN_OVER;
    announce(s.won ? `Dawn breaks! You survived all seven nights. Score ${s.score}.` : `Game over: ${s.overReason} Score ${s.score}.`);
  }
}

function startRun() {
  world = createWorld(seed + Math.floor(Math.random() * 100000), difficultyKey);
  screen = SCREEN_PLAY;
  time = 0;
  audio.unlock();
  audio.startHum();
  announce(`Night 1 of 7 — ${world.state.night}. Keep the Beacon lit.`);
}

function inRect(c, r) {
  return c && c.x >= r.x && c.x <= r.x + r.w && c.y >= r.y && c.y <= r.y + r.h;
}

if (shot) {
  // Screenshot mode: stage the scene, paint it, signal readiness.
  const staged = stageShot(shot, seed);
  screen = staged.screen;
  world = staged.world;
  time = staged.time;
  best = Math.max(best, staged.best || 0);
  const paint = () => {
    scene3d.update(world.state, time);
    if (screen === SCREEN_TITLE) renderer.drawTitle(world.state, best);
    else if (screen === SCREEN_PLAY) renderer.drawPlay(world.state, time, false);
    else if (screen === SCREEN_DRAFT) renderer.drawDraft(world.state);
    else renderer.drawOver(world.state, best);
  };
  paint();
  requestAnimationFrame(() => {
    paint();
    window.__shotReady = true;
  });
} else {
  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    const actions = input.takeActions();
    const click = input.takeClick();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound muted.' : 'Sound on.');
    }
    if (actions & ACTION_PAUSE && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_OVER)) {
      if (screen === SCREEN_OVER) {
        screen = SCREEN_TITLE;
        world = createWorld(seed, difficultyKey);
      } else {
        screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
        if (screen === SCREEN_PAUSED) audio.stopHum();
        else audio.startHum();
        announce(screen === SCREEN_PAUSED ? 'Paused.' : 'Night continues.');
      }
    }
    // Title screen: pick a watch with 1/2/3 or a click, Enter to start.
    if (screen === SCREEN_TITLE) {
      let pickedKey = null;
      if (actions & ACTION_1) pickedKey = 'gentle';
      else if (actions & ACTION_2) pickedKey = 'standard';
      else if (actions & ACTION_3) pickedKey = 'hard';
      if (click) {
        TITLE_CARDS.forEach((r) => { if (inRect(click, r)) pickedKey = r.key; });
      }
      if (pickedKey && pickedKey !== difficultyKey) {
        difficultyKey = pickedKey;
        world = createWorld(seed, difficultyKey);
      }
      if (actions & ACTION_CONFIRM) startRun();
    }
    // Draft screen: 1/2/3 take a boon, 4/5/6 buy in the shop, Enter skips.
    if (screen === SCREEN_DRAFT) {
      const s = world.state;
      let picked = false;
      if (actions & ACTION_1) picked = world.chooseBoon(0);
      else if (actions & ACTION_2) picked = world.chooseBoon(1);
      else if (actions & ACTION_3) picked = world.chooseBoon(2);
      else if (actions & ACTION_4) world.buyShop(0);
      else if (actions & ACTION_5) world.buyShop(1);
      else if (actions & ACTION_6) world.buyShop(2);
      if (click) {
        DRAFT_CARDS.forEach((r, i) => { if (inRect(click, r)) picked = world.chooseBoon(i); });
        SHOP_RECTS.forEach((r, i) => { if (inRect(click, r)) world.buyShop(i); });
      }
      if (picked || (actions & ACTION_CONFIRM)) {
        if (!picked) world.skipDraft();
        world.nextNight();
        handleEvents();
        screen = SCREEN_PLAY;
        audio.startHum();
        announce(`Night ${world.state.night} of 7.`);
      }
    }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_OVER) startRun();
      else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; audio.startHum(); }
    }
    if (screen === SCREEN_PLAY) {
      const stepInput = {
        steer: () => input.steer(),
        aim: () => input.aim(),
        flare: Boolean(actions & ACTION_FLARE),
        dash: Boolean(actions & ACTION_DASH),
        pulse: Boolean(actions & ACTION_PULSE),
        lamp: Boolean(actions & ACTION_LAMP),
      };
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        time += STEP;
        world.step(stepInput);
        stepInput.flare = false;
        stepInput.dash = false;
        stepInput.pulse = false;
        stepInput.lamp = false;
        handleEvents();
        if (world.state.over || world.state.draft) break;
      }
    }
    const s = world.state;
    s.best = best;
    scene3d.update(s, time);
    if (screen === SCREEN_TITLE) renderer.drawTitle(s, best);
    else if (screen === SCREEN_PLAY) renderer.drawPlay(s, time, audio.isMuted());
    else if (screen === SCREEN_DRAFT) renderer.drawDraft(s);
    else if (screen === SCREEN_PAUSED) renderer.drawPaused(s);
    else renderer.drawOver(s, best);
    requestAnimationFrame(frame);
  }
  // R key: restart from pause / game over without going through confirm.
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyR' && (screen === SCREEN_PAUSED || screen === SCREEN_OVER)) {
      if (!event.repeat) startRun();
    }
  });
  // Debug/test handle: read-only view of the live game state.
  window.__emberwarden = {
    get screen() { return screen; },
    get state() { return world.state; },
    get difficulty() { return difficultyKey; },
    startRun,
  };
  announce('EMBERWARDEN. Choose a watch, then press Enter to begin the first night.');
  requestAnimationFrame(frame);
}
