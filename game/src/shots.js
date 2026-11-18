// Screenshot scenes. INKWARD's screenshots must be real renders of the game
// itself, so the game can stage itself: open index.html with
// ?shot=<scene>&seed=<n> and it sets up a deterministic scene — the title,
// a wave mid-fight with one spirit already sealed in its ring, the gift
// choice — and holds it for the camera. Nothing here runs in a normal
// visit; shots.json names the same scenes for the kit's screenshot flow.

export function getShotSpec() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('shot');
  if (!name) return null;
  const seed = Number(params.get('seed') || 1);
  return { name, seed: Number.isFinite(seed) ? seed : 1 };
}

/** A few tame spirits to keep the title screen company. */
export function stageTitle(world) {
  const spots = [
    ['wisp', 190, 210],
    ['wisp', 955, 190],
    ['dart', 880, 560],
    ['wisp', 235, 585],
    ['wraith', 1010, 380],
  ];
  for (const [kind, x, y] of spots) {
    const s = world.spawnAt(kind, x, y);
    s.spawnT = 0;
  }
}

/**
 * A wave in mid-fight: spirits astir, one already sealed inside a closed
 * loop (drawn honestly, by feeding the trail a circle and letting the
 * world's own loop judgement fire), a second stroke half-drawn, and a HUD
 * that has lived a little.
 */
export function stagePlay(world) {
  world.startWave(2);
  world.spawnQueue = [];
  world.spirits = [];
  const cast = [
    ['wisp', 300, 300],
    ['wisp', 428, 252],
    ['dart', 762, 302],
    ['wraith', 884, 474],
    ['brute', 646, 524],
    ['wisp', 238, 540],
    ['dart', 986, 224],
  ];
  for (const [kind, x, y] of cast) {
    const s = world.spawnAt(kind, x, y);
    s.spawnT = 0;
  }
  // The sealed one, caught fair and square.
  const target = world.spawnAt('wisp', 520, 402);
  target.spawnT = 0;
  const pts = [];
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push({ x: 520 + Math.cos(a) * 58, y: 402 + Math.sin(a) * 58, born: world.time });
  }
  world.trail.points = pts;
  world.trail.active = true;
  world.player.x = pts[steps].x;
  world.player.y = pts[steps].y;
  world.tryCloseLoop();
  if (target.sealed > 0) {
    target.sealed = 4.5;
    target.sealMax = 4.5;
  }
  // A second stroke, half-drawn beneath the keeper's brush.
  const arc = [];
  for (let i = 0; i <= 12; i++) {
    const a = -0.6 + (i / 12) * 2.4;
    arc.push({ x: 316 + Math.cos(a) * 54, y: 428 + Math.sin(a) * 54, born: world.time });
  }
  world.trail.points = arc;
  world.trail.active = true;
  world.trail.fade = 0;
  world.player.x = arc[arc.length - 1].x;
  world.player.y = arc[arc.length - 1].y;
  // A HUD with a past.
  world.score = 1350;
  world.beadsRun = 12;
  world.combo = 7;
  world.comboT = 1.8;
  world.player.hp = 72;
  world.player.ink = 58;
  world.motes.push(
    { x: 700, y: 420, vx: 0, vy: 0, value: 6, life: 7 },
    { x: 356, y: 330, vx: 0, vy: 0, value: 6, life: 7 },
  );
}

/** The gift choice, with a relic on the table so its gold frame shows. */
export function shotChoices() {
  return [
    { kind: 'upgrade', id: 'widebrush' },
    { kind: 'relic', id: 'hanko' },
    { kind: 'upgrade', id: 'deepwell' },
  ];
}
