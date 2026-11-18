// INKWARD's simulation: the keeper, the brush trail, the spirits, and the
// arithmetic of sealing them. The rule everything hangs on: hold the brush
// down and walk a closed loop; when the stroke meets itself, the ring is
// judged — every spirit whose heart sits inside the polygon is sealed in an
// ink ring, and when the ring bursts it splashes, sealing its neighbours,
// which burst in turn. Chains build the combo; the combo builds the score.

import { ARENA, PLAYER_BASE, SPIRITS, UPGRADES, RELICS, WORKSHOP } from './config.js';
import { ZONES } from './levels.js';

const META_KEY = 'inkward.meta.v1';

// ---------------------------------------------------------------- meta

export function loadMeta() {
  const fallback = { beads: 0, shop: {}, bestScore: 0, bestGrade: '', wins: 0, runs: 0 };
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed, shop: parsed.shop ?? {} };
  } catch {
    return fallback;
  }
}

export function saveMeta(meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // A private window or a full disk: the run still counts, it just
    // will not be remembered.
  }
}

export function workshopLevel(meta, id) {
  return meta.shop[id] ?? 0;
}

export function buyWorkshop(meta, id) {
  const item = WORKSHOP.find((w) => w.id === id);
  if (!item) return false;
  const level = workshopLevel(meta, id);
  if (level >= item.max) return false;
  const cost = item.costs[level];
  if (meta.beads < cost) return false;
  meta.beads -= cost;
  meta.shop[id] = level + 1;
  saveMeta(meta);
  return true;
}

// ---------------------------------------------------------------- geometry

function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.hypot(dx, dy);
}

function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

// ---------------------------------------------------------------- the world

export class World {
  constructor(rng, meta) {
    this.rng = rng;
    this.meta = meta;
    this.events = [];
    this.time = 0;
    this.outcome = null; // null | 'victory' | 'defeat'
    this.state = 'fighting'; // fighting | waveclear | zoneclear
    this.zoneIndex = 0;
    this.waveIndex = 0;
    this.finalized = false;

    const shop = (id) => workshopLevel(meta, id);
    this.scoreMul = 1 + 0.06 * shop('gildedhanko');
    this.player = {
      x: ARENA.x + ARENA.w / 2,
      y: ARENA.y + ARENA.h / 2,
      hp: PLAYER_BASE.hp + 10 * shop('sturdypaper'),
      maxHp: PLAYER_BASE.hp + 10 * shop('sturdypaper'),
      ink: PLAYER_BASE.ink + 10 * shop('deepstone'),
      maxInk: PLAYER_BASE.ink + 10 * shop('deepstone'),
      face: 1,
      radius: PLAYER_BASE.radius,
      dashT: 0,
      dashCd: 0,
      dashDir: { x: 1, y: 0 },
      invulnT: 0,
    };
    this.mods = {
      speedMul: 1 + 0.04 * shop('wornsandals'),
      inkRegenMul: 1,
      inkCostMul: 1,
      trailLife: PLAYER_BASE.trailLife,
      chainR: PLAYER_BASE.chainRadius,
      chainBonus: 0,
      sealFuseMul: 1,
      bruteHits: 1,
      beadMul: 1,
      dashCdMul: 1 - 0.07 * shop('secondbreath'),
      dashTimeMul: 1,
      comboWindow: 2.2,
      thornStacks: 0,
      echoStacks: 0,
      wideStacks: 0,
      bigLoopStacks: 0,
    };

    this.trail = { points: [], active: false, fade: 0 };
    this.spirits = [];
    this.particles = [];
    this.rings = [];
    this.motes = [];
    this.floaters = [];
    this.spawnQueue = [];
    this.spawnT = 0;
    this.boss = null;

    this.score = 0;
    this.beadsRun = 0;
    this.combo = 0;
    this.comboT = 0;
    this.bestCombo = 0;
    this.maxChain = 0;
    this.loopsClosed = 0;
    this.sealedTotal = 0;
    this.burstTotal = 0;
    this.damageTaken = 0;
    this.thunderT = 4;
    this.mirrorUsedZone = false;
    this.upgradeLevels = {};
    this.relics = new Set();
    this.blessing = '';
  }

  get zone() {
    return ZONES[this.zoneIndex];
  }

  get multiplier() {
    return Math.min(8, 1 + Math.floor(this.combo / 6));
  }

  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }

  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  // ------------------------------------------------------------ run flow

  startRun() {
    if (workshopLevel(this.meta, 'blessedbrush') > 0) {
      const pool = UPGRADES.filter((u) => (this.upgradeLevels[u.id] ?? 0) < u.max);
      if (pool.length > 0) {
        const gift = this.rng.pick(pool);
        this.applyUpgrade(gift.id);
        this.blessing = gift.name;
      }
    }
    this.startZone(0);
  }

  startZone(index) {
    this.zoneIndex = index;
    this.waveIndex = 0;
    this.mirrorUsedZone = false;
    this.player.x = ARENA.x + ARENA.w / 2;
    this.player.y = ARENA.y + ARENA.h / 2;
    this.startWave(0);
  }

  startWave(index) {
    this.waveIndex = index;
    this.state = 'fighting';
    this.spirits = this.spirits.filter((s) => s.boss);
    this.trail.points = [];
    this.trail.active = false;
    const recipe = this.zone.waves[index];
    const queue = [];
    const pour = (kind, n) => {
      for (let i = 0; i < (n ?? 0); i++) queue.push(kind);
    };
    pour('wisp', recipe.w);
    pour('dart', recipe.d);
    pour('wraith', recipe.r);
    pour('brute', recipe.b);
    this.spawnQueue = this.rng.shuffle(queue);
    this.spawnT = 0.4;
    this.boss = null;
    if (recipe.boss) {
      const boss = this.spawnAt(recipe.boss, ARENA.x + ARENA.w / 2, recipe.boss === 'inkstone' ? ARENA.y + 150 : ARENA.y + ARENA.h / 2);
      this.boss = boss;
    }
    if (this.relics.has('bambooflask')) this.player.ink = this.player.maxInk;
    this.emit('wave', { zone: this.zoneIndex, wave: index });
  }

  nextWave() {
    this.startWave(this.waveIndex + 1);
  }

  applyBoon(id) {
    const p = this.player;
    if (id === 'rest') p.hp = Math.min(p.maxHp, p.hp + 40);
    if (id === 'shrine') this.beadsRun += 25;
    if (id === 'spring') {
      p.maxInk += 25;
      p.ink += 25;
    }
    if (id === 'whetstone') {
      this.mods.chainBonus += 15;
      this.mods.chainR += 15;
    }
  }

  // ------------------------------------------------------------ choices

  rollChoices() {
    const bag = [];
    for (const u of UPGRADES) {
      if ((this.upgradeLevels[u.id] ?? 0) < u.max) bag.push({ kind: 'upgrade', id: u.id, weight: 3 });
    }
    for (const r of RELICS) {
      if (!this.relics.has(r.id)) bag.push({ kind: 'relic', id: r.id, weight: 1 });
    }
    const picks = [];
    const pool = bag.slice();
    while (picks.length < 3 && pool.length > 0) {
      let total = 0;
      for (const c of pool) total += c.weight;
      let roll = this.rng.next() * total;
      let at = 0;
      while (at < pool.length - 1 && roll > pool[at].weight) {
        roll -= pool[at].weight;
        at++;
      }
      picks.push(pool[at]);
      pool.splice(at, 1);
    }
    while (picks.length < 3) picks.push({ kind: 'beads', id: 'beadcache' });
    return picks;
  }

  applyChoice(choice) {
    if (choice.kind === 'upgrade') this.applyUpgrade(choice.id);
    else if (choice.kind === 'relic') this.applyRelic(choice.id);
    else if (choice.kind === 'beads') this.beadsRun += 20;
    this.emit('upgrade');
  }

  applyUpgrade(id) {
    const p = this.player;
    const m = this.mods;
    this.upgradeLevels[id] = (this.upgradeLevels[id] ?? 0) + 1;
    switch (id) {
      case 'widebrush':
        m.wideStacks++;
        m.chainR = PLAYER_BASE.chainRadius * Math.pow(1.22, m.wideStacks) + m.chainBonus;
        break;
      case 'deepwell':
        p.maxInk += 30;
        p.ink += 30;
        break;
      case 'swiftink':
        m.inkRegenMul *= 1.4;
        break;
      case 'longtrail':
        m.trailLife += 1.6;
        break;
      case 'sandals':
        m.speedMul *= 1.11;
        break;
      case 'phantomstep':
        m.dashCdMul *= 0.7;
        m.dashTimeMul *= 1.25;
        break;
      case 'echoseal':
        m.echoStacks++;
        break;
      case 'heavysumi':
        m.bruteHits++;
        break;
      case 'secondheart':
        p.maxHp += 25;
        p.hp = Math.min(p.maxHp, p.hp + 25);
        break;
      case 'mendingwash':
        p.hp = Math.min(p.maxHp, p.hp + 35);
        break;
      case 'greedybrush':
        m.beadMul *= 1.3;
        break;
      case 'bigloops':
        m.bigLoopStacks++;
        break;
      case 'quickseal':
        m.sealFuseMul *= 0.7;
        break;
      case 'thornink':
        m.thornStacks++;
        break;
    }
  }

  applyRelic(id) {
    this.relics.add(id);
    if (id === 'papercrane') {
      this.mods.speedMul *= 1.08;
      this.mods.trailLife *= 1.25;
    }
    if (id === 'dragonwhisker') this.mods.inkCostMul *= 0.8;
    if (id === 'inkmoon') this.mods.comboWindow += 1.2;
  }

  hasSynergy(a, b) {
    const up = (id) => (this.upgradeLevels[id] ?? 0) > 0;
    const both = (x, y) => (up(x) || this.relics.has(x)) && (up(y) || this.relics.has(y));
    return both(a, b);
  }

  // ------------------------------------------------------------ spirits

  spawnAt(kind, x, y) {
    const spec = SPIRITS[kind];
    const spirit = {
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      r: spec.radius,
      hp: kind === 'brute' ? 2 : kind === 'carp' ? 6 : kind === 'inkstone' ? 9 : 1,
      maxHp: kind === 'brute' ? 2 : kind === 'carp' ? 6 : kind === 'inkstone' ? 9 : 1,
      boss: kind === 'carp' || kind === 'inkstone',
      sealed: 0,
      sealMax: 1,
      sealDepth: 0,
      sealMul: 1,
      spawnT: 0.6,
      seed: this.rng.range(0, Math.PI * 2),
      slowT: 0,
      stunT: 0,
      dead: false,
      cracked: false,
      spawnTimer: 3.5,
      ringTimer: 5,
      swimTarget: null,
    };
    this.spirits.push(spirit);
    return spirit;
  }

  spawnFromQueue(kind) {
    const side = this.rng.int(0, 3);
    const m = 46;
    let x = ARENA.x + this.rng.range(m, ARENA.w - m);
    let y = ARENA.y + this.rng.range(m, ARENA.h - m);
    if (side === 0) y = ARENA.y + m;
    if (side === 1) y = ARENA.y + ARENA.h - m;
    if (side === 2) x = ARENA.x + m;
    if (side === 3) x = ARENA.x + ARENA.w - m;
    // Never pour a spirit straight onto the keeper.
    if (dist(x, y, this.player.x, this.player.y) < 130) {
      x = ARENA.x + ARENA.w - (x - ARENA.x);
    }
    return this.spawnAt(kind, x, y);
  }

  isSolid(s) {
    if (s.kind !== 'wraith') return true;
    return (this.time + s.seed) % 3.4 < 2.2;
  }

  sealSpirit(s, fuse, depth, mul) {
    if (s.dead || s.sealed > 0 || !this.isSolid(s)) return false;
    s.sealed = Math.max(0.12, fuse);
    s.sealMax = s.sealed;
    s.sealDepth = depth;
    s.sealMul = mul ?? 1;
    this.sealedTotal++;
    if (depth > this.maxChain) this.maxChain = depth;
    return true;
  }

  closeLoop(polygon) {
    const area = polygonArea(polygon);
    this.loopsClosed++;
    const stamped = this.relics.has('hanko') && this.loopsClosed % 5 === 0;
    let loopMul = this.scoreMul * (stamped ? 2 : 1);
    if (this.mods.bigLoopStacks > 0) {
      loopMul *= 1 + this.mods.bigLoopStacks * Math.min(0.5, area / 24000);
    }
    let sealedCount = 0;
    for (const s of this.spirits) {
      if (s.dead || s.sealed > 0 || s.spawnT > 0) continue;
      if (pointInPolygon(s.x, s.y, polygon)) {
        if (this.sealSpirit(s, 0.9 * this.mods.sealFuseMul, 0, loopMul)) sealedCount++;
      }
    }
    // The flourish itself is worth a little ink on the page.
    this.score += Math.round(area / 60);
    if (sealedCount > 0) {
      this.player.ink = Math.min(this.player.maxInk, this.player.ink + sealedCount * 2);
      if (stamped && this.hasSynergy('hanko', 'bigloops')) {
        this.player.ink = Math.min(this.player.maxInk, this.player.ink + 10);
      }
      this.addFloater(this.player.x, this.player.y - 34, stamped ? `STAMPED! ${sealedCount} sealed` : `${sealedCount} sealed`, stamped ? '#bc3a1e' : '#211d18');
      this.emit(stamped ? 'stamp' : 'seal', { count: sealedCount });
    } else {
      this.addFloater(this.player.x, this.player.y - 34, 'an empty ring…', '#4a4238');
      this.emit('empty');
    }
    this.rings.push({ x: this.player.x, y: this.player.y, r: 10, maxR: Math.sqrt(area / Math.PI), life: 0.35, maxLife: 0.35, color: stamped ? '#bc3a1e' : '#211d18' });
    this.trail.points = [];
    this.trail.active = false;
    this.trail.fade = 0;
  }

  burstSpirit(s) {
    const spec = SPIRITS[s.kind];
    const p = this.player;
    this.combo++;
    this.comboT = this.mods.comboWindow;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    const mult = this.multiplier;

    // Bosses and brutes take the hit and stay on the page.
    if (s.boss || s.kind === 'brute') {
      const hits = s.boss ? 1 : this.mods.bruteHits;
      s.hp -= hits;
      s.sealed = 0;
      this.splashFx(s.x, s.y, s.boss ? 26 : 14);
      this.rings.push({ x: s.x, y: s.y, r: s.r, maxR: s.r + this.mods.chainR, life: 0.3, maxLife: 0.3, color: '#bc3a1e' });
      this.emit(s.boss ? 'bosshit' : 'crack', { x: s.x, y: s.y });
      if (s.hp > 0) {
        this.score += Math.round(spec.score * 0.25 * mult * s.sealMul);
        if (s.kind === 'brute' && !s.cracked) {
          s.cracked = true;
          s.r = Math.round(s.r * 0.78);
        }
        s.stunT = 0.6;
        // A wounded giant splashes wide: its pain seals the small fry.
        if (s.boss) this.chainFrom(s, this.mods.chainR * 1.6, s.sealDepth + 1, s.sealMul);
        return;
      }
      // It falls through to death below.
    }

    s.dead = true;
    this.burstTotal++;
    const gained = Math.round(spec.score * mult * s.sealMul);
    this.score += gained;
    const beads = Math.max(spec.beads, Math.round(spec.beads * this.mods.beadMul));
    this.beadsRun += beads;
    p.ink = Math.min(p.maxInk, p.ink + 3);
    this.addFloater(s.x, s.y - s.r - 6, `+${gained}`, '#211d18');
    this.splashFx(s.x, s.y, s.boss ? 40 : 16);
    this.rings.push({ x: s.x, y: s.y, r: s.r, maxR: s.r + 46, life: 0.28, maxLife: 0.28, color: '#211d18' });
    const moteCount = s.boss ? 6 : this.rng.int(1, 2);
    for (let i = 0; i < moteCount; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      this.motes.push({ x: s.x, y: s.y, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, value: 6, life: 7 });
    }
    this.emit('burst', { depth: s.sealDepth });
    this.chainFrom(s, this.splashRadius(s.sealDepth), s.sealDepth + 1, s.sealMul);
    if (s.boss) {
      this.emit('bossdown', { kind: s.kind });
      if (s.kind === 'inkstone') this.finish('victory');
      this.boss = null;
    }
  }

  splashRadius(depth) {
    let r = this.mods.chainR;
    if (depth > 0) {
      r *= this.mods.echoStacks > 0 ? 1 : 0.7;
      if (this.mods.echoStacks > 0 && this.mods.wideStacks > 0) r *= 1.15;
    }
    return r;
  }

  chainFrom(source, radius, depth, mul) {
    for (const other of this.spirits) {
      if (other === source || other.dead || other.sealed > 0 || other.spawnT > 0) continue;
      if (dist(source.x, source.y, other.x, other.y) <= radius + other.r) {
        this.sealSpirit(other, (0.24 + depth * 0.06) * this.mods.sealFuseMul, depth, mul);
      }
    }
  }

  damagePlayer(amount, fromX, fromY) {
    const p = this.player;
    if (this.outcome || p.invulnT > 0 || p.dashT > 0) return;
    p.hp -= amount;
    this.damageTaken += amount;
    p.invulnT = 0.9;
    this.emit('hurt');
    for (let i = 0; i < 10; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const sp = this.rng.range(40, 160);
      this.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, maxLife: 0.4, size: 3, color: '#bc3a1e' });
    }
    if (this.relics.has('crackedbead')) {
      let n = 0;
      for (const s of this.spirits) {
        if (!s.dead && s.sealed <= 0 && dist(p.x, p.y, s.x, s.y) < 140 && this.sealSpirit(s, 0.8, 0, 1)) n++;
      }
      if (n > 0) this.emit('seal', { count: n });
    }
    if (p.hp <= 0) {
      if (this.relics.has('mirrorcharm') && !this.mirrorUsedZone) {
        this.mirrorUsedZone = true;
        p.hp = Math.round(p.maxHp * 0.5);
        p.invulnT = 1.6;
        this.addFloater(p.x, p.y - 40, 'The mirror refuses!', '#b98a2e');
        this.emit('revive');
      } else {
        p.hp = 0;
        this.finish('defeat');
      }
    }
  }

  finish(outcome) {
    if (this.finalized) return;
    this.outcome = outcome;
    this.finalized = true;
    this.meta.beads += this.beadsRun;
    this.meta.runs += 1;
    if (outcome === 'victory') this.meta.wins += 1;
    if (this.score > this.meta.bestScore) {
      this.meta.bestScore = this.score;
    }
    saveMeta(this.meta);
    this.emit(outcome);
  }

  // ------------------------------------------------------------ effects

  splashFx(x, y, count) {
    const colors = ['#211d18', '#4a4238', this.zone.accent, '#bc3a1e'];
    for (let i = 0; i < count; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const sp = this.rng.range(50, 260);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 30,
        life: this.rng.range(0.3, 0.7),
        maxLife: 0.7,
        size: this.rng.range(2, 5),
        color: this.rng.pick(colors),
      });
    }
  }

  addFloater(x, y, text, color) {
    this.floaters.push({ x, y, text, color, life: 1.1 });
  }

  // ------------------------------------------------------------ update

  update(dt, inp) {
    this.time += dt;
    const p = this.player;

    // Combo decay.
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }

    // ---- the keeper
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.invulnT = Math.max(0, p.invulnT - dt);
    if (inp.dash && p.dashCd <= 0 && !this.outcome) {
      const dir = inp.move.x !== 0 || inp.move.y !== 0 ? inp.move : { x: p.face, y: 0 };
      p.dashDir = { x: dir.x, y: dir.y };
      p.dashT = 0.16 * this.mods.dashTimeMul;
      p.dashCd = PLAYER_BASE.dashCooldown * this.mods.dashCdMul;
      this.emit('dash');
    }
    let vx = 0;
    let vy = 0;
    if (p.dashT > 0) {
      p.dashT -= dt;
      vx = p.dashDir.x * PLAYER_BASE.dashSpeed;
      vy = p.dashDir.y * PLAYER_BASE.dashSpeed;
    } else if (!this.outcome) {
      vx = inp.move.x * PLAYER_BASE.speed * this.mods.speedMul;
      vy = inp.move.y * PLAYER_BASE.speed * this.mods.speedMul;
    }
    if (vx !== 0) p.face = Math.sign(vx);
    p.x = Math.min(ARENA.x + ARENA.w - p.radius, Math.max(ARENA.x + p.radius, p.x + vx * dt));
    p.y = Math.min(ARENA.y + ARENA.h - p.radius, Math.max(ARENA.y + p.radius, p.y + vy * dt));

    // ---- the brush trail
    const dashPainting = this.relics.has('carpscale') && p.dashT > 0;
    const painting = (inp.draw && p.ink > 0 && !this.outcome) || dashPainting;
    if (painting) {
      const pts = this.trail.points;
      const last = pts[pts.length - 1];
      if (!last || dist(p.x, p.y, last.x, last.y) >= 5) {
        if (last && !dashPainting) {
          const cost = dist(p.x, p.y, last.x, last.y) * PLAYER_BASE.inkCostPerPx * this.mods.inkCostMul;
          p.ink = Math.max(0, p.ink - cost);
        }
        pts.push({ x: p.x, y: p.y, born: this.time });
      }
      this.trail.active = true;
      this.trail.fade = 0;
      if (pts.length >= 10) this.tryCloseLoop();
    } else if (this.trail.active) {
      this.trail.fade += dt;
      if (this.trail.fade > 0.45) {
        this.trail.points = [];
        this.trail.active = false;
        this.trail.fade = 0;
      }
    }
    // Dry ink falls off the front of the stroke.
    const pts = this.trail.points;
    while (pts.length > 0 && this.time - pts[0].born > this.mods.trailLife) pts.shift();
    if (pts.length < 2 && this.trail.active && !painting) {
      this.trail.points = [];
      this.trail.active = false;
    }

    // Ink returns on its own, slowly.
    p.ink = Math.min(p.maxInk, p.ink + PLAYER_BASE.inkRegen * this.mods.inkRegenMul * dt);

    // ---- spawning
    if (this.spawnQueue.length > 0 && !this.outcome) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnT = 0.65;
        this.spawnFromQueue(this.spawnQueue.shift());
      }
    }

    // ---- thunder bristles
    if (this.relics.has('thunderbristles') && !this.outcome) {
      this.thunderT -= dt;
      if (this.thunderT <= 0) {
        this.thunderT = 5;
        const free = this.spirits.filter((s) => !s.dead && s.sealed <= 0 && s.spawnT <= 0 && !s.boss);
        if (free.length > 0) {
          const target = this.rng.pick(free);
          if (this.sealSpirit(target, 0.7, 0, 1)) {
            this.rings.push({ x: target.x, y: target.y, r: 4, maxR: target.r + 18, life: 0.3, maxLife: 0.3, color: '#b98a2e' });
            this.emit('seal', { count: 1 });
          }
        }
      }
    }

    // ---- spirits
    for (const s of this.spirits) {
      if (s.dead) continue;
      if (s.spawnT > 0) {
        s.spawnT -= dt;
        continue;
      }
      if (s.sealed > 0) {
        s.sealed -= dt;
        if (s.sealed <= 0) this.burstSpirit(s);
        continue;
      }
      if (s.stunT > 0) {
        s.stunT -= dt;
        continue;
      }
      this.moveSpirit(s, dt);
    }
    // Gentle separation so spirits read as individuals, not a smear.
    for (let i = 0; i < this.spirits.length; i++) {
      const a = this.spirits[i];
      if (a.dead || a.sealed > 0) continue;
      for (let j = i + 1; j < this.spirits.length; j++) {
        const b = this.spirits[j];
        if (b.dead || b.sealed > 0) continue;
        const d = dist(a.x, a.y, b.x, b.y);
        const min = (a.r + b.r) * 0.8;
        if (d > 0 && d < min) {
          const push = ((min - d) / d) * 0.5;
          const dx = (b.x - a.x) * push;
          const dy = (b.y - a.y) * push;
          if (!a.boss) { a.x -= dx * 0.5; a.y -= dy * 0.5; }
          if (!b.boss) { b.x += dx * 0.5; b.y += dy * 0.5; }
        }
      }
    }
    this.spirits = this.spirits.filter((s) => !s.dead);

    // ---- contact
    if (!this.outcome) {
      for (const s of this.spirits) {
        if (s.dead || s.sealed > 0 || s.spawnT > 0 || !this.isSolid(s)) continue;
        if (dist(p.x, p.y, s.x, s.y) < s.r + p.radius - 2) {
          this.damagePlayer(SPIRITS[s.kind].damage, s.x, s.y);
          const away = Math.atan2(s.y - p.y, s.x - p.x);
          if (!s.boss) {
            s.x += Math.cos(away) * 26;
            s.y += Math.sin(away) * 26;
          }
        }
      }
    }

    // ---- motes drift home
    for (const mote of this.motes) {
      mote.life -= dt;
      const d = dist(mote.x, mote.y, p.x, p.y);
      if (d < 110) {
        const pull = 340 * dt;
        mote.x += ((p.x - mote.x) / (d || 1)) * pull;
        mote.y += ((p.y - mote.y) / (d || 1)) * pull;
      } else {
        mote.x += mote.vx * dt;
        mote.y += mote.vy * dt;
        mote.vx *= 0.92;
        mote.vy *= 0.92;
      }
      if (d < 24 && mote.life > 0) {
        mote.life = 0;
        p.ink = Math.min(p.maxInk, p.ink + mote.value);
        this.emit('pickup');
      }
    }
    this.motes = this.motes.filter((m) => m.life > 0);

    // ---- effects
    for (const fx of this.particles) {
      fx.life -= dt;
      fx.x += fx.vx * dt;
      fx.y += fx.vy * dt;
      fx.vy += 190 * dt;
    }
    this.particles = this.particles.filter((fx) => fx.life > 0);
    for (const ring of this.rings) {
      ring.life -= dt;
      ring.r += (ring.maxR - ring.r) * Math.min(1, dt * 10);
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= 34 * dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);

    // ---- wave judgement
    if (this.state === 'fighting' && !this.outcome && this.spawnQueue.length === 0 && this.spirits.length === 0) {
      const lastWave = this.waveIndex >= this.zone.waves.length - 1;
      this.state = lastWave ? 'zoneclear' : 'waveclear';
      if (this.relics.has('oldcoin')) this.beadsRun += 3;
      this.emit('waveclear', { lastWave });
    }
  }

  tryCloseLoop() {
    const pts = this.trail.points;
    const head = pts[pts.length - 1];
    for (let i = 0; i <= pts.length - 10; i++) {
      if (dist(head.x, head.y, pts[i].x, pts[i].y) <= 30) {
        const polygon = pts.slice(i);
        if (polygonArea(polygon) >= PLAYER_BASE.minLoopArea) {
          this.closeLoop(polygon);
          return;
        }
      }
    }
  }

  moveSpirit(s, dt) {
    const p = this.player;
    const zoneMul = 1 + this.zoneIndex * 0.1;
    // Thorn ink: dragging through a wet stroke slows a spirit down.
    if (this.mods.thornStacks > 0 && this.trail.points.length > 1) {
      for (let i = 0; i < this.trail.points.length; i += 3) {
        const tp = this.trail.points[i];
        if (Math.abs(tp.x - s.x) < 18 && Math.abs(tp.y - s.y) < 18) {
          s.slowT = 0.4;
          break;
        }
      }
    }
    s.slowT = Math.max(0, s.slowT - dt);
    const slowMul = s.slowT > 0 ? 0.55 : 1;
    const t = this.time + s.seed;
    let vx = 0;
    let vy = 0;
    const toward = Math.atan2(p.y - s.y, p.x - s.x);

    switch (s.kind) {
      case 'wisp': {
        const sp = 62 * zoneMul * slowMul;
        vx = Math.cos(toward) * sp + Math.cos(t * 2.6) * 16;
        vy = Math.sin(toward) * sp + Math.sin(t * 3.1) * 16;
        break;
      }
      case 'dart': {
        const sp = 150 * zoneMul * slowMul;
        const wig = Math.sin(t * 8.5) * 74;
        vx = Math.cos(toward) * sp + Math.cos(toward + Math.PI / 2) * wig;
        vy = Math.sin(toward) * sp + Math.sin(toward + Math.PI / 2) * wig;
        break;
      }
      case 'wraith': {
        const sp = 80 * zoneMul * slowMul;
        vx = Math.cos(toward) * sp + Math.cos(t * 1.4) * 22;
        vy = Math.sin(toward) * sp + Math.sin(t * 1.1) * 22;
        break;
      }
      case 'brute': {
        const sp = 43 * zoneMul * slowMul;
        vx = Math.cos(toward) * sp;
        vy = Math.sin(toward) * sp;
        break;
      }
      case 'carp': {
        if (!s.swimTarget || dist(s.x, s.y, s.swimTarget.x, s.swimTarget.y) < 40) {
          s.swimTarget = {
            x: ARENA.x + this.rng.range(120, ARENA.w - 120),
            y: ARENA.y + this.rng.range(110, ARENA.h - 110),
          };
        }
        const a = Math.atan2(s.swimTarget.y - s.y, s.swimTarget.x - s.x);
        const sp = 118 * slowMul;
        vx = Math.cos(a) * sp;
        vy = Math.sin(a) * sp;
        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
          s.spawnTimer = 4.5;
          const minions = this.spirits.filter((o) => !o.boss && !o.dead).length;
          if (minions < 6 && !this.outcome) this.spawnAt('wisp', s.x + 40, s.y);
        }
        break;
      }
      case 'inkstone': {
        s.ringTimer -= dt;
        if (s.ringTimer <= 0 && !this.outcome) {
          s.ringTimer = 5;
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + s.seed;
            const dart = this.spawnAt('dart', s.x + Math.cos(a) * 70, s.y + Math.sin(a) * 70);
            dart.spawnT = 0.3;
          }
        }
        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0 && !this.outcome) {
          s.spawnTimer = 9;
          const minions = this.spirits.filter((o) => !o.boss && !o.dead).length;
          if (minions < 8) {
            this.spawnAt('wraith', s.x - 90, s.y + 40);
            this.spawnAt('wraith', s.x + 90, s.y + 40);
          }
        }
        return; // The inkstone does not walk. It waits, and cracks.
      }
    }
    s.vx = vx;
    s.vy = vy;
    s.x += vx * dt;
    s.y += vy * dt;
    s.x = Math.min(ARENA.x + ARENA.w - s.r, Math.max(ARENA.x + s.r, s.x));
    s.y = Math.min(ARENA.y + ARENA.h - s.r, Math.max(ARENA.y + s.r, s.y));
  }
}
