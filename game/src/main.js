// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between four screens: title, play, paused and game over.
//
// ?seed=N fixes the night's pattern. ?shot=start|play|night|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createWorld, EVENT_BEACON, EVENT_EMBER, EVENT_FLARE, EVENT_HIT, EVENT_NIGHT, EVENT_OVER, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_FLARE, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || '1') || 1;
const shot = params.get('shot');

let world = createWorld(seed);
let screen = SCREEN_TITLE;
let time = 0;
let best = Number(localStorage.getItem(BEST_KEY) || '0') || 0;

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
    else if (event === EVENT_WIN) {
      audio.dawn();
      audio.stopHum();
    } else if (event === EVENT_OVER) audio.stopHum();
  }
  const s = world.state;
  if (s.over) {
    best = Math.max(best, s.won ? 7 : Math.max(0, s.night - 1));
    localStorage.setItem(BEST_KEY, String(best));
    screen = SCREEN_OVER;
    announce(s.won ? `Dawn breaks! You survived all seven nights. Score ${s.score}.` : `Game over: ${s.overReason} Score ${s.score}.`);
  }
}

function restart() {
  world = createWorld(seed + Math.floor(Math.random() * 100000));
  screen = SCREEN_PLAY;
  time = 0;
  audio.unlock();
  audio.startHum();
  announce(`Night 1 of 7. Light the braziers, gather embers, keep the lantern lit.`);
}

if (shot) {
  // Screenshot mode: stage the scene, paint it, signal readiness.
  const staged = stageShot(shot, seed);
  screen = staged.screen;
  world = staged.world;
  time = staged.time;
  if (screen === SCREEN_TITLE) renderer.drawTitle(best);
  else if (screen === SCREEN_PLAY) renderer.drawPlay(world.state, time, false);
  else renderer.drawOver(world.state, best);
  requestAnimationFrame(() => {
    if (screen === SCREEN_TITLE) renderer.drawTitle(best);
    else if (screen === SCREEN_PLAY) renderer.drawPlay(world.state, time, false);
    else renderer.drawOver(world.state, best);
    window.__shotReady = true;
  });
} else {
  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound muted.' : 'Sound on.');
    }
    if (actions & ACTION_PAUSE && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) {
      screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
      if (screen === SCREEN_PAUSED) audio.stopHum();
      else audio.startHum();
      announce(screen === SCREEN_PAUSED ? 'Paused.' : 'Night continues.');
    }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) restart();
      else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; audio.startHum(); }
    }
    // R restarts from pause or game over (handled as a confirm on those screens).
    if (screen === SCREEN_PLAY) {
      const flare = Boolean(actions & ACTION_FLARE);
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        time += STEP;
        world.step({ steer: () => input.steer(), aim: () => input.aim(), flare });
        handleEvents();
        if (world.state.over) break;
      }
    }
    if (screen === SCREEN_TITLE) renderer.drawTitle(best);
    else if (screen === SCREEN_PLAY) renderer.drawPlay(world.state, time, audio.isMuted());
    else if (screen === SCREEN_PAUSED) renderer.drawPaused(world.state);
    else renderer.drawOver(world.state, best);
    requestAnimationFrame(frame);
  }
  // R key: restart from pause / game over without going through confirm.
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyR' && (screen === SCREEN_PAUSED || screen === SCREEN_OVER)) {
      if (!event.repeat) restart();
    }
  });
  // Debug/test handle: read-only view of the live game state.
  window.__emberwarden = {
    get screen() { return screen; },
    get state() { return world.state; },
  };
  announce('EMBERWARDEN. Press Enter to begin the first night.');
  requestAnimationFrame(frame);
}
