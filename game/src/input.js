// Keyboard and mouse, gathered in one place. The world reads held keys and
// the mouse each frame; the screens read `clicked` (a mouse press this
// frame) and `pressed` (a key's first frame down). main.js consumes the
// edge flags once per frame so nothing fires twice.

export const input = {
  keys: new Set(),
  pressed: new Set(),
  mouse: { x: 0, y: 0, down: false, clicked: false },
};

let attached = false;

export function initInput(canvas) {
  if (attached) return;
  attached = true;

  const toGame = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) input.pressed.add(event.code);
    input.keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => input.keys.delete(event.code));
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouse.down = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const p = toGame(event);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = toGame(event);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
    input.mouse.down = true;
    input.mouse.clicked = true;
  });
  window.addEventListener('mouseup', () => {
    input.mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

/** Call at the end of each frame: last frame's edges are spent. */
export function consumeEdges() {
  input.pressed.clear();
  input.mouse.clicked = false;
}

/** Movement direction from WASD / arrows, normalised; {x:0,y:0} at rest. */
export function moveVector() {
  let x = 0;
  let y = 0;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) x -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) x += 1;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) y -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = Math.SQRT1_2;
    return { x: x * inv, y: y * inv };
  }
  return { x, y };
}
