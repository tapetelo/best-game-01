// Keyboard and mouse input. Held keys steer the warden; one-shot presses
// (start / restart / pause / flare) are queued as bit flags and taken once by
// the loop, so a press between two frames is never lost or counted twice.
// The mouse aims the lantern beam; a click (or Space) fires a flare.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_FLARE = 4;
export const ACTION_MUTE = 8;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Enter']);
const FLARE_KEYS = new Set(['Space']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let actions = 0;
  // Aim in logical 1280x720 coordinates; updated from pointer position.
  let aimX = 640;
  let aimY = 200;

  function updateAim(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    aimX = (event.clientX - rect.left) * scaleX;
    aimY = (event.clientY - rect.top) * scaleY;
  }

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (FLARE_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_FLARE;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  window.addEventListener('blur', () => {
    up = down = left = right = false;
  });
  canvas.addEventListener('pointermove', updateAim);
  canvas.addEventListener('pointerdown', (event) => {
    updateAim(event);
    actions |= ACTION_FLARE;
  });

  return {
    /** Steering vector, normalised. */
    steer() {
      const x = (right ? 1 : 0) - (left ? 1 : 0);
      const y = (down ? 1 : 0) - (up ? 1 : 0);
      const len = Math.hypot(x, y);
      return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
    },
    aim() {
      return { x: aimX, y: aimY };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
