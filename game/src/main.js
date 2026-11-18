// INKWARD's conductor: owns the screens (title, workshop, the pilgrim road,
// the rite itself, the gift choice, victory and defeat), feeds input to the
// world, turns world events into sound, and moves the run from scroll to
// scroll. The simulation lives in world.js; everything drawn lives in
// render.js; this file only decides what happens next.

import { gradeFor } from './config.js';
import { ROAD_BOONS } from './levels.js';
import { makeRng } from './random.js';
import { World, loadMeta, saveMeta, buyWorkshop, workshopLevel } from './world.js';
import { WORKSHOP } from './config.js';
import { Renderer, UI } from './render.js';
import { input, initInput, consumeEdges, moveVector } from './input.js';
import { sfx } from './audio.js';
import { getShotSpec, stageTitle, stagePlay, shotChoices } from './shots.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
initInput(canvas);

const meta = loadMeta();

const G = {
  screen: 'title',
  world: null,
  meta,
  choices: [],
  boons: [],
  paused: false,
  time: 0,
  message: '',
  messageT: 0,
  muted: false,
  shotHold: false,
};

function setMessage(text, seconds = 2.8) {
  G.message = text;
  G.messageT = seconds;
}

function ambientWorld(seed) {
  const world = new World(makeRng(seed), meta);
  stageTitle(world);
  return world;
}

function newRun() {
  const seed = (Math.random() * 0xffffffff) >>> 0;
  const world = new World(makeRng(seed), meta);
  world.startRun();
  G.world = world;
  G.paused = false;
  G.screen = 'play';
  setMessage(
    world.blessing
      ? `The Blessed Brush stirs: ${world.blessing} is yours. Seal the spirits!`
      : `${world.zone.name} — seal the spirits, wave by wave.`,
    3.4,
  );
}

function playWorldEvents(world) {
  for (const event of world.drainEvents()) {
    switch (event.type) {
      case 'seal':
        sfx.seal();
        break;
      case 'stamp':
        sfx.stamp();
        break;
      case 'burst':
        sfx.burst(event.depth ?? 0);
        break;
      case 'crack':
        sfx.burst(0);
        break;
      case 'bosshit':
        sfx.bossHit();
        break;
      case 'bossdown':
        sfx.bossHit();
        setMessage(event.kind === 'carp' ? 'The Great Ink Carp bursts into rain!' : 'The Inkstone shatters!', 3);
        break;
      case 'hurt':
        sfx.hurt();
        break;
      case 'dash':
        sfx.dash();
        break;
      case 'pickup':
        sfx.pickup();
        break;
      case 'empty':
        sfx.swish();
        break;
      case 'revive':
        sfx.upgrade();
        break;
      case 'wave':
        if (world.boss) setMessage(`${world.boss.kind === 'carp' ? 'The Great Ink Carp rises!' : 'The Cracked Inkstone awaits your rings.'}`, 3.2);
        else if (world.waveIndex > 0) setMessage(`Wave ${world.waveIndex + 1}`, 1.6);
        break;
    }
  }
}

function advanceAfterWave() {
  const world = G.world;
  if (world.outcome === 'victory') {
    meta.bestGrade = gradeFor(world.score).grade;
    saveMeta(meta);
    sfx.win();
    G.screen = 'victory';
    return;
  }
  if (world.outcome === 'defeat') {
    sfx.lose();
    G.screen = 'defeat';
    return;
  }
  if (world.state === 'waveclear') {
    G.choices = world.rollChoices();
    G.screen = 'upgrade';
    return;
  }
  if (world.state === 'zoneclear') {
    if (world.zoneIndex >= 2) {
      // The Inkstone's fall ends the run before this; a formality.
      meta.bestGrade = gradeFor(world.score).grade;
      saveMeta(meta);
      sfx.win();
      G.screen = 'victory';
      return;
    }
    const ids = ROAD_BOONS.map((b) => b.id);
    const shuffled = world.rng.shuffle(ids);
    G.boons = shuffled.slice(0, 2);
    G.screen = 'map';
  }
}

function updatePlay(dt) {
  const world = G.world;
  if (input.pressed.has('KeyP') || input.pressed.has('Escape')) {
    G.paused = !G.paused;
    sfx.click();
  }
  if (G.paused) return;
  world.update(dt, {
    move: moveVector(),
    draw: input.mouse.down,
    dash: input.pressed.has('Space'),
  });
  playWorldEvents(world);
  if (world.outcome || world.state !== 'fighting') advanceAfterWave();
}

function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function handleClick() {
  if (!input.mouse.clicked) return;
  sfx.wake();
  const { x, y } = input.mouse;
  const world = G.world;
  switch (G.screen) {
    case 'title':
      if (inRect(x, y, UI.playBtn)) {
        sfx.click();
        newRun();
      } else if (inRect(x, y, UI.workshopBtn)) {
        sfx.click();
        G.screen = 'workshop';
      }
      break;
    case 'workshop': {
      if (inRect(x, y, UI.backBtn)) {
        sfx.click();
        G.screen = 'title';
        break;
      }
      WORKSHOP.forEach((item, i) => {
        if (inRect(x, y, UI.rowRect(i))) {
          if (buyWorkshop(meta, item.id)) sfx.upgrade();
          else sfx.click();
        }
      });
      break;
    }
    case 'map':
      G.boons.forEach((boonId, i) => {
        if (inRect(x, y, UI.boonRect(i))) {
          sfx.upgrade();
          world.applyBoon(boonId);
          world.startZone(world.zoneIndex + 1);
          G.screen = 'play';
          setMessage(`${world.zone.name} — ${world.zone.epithet}`, 3.2);
        }
      });
      break;
    case 'upgrade':
      G.choices.forEach((choice, i) => {
        if (inRect(x, y, UI.cardRect(i))) chooseGift(i);
      });
      break;
    case 'victory':
    case 'defeat':
      if (inRect(x, y, UI.againBtn)) {
        sfx.click();
        newRun();
      } else if (inRect(x, y, UI.titleBtn)) {
        sfx.click();
        G.world = ambientWorld(7);
        G.screen = 'title';
      }
      break;
  }
}

function chooseGift(i) {
  const world = G.world;
  if (!world || i < 0 || i >= G.choices.length) return;
  world.applyChoice(G.choices[i]);
  playWorldEvents(world);
  sfx.upgrade();
  world.nextWave();
  playWorldEvents(world);
  G.screen = 'play';
}

function handleKeys() {
  if (input.pressed.has('KeyM')) {
    G.muted = sfx.toggleMute();
  }
  if (G.screen === 'title' && (input.pressed.has('Enter') || input.pressed.has('Space'))) {
    sfx.wake();
    newRun();
  }
  if (G.screen === 'upgrade') {
    if (input.pressed.has('Digit1')) chooseGift(0);
    if (input.pressed.has('Digit2')) chooseGift(1);
    if (input.pressed.has('Digit3')) chooseGift(2);
  }
}

// ------------------------------------------------------------ shot staging

const shot = getShotSpec();
if (shot) {
  G.shotHold = true;
  if (shot.name === 'play' || shot.name === 'upgrade') {
    const world = new World(makeRng(shot.seed * 31 + 7), meta);
    world.startRun();
    stagePlay(world);
    G.world = world;
    if (shot.name === 'upgrade') {
      G.choices = shotChoices();
      G.screen = 'upgrade';
    } else {
      G.screen = 'play';
    }
  } else {
    G.world = ambientWorld(shot.seed);
    G.screen = 'title';
  }
} else {
  G.world = ambientWorld(7);
}

// ------------------------------------------------------------ the loop

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;
  G.time += dt;
  if (G.messageT > 0) G.messageT -= dt;

  handleKeys();
  handleClick();
  if (!G.shotHold) {
    if (G.screen === 'play') updatePlay(dt);
    else if (G.world && G.screen === 'title') G.world.time += dt;
  }
  renderer.draw(G);
  consumeEdges();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// A handle for headless verification (and curious keepers).
window.__inkward = G;
