// Keyboard and mouse input. Held keys steer the warden; one-shot presses
// (start / restart / pause / flare / dash / pulse / lamp / draft picks) are
// queued as bit flags and taken once by the loop, so a press between two
// frames is never lost or counted twice. The mouse aims the lantern beam;
// a click fires a flare, and on menu screens it picks what it lands on.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_FLARE = 4;
export const ACTION_MUTE = 8;
export const ACTION_DASH = 16;
export const ACTION_PULSE = 32;
export const ACTION_LAMP = 64;
export const ACTION_1 = 128;
export const ACTION_2 = 256;
export const ACTION_3 = 512;
export const ACTION_4 = 1024;
export const ACTION_5 = 2048;
export const ACTION_6 = 4096;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Enter']);
const FLARE_KEYS = new Set(['Space']);
const DASH_KEYS = new Set(['ShiftLeft', 'ShiftRight']);
const PULSE_KEYS = new Set(['KeyQ']);
const LAMP_KEYS = new Set(['KeyE']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const KEYS_1 = new Set(['Digit1', 'Numpad1']);
const KEYS_2 = new Set(['Digit2', 'Numpad2']);
const KEYS_3 = new Set(['Digit3', 'Numpad3']);
const KEYS_4 = new Set(['Digit4', 'Numpad4']);
const KEYS_5 = new Set(['Digit5', 'Numpad5']);
const KEYS_6 = new Set(['Digit6', 'Numpad6']);

export function createInput(canvas) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let actions = 0;
  // Aim in logical 1280x720 coordinates; updated from pointer position.
  let aimX = 640;
  let aimY = 200;
  // Last click, in logical coordinates; taken once by the loop.
  let clickX = -1;
  let clickY = -1;

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
    } else if (DASH_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DASH;
    } else if (PULSE_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PULSE;
    } else if (LAMP_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_LAMP;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (KEYS_1.has(event.code)) {
      if (!event.repeat) actions |= ACTION_1;
    } else if (KEYS_2.has(event.code)) {
      if (!event.repeat) actions |= ACTION_2;
    } else if (KEYS_3.has(event.code)) {
      if (!event.repeat) actions |= ACTION_3;
    } else if (KEYS_4.has(event.code)) {
      if (!event.repeat) actions |= ACTION_4;
    } else if (KEYS_5.has(event.code)) {
      if (!event.repeat) actions |= ACTION_5;
    } else if (KEYS_6.has(event.code)) {
      if (!event.repeat) actions |= ACTION_6;
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
    clickX = aimX;
    clickY = aimY;
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
    /** Last click position, or null; taken once. */
    takeClick() {
      if (clickX < 0) return null;
      const c = { x: clickX, y: clickY };
      clickX = -1;
      clickY = -1;
      return c;
    },
  };
}
