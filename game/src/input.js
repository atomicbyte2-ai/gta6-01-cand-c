// Keyboard + mouse input. Actions are edge-triggered and consumed by main.js.
export const ACTION_CONFIRM = 1, ACTION_PAUSE = 2, ACTION_ENTER = 4,
  ACTION_PUNCH = 8, ACTION_WEAPON = 16, ACTION_RELOAD = 32, ACTION_RADIO = 64,
  ACTION_FIRE = 128;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseDown = false, mouseX = 0, mouseY = 0, dragDX = 0, dragDY = 0;
  const keymap = {
    Space: ACTION_CONFIRM, Enter: ACTION_CONFIRM,
    KeyP: ACTION_PAUSE, Escape: ACTION_PAUSE,
    KeyE: ACTION_ENTER, KeyF: ACTION_PUNCH,
    KeyQ: ACTION_WEAPON, KeyR: ACTION_RELOAD, KeyT: ACTION_RADIO,
  };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    if (keymap[e.code]) { actions |= keymap[e.code]; e.preventDefault(); }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousedown', (e) => {
    mouseDown = true; mouseX = e.clientX; mouseY = e.clientY;
    actions |= ACTION_FIRE; // latched until consumed: a fast click must survive a slow frame
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });
  window.addEventListener('mousemove', (e) => {
    if (!mouseDown) return;
    dragDX += e.clientX - mouseX; dragDY += e.clientY - mouseY;
    mouseX = e.clientX; mouseY = e.clientY;
  });
  return {
    down(code) { return keys.has(code); },
    axis() {
      let x = 0, z = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      return { x, z };
    },
    run() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    takeActions() { const a = actions; actions = 0; return a; },
    takeDrag() { const d = { x: dragDX, y: dragDY }; dragDX = 0; dragDY = 0; return d; },
    get mouseDown() { return mouseDown; },
    press(code) { keys.add(code); setTimeout(() => keys.delete(code), 50); },
  };
}
