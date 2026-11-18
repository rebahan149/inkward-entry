// INKWARD is drawn, not loaded: every stalk of bamboo, crack of lake ice
// and splash of sumi is canvas code in this file. The renderer reads the
// game state main.js hands it and paints one frame; it owns the layout of
// every button and card, and exports those rectangles so main.js can answer
// clicks with the same geometry the player sees.

import {
  VIEW_W, VIEW_H, ARENA, INK, INK_SOFT, PAPER_DEEP,
  VERMILLION, VERMILLION_DEEP, GOLD, JADE, UPGRADES, RELICS, WORKSHOP, gradeFor,
} from './config.js';
import { ZONES, ROAD_BOONS, BOSS_NAMES } from './levels.js';
import { workshopLevel } from './world.js';
import { input } from './input.js';

export const UI = {
  playBtn: { x: 426, y: 462, w: 300, h: 66 },
  workshopBtn: { x: 426, y: 542, w: 300, h: 50 },
  backBtn: { x: 886, y: 668, w: 190, h: 50 },
  againBtn: { x: 316, y: 606, w: 250, h: 56 },
  titleBtn: { x: 586, y: 606, w: 250, h: 56 },
  cardRect: (i) => ({ x: 102 + i * 324, y: 226, w: 300, h: 330 }),
  boonRect: (i) => ({ x: 166 + i * 420, y: 452, w: 400, h: 128 }),
  rowRect: (i) => ({ x: 126, y: 158 + i * 82, w: 900, h: 72 }),
};

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line === '' ? word : `${line} ${word}`;
    if (ctx.measureText(trial).width > maxWidth && line !== '') {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  }
  if (line !== '') lines.push(line);
  return lines;
}

/** A tiny deterministic scatter, so a scroll's decoration never changes. */
function scatter(seed, count) {
  let state = seed >>> 0 || 7;
  const out = [];
  for (let i = 0; i < count; i++) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    out.push((state >>> 8) / 16777216);
  }
  return out;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paperCache = new Map();
  }

  // ------------------------------------------------------------ paper

  paperFor(zone) {
    if (this.paperCache.has(zone.id)) return this.paperCache.get(zone.id);
    const off = document.createElement('canvas');
    off.width = VIEW_W;
    off.height = VIEW_H;
    const c = off.getContext('2d');
    c.fillStyle = zone.paper;
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    // A soft wash pooling in the middle of the sheet.
    const wash = c.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 120, VIEW_W / 2, VIEW_H / 2, 640);
    wash.addColorStop(0, zone.wash);
    wash.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = wash;
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    // Paper fibres: faint short strokes, denser near the edges.
    const fibres = scatter(zone.id.length * 977 + 13, 700);
    c.strokeStyle = 'rgba(120,100,70,0.10)';
    c.lineWidth = 1;
    for (let i = 0; i < 350; i++) {
      const x = fibres[i * 2] * VIEW_W;
      const y = fibres[i * 2 + 1] * VIEW_H;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 6 + fibres[(i * 2 + 40) % 700] * 10, y + 1);
      c.stroke();
    }
    this.decorate(c, zone);
    this.paperCache.set(zone.id, off);
    return off;
  }

  decorate(c, zone) {
    const { x, y, w, h } = ARENA;
    if (zone.motif === 'bamboo') {
      c.save();
      const rnd = scatter(41, 60);
      for (let i = 0; i < 9; i++) {
        const bx = x + 14 + rnd[i * 3] * 40 + (i % 2) * (w - 90);
        const bh = 150 + rnd[i * 3 + 1] * 190;
        const by = i % 2 === 0 ? y + 6 : y + h - bh - 6;
        c.strokeStyle = 'rgba(63,111,90,0.30)';
        c.lineWidth = 7;
        c.beginPath();
        c.moveTo(bx, by);
        c.lineTo(bx + 4, by + bh);
        c.stroke();
        c.lineWidth = 1.6;
        for (let n = 1; n < 5; n++) {
          c.beginPath();
          c.moveTo(bx - 4 + (4 * n) / 5, by + (bh * n) / 5 - 2);
          c.lineTo(bx + 8 + (4 * n) / 5, by + (bh * n) / 5 + 2);
          c.stroke();
        }
        c.fillStyle = 'rgba(63,111,90,0.28)';
        for (let leaf = 0; leaf < 3; leaf++) {
          const lx = bx + rnd[(i * 3 + leaf) % 60] * 44 - 18;
          const ly = by + rnd[(i * 5 + leaf + 9) % 60] * bh;
          c.beginPath();
          c.ellipse(lx, ly, 13, 4.5, 0.7, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.restore();
    } else if (zone.motif === 'lake') {
      c.save();
      c.strokeStyle = 'rgba(60,90,120,0.20)';
      c.lineWidth = 1.4;
      const rnd = scatter(97, 40);
      for (let i = 0; i < 7; i++) {
        const cx = x + 90 + rnd[i * 2] * (w - 180);
        const cy = y + 70 + rnd[i * 2 + 1] * (h - 140);
        for (let ring = 1; ring <= 3; ring++) {
          c.beginPath();
          c.ellipse(cx, cy, ring * 22, ring * 9, 0, 0, Math.PI * 2);
          c.stroke();
        }
      }
      c.strokeStyle = 'rgba(60,90,120,0.13)';
      for (let i = 0; i < 6; i++) {
        let px = x + rnd[(i * 3 + 5) % 40] * w;
        let py = y + rnd[(i * 3 + 11) % 40] * h;
        c.beginPath();
        c.moveTo(px, py);
        for (let step = 0; step < 4; step++) {
          px += (rnd[(i + step * 7) % 40] - 0.5) * 130;
          py += (rnd[(i + step * 5 + 3) % 40] - 0.5) * 90;
          c.lineTo(px, py);
        }
        c.stroke();
      }
      c.restore();
    } else {
      // Ember shrine: a faded torii watches from the top of the scroll.
      c.save();
      c.fillStyle = 'rgba(188,58,30,0.16)';
      const cx = VIEW_W / 2;
      const top = ARENA.y + 16;
      c.fillRect(cx - 150, top, 300, 13);
      c.fillRect(cx - 128, top + 26, 256, 10);
      c.fillRect(cx - 118, top, 15, 96);
      c.fillRect(cx + 103, top, 15, 96);
      c.fillRect(cx - 7, top + 13, 14, 40);
      const rnd = scatter(61, 30);
      c.fillStyle = 'rgba(188,58,30,0.20)';
      for (let i = 0; i < 14; i++) {
        c.beginPath();
        c.arc(x + rnd[i * 2] * w, y + rnd[i * 2 + 1] * h, 2.2, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
  }

  frame(zone) {
    const c = this.ctx;
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.strokeRect(ARENA.x - 8, ARENA.y - 8, ARENA.w + 16, ARENA.h + 16);
    c.lineWidth = 1;
    c.strokeRect(ARENA.x - 14, ARENA.y - 14, ARENA.w + 28, ARENA.h + 28);
    c.fillStyle = zone.accent;
    for (const [cx, cy] of [
      [ARENA.x - 14, ARENA.y - 14],
      [ARENA.x + ARENA.w + 14, ARENA.y - 14],
      [ARENA.x - 14, ARENA.y + ARENA.h + 14],
      [ARENA.x + ARENA.w + 14, ARENA.y + ARENA.h + 14],
    ]) {
      c.beginPath();
      c.arc(cx, cy, 4, 0, Math.PI * 2);
      c.fill();
    }
  }

  // ------------------------------------------------------------ actors

  drawPlayer(world) {
    const c = this.ctx;
    const p = world.player;
    if (p.invulnT > 0 && Math.floor(world.time * 14) % 2 === 0) return; // hurt blink
    c.save();
    c.translate(p.x, p.y);
    // Shadow.
    c.fillStyle = 'rgba(33,29,24,0.18)';
    c.beginPath();
    c.ellipse(0, 13, 15, 5, 0, 0, Math.PI * 2);
    c.fill();
    // Robe.
    c.fillStyle = INK;
    c.beginPath();
    c.moveTo(0, -14);
    c.quadraticCurveTo(13, 2, 10, 15);
    c.lineTo(-10, 15);
    c.quadraticCurveTo(-13, 2, 0, -14);
    c.fill();
    // Sash.
    c.fillStyle = VERMILLION;
    c.fillRect(-9, 4, 18, 3.4);
    // Head and bun.
    c.fillStyle = '#efd9b4';
    c.beginPath();
    c.arc(0, -17, 7.5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = INK;
    c.beginPath();
    c.arc(0, -25, 3.6, 0, Math.PI * 2);
    c.fill();
    // Brush, held toward the facing side.
    const bx = p.face * 13;
    c.strokeStyle = '#7a5a34';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(p.face * 4, 0);
    c.lineTo(bx, 7);
    c.stroke();
    c.fillStyle = INK;
    c.beginPath();
    c.ellipse(bx + p.face * 2, 10, 3.4, 5.4, p.face * 0.5, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  drawSpirit(world, s) {
    const c = this.ctx;
    const t = world.time;
    c.save();
    c.translate(s.x, s.y);
    if (s.spawnT > 0) c.globalAlpha = 0.35 + 0.4 * (1 - s.spawnT / 0.6);
    if (s.kind === 'wraith') {
      const phase = (t + s.seed) % 3.4;
      c.globalAlpha *= phase < 2.2 ? 0.95 : 0.28;
    }
    const wob = 1 + 0.05 * Math.sin(t * 3 + s.seed * 4);
    if (s.kind === 'carp') this.drawCarp(world, s, wob);
    else if (s.kind === 'inkstone') this.drawInkstone(world, s, wob);
    else {
      const stretch = s.kind === 'dart' ? 1.25 : 1;
      c.scale(stretch * wob, wob);
      c.fillStyle = INK;
      c.beginPath();
      c.arc(0, 0, s.r, 0, Math.PI * 2);
      c.fill();
      if (s.kind === 'brute') {
        c.strokeStyle = 'rgba(244,236,217,0.5)';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(0, 0, s.r * 0.62, 0.4, 2.4);
        c.stroke();
        if (s.cracked) {
          c.beginPath();
          c.moveTo(-s.r * 0.5, -s.r * 0.6);
          c.lineTo(-s.r * 0.1, 0);
          c.lineTo(-s.r * 0.4, s.r * 0.6);
          c.stroke();
        }
      }
      // Eyes, watching the keeper.
      const look = Math.atan2(world.player.y - s.y, world.player.x - s.x);
      const ex = Math.cos(look) * 2.4;
      const ey = Math.sin(look) * 2.4;
      c.fillStyle = '#f4ecd9';
      const gap = s.r * 0.36;
      for (const side of [-1, 1]) {
        c.beginPath();
        c.arc(side * gap + ex, -s.r * 0.12 + ey, s.r * 0.17, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = INK;
        c.beginPath();
        c.arc(side * gap + ex * 1.7, -s.r * 0.12 + ey * 1.7, s.r * 0.08, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#f4ecd9';
      }
    }
    c.restore();

    // The sealing ring sits above the spirit, vermillion and closing.
    if (s.sealed > 0) {
      c.save();
      c.translate(s.x, s.y);
      const frac = Math.max(0, s.sealed / s.sealMax);
      c.strokeStyle = VERMILLION;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 0, s.r + 7, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = VERMILLION_DEEP;
      c.lineWidth = 5;
      c.beginPath();
      c.arc(0, 0, s.r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      c.stroke();
      c.restore();
    }
    // Health pips for the tough ones.
    if ((s.boss || s.kind === 'brute') && s.hp < s.maxHp) {
      c.save();
      c.translate(s.x, s.y - s.r - 14);
      for (let i = 0; i < s.maxHp; i++) {
        c.fillStyle = i < s.hp ? VERMILLION : 'rgba(33,29,24,0.25)';
        c.beginPath();
        c.arc((i - (s.maxHp - 1) / 2) * 11, 0, 3.6, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
  }

  drawCarp(world, s, wob) {
    const c = this.ctx;
    const heading = Math.atan2(s.vy, s.vx);
    c.rotate(heading);
    c.scale(wob, wob);
    c.fillStyle = INK;
    c.beginPath();
    c.ellipse(0, 0, s.r * 1.25, s.r * 0.72, 0, 0, Math.PI * 2);
    c.fill();
    // Tail and fin.
    c.beginPath();
    c.moveTo(-s.r * 1.1, 0);
    c.lineTo(-s.r * 1.7, -s.r * 0.55);
    c.lineTo(-s.r * 1.7, s.r * 0.55);
    c.closePath();
    c.fill();
    c.fillStyle = VERMILLION;
    c.beginPath();
    c.ellipse(-s.r * 0.1, -s.r * 0.62, s.r * 0.3, s.r * 0.14, -0.5, 0, Math.PI * 2);
    c.fill();
    // Scales.
    c.strokeStyle = 'rgba(244,236,217,0.35)';
    c.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.arc(i * s.r * 0.42, 0, s.r * 0.34, -1.1, 1.1);
      c.stroke();
    }
    // Eye and whiskers.
    c.fillStyle = '#f4ecd9';
    c.beginPath();
    c.arc(s.r * 0.78, -s.r * 0.2, s.r * 0.13, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(s.r * 1.15, s.r * 0.1);
    c.quadraticCurveTo(s.r * 1.5, s.r * 0.3, s.r * 1.62, s.r * 0.05);
    c.moveTo(s.r * 1.15, -s.r * 0.15);
    c.quadraticCurveTo(s.r * 1.5, -s.r * 0.35, s.r * 1.62, -s.r * 0.2);
    c.stroke();
  }

  drawInkstone(world, s, wob) {
    const c = this.ctx;
    const pulse = 1 + 0.03 * Math.sin(world.time * 2 + s.seed);
    c.scale(wob * pulse, wob * pulse);
    c.fillStyle = INK;
    const r = s.r;
    c.beginPath();
    c.moveTo(-r, -r * 0.6);
    c.quadraticCurveTo(0, -r * 1.15, r, -r * 0.6);
    c.quadraticCurveTo(r * 1.1, r * 0.4, r * 0.6, r * 0.9);
    c.lineTo(-r * 0.6, r * 0.9);
    c.quadraticCurveTo(-r * 1.1, r * 0.4, -r, -r * 0.6);
    c.fill();
    // The crack, glowing vermillion.
    c.strokeStyle = VERMILLION;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-r * 0.1, -r * 0.95);
    c.lineTo(r * 0.08, -r * 0.3);
    c.lineTo(-r * 0.14, r * 0.15);
    c.lineTo(r * 0.1, r * 0.8);
    c.stroke();
    c.strokeStyle = 'rgba(188,58,30,0.6)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(r * 0.08, -r * 0.3);
    c.lineTo(r * 0.45, r * 0.05);
    c.moveTo(-r * 0.14, r * 0.15);
    c.lineTo(-r * 0.5, r * 0.4);
    c.stroke();
  }

  // ------------------------------------------------------------ play field

  drawPlay(G) {
    const c = this.ctx;
    const world = G.world;
    const zone = world.zone;
    c.drawImage(this.paperFor(zone), 0, 0);
    this.frame(zone);

    // Motes of loose ink.
    for (const mote of world.motes) {
      c.fillStyle = INK;
      c.beginPath();
      c.arc(mote.x, mote.y, 4 + Math.sin(world.time * 5 + mote.x) * 0.8, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(244,236,217,0.8)';
      c.beginPath();
      c.arc(mote.x - 1.4, mote.y - 1.4, 1.3, 0, Math.PI * 2);
      c.fill();
    }

    // The wet trail.
    const pts = world.trail.points;
    if (pts.length > 1) {
      c.save();
      if (!world.trail.active) c.globalAlpha = Math.max(0, 1 - world.trail.fade / 0.45) * 0.8;
      c.strokeStyle = INK;
      c.lineWidth = 7;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
      c.stroke();
      c.restore();
    }

    for (const s of world.spirits) this.drawSpirit(world, s);
    this.drawPlayer(world);

    // Splashes and rings.
    for (const fx of world.particles) {
      c.globalAlpha = Math.max(0, fx.life / fx.maxLife);
      c.fillStyle = fx.color;
      c.beginPath();
      c.arc(fx.x, fx.y, fx.size, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    for (const ring of world.rings) {
      c.globalAlpha = Math.max(0, ring.life / ring.maxLife) * 0.8;
      c.strokeStyle = ring.color;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;

    // Floaters.
    c.textAlign = 'center';
    for (const f of world.floaters) {
      c.globalAlpha = Math.min(1, f.life);
      c.font = `700 17px ${SERIF}`;
      c.fillStyle = f.color;
      c.fillText(f.text, f.x, f.y);
    }
    c.globalAlpha = 1;

    this.drawHud(G);

    if (G.message && G.messageT > 0) {
      c.save();
      c.globalAlpha = Math.min(1, G.messageT);
      c.font = `italic 600 21px ${SERIF}`;
      c.textAlign = 'center';
      c.fillStyle = INK;
      c.fillText(G.message, VIEW_W / 2, ARENA.y + 44);
      c.restore();
    }
  }

  drawHud(G) {
    const c = this.ctx;
    const world = G.world;
    const p = world.player;
    const zone = world.zone;
    // Top band.
    c.fillStyle = 'rgba(244,236,217,0.85)';
    c.fillRect(0, 0, VIEW_W, 78);
    c.strokeStyle = INK;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, 78);
    c.lineTo(VIEW_W, 78);
    c.stroke();

    const bar = (x, y, w, frac, color, label, text) => {
      c.fillStyle = 'rgba(33,29,24,0.16)';
      c.fillRect(x, y, w, 15);
      c.fillStyle = color;
      c.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), 15);
      c.strokeStyle = INK;
      c.lineWidth = 1.4;
      c.strokeRect(x, y, w, 15);
      c.font = `700 11px ${SANS}`;
      c.textAlign = 'left';
      c.fillStyle = INK;
      c.fillText(label, x, y - 5);
      c.textAlign = 'right';
      c.fillText(text, x + w, y - 5);
    };
    bar(30, 34, 250, p.hp / p.maxHp, VERMILLION, 'VIGOUR', `${Math.ceil(p.hp)} / ${p.maxHp}`);
    bar(30, 62, 250, p.ink / p.maxInk, INK, 'INK', `${Math.floor(p.ink)} / ${p.maxInk}`);

    c.textAlign = 'center';
    c.fillStyle = INK;
    c.font = `700 21px ${SERIF}`;
    c.fillText(zone.name, VIEW_W / 2, 34);
    c.font = `14px ${SANS}`;
    c.fillStyle = '#4a4238';
    const left = world.spawnQueue.length + world.spirits.length;
    c.fillText(`Wave ${world.waveIndex + 1} of ${zone.waves.length} · ${left} spirit${left === 1 ? '' : 's'} astir`, VIEW_W / 2, 58);

    c.textAlign = 'right';
    c.fillStyle = INK;
    c.font = `700 24px ${SERIF}`;
    c.fillText(`${world.score}`, VIEW_W - 30, 36);
    c.font = `13px ${SANS}`;
    c.fillStyle = '#4a4238';
    c.fillText('SCORE', VIEW_W - 30, 16);
    // Beads.
    c.fillStyle = INK;
    c.beginPath();
    c.arc(VIEW_W - 138, 58, 5, 0, Math.PI * 2);
    c.fill();
    c.font = `600 15px ${SANS}`;
    c.fillStyle = INK;
    c.textAlign = 'left';
    c.fillText(`${world.beadsRun} beads`, VIEW_W - 126, 63);
    // Combo.
    if (world.combo > 1) {
      c.textAlign = 'right';
      c.fillStyle = VERMILLION;
      c.font = `900 26px ${SERIF}`;
      c.fillText(`×${world.multiplier}`, VIEW_W - 160, 38);
      c.font = `12px ${SANS}`;
      c.fillStyle = '#4a4238';
      c.fillText(`${world.combo} chain`, VIEW_W - 160, 16);
      c.fillStyle = 'rgba(188,58,30,0.35)';
      c.fillRect(VIEW_W - 236, 42, 76, 4);
      c.fillStyle = VERMILLION;
      c.fillRect(VIEW_W - 236, 42, 76 * Math.max(0, world.comboT / world.mods.comboWindow), 4);
    }

    // Boss bar.
    if (world.boss && !world.boss.dead) {
      const b = world.boss;
      const w = 460;
      const x = (VIEW_W - w) / 2;
      const y = VIEW_H - 26;
      c.fillStyle = 'rgba(33,29,24,0.25)';
      c.fillRect(x, y, w, 10);
      c.fillStyle = VERMILLION_DEEP;
      c.fillRect(x, y, (w * b.hp) / b.maxHp, 10);
      c.strokeStyle = INK;
      c.lineWidth = 1.2;
      c.strokeRect(x, y, w, 10);
      c.font = `700 13px ${SERIF}`;
      c.textAlign = 'center';
      c.fillStyle = INK;
      c.fillText(BOSS_NAMES[b.kind], VIEW_W / 2, y - 6);
    }

    // Sound state.
    c.font = `12px ${SANS}`;
    c.textAlign = 'left';
    c.fillStyle = '#4a4238';
    c.fillText(G.muted ? 'M — sound off' : 'M — sound on', 30, VIEW_H - 8);
  }

  // ------------------------------------------------------------ screens

  button(rect, label, { fill = INK, fg = '#f4ecd9', font = 22 } = {}) {
    const c = this.ctx;
    const hover = inRect(input.mouse.x, input.mouse.y, rect);
    c.save();
    c.fillStyle = hover ? VERMILLION : fill;
    c.fillRect(rect.x, rect.y, rect.w, rect.h);
    c.strokeStyle = INK;
    c.lineWidth = 2;
    c.strokeRect(rect.x, rect.y, rect.w, rect.h);
    c.fillStyle = fg;
    c.font = `700 ${font}px ${SERIF}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
    c.restore();
  }

  stamp(x, y, size, label) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(-0.06);
    c.fillStyle = VERMILLION;
    c.fillRect(-size / 2, -size / 2, size, size);
    c.strokeStyle = '#f4ecd9';
    c.lineWidth = 2;
    c.strokeRect(-size / 2 + 4, -size / 2 + 4, size - 8, size - 8);
    c.fillStyle = '#f4ecd9';
    c.font = `900 ${size * 0.52}px ${SERIF}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(label, 0, 2);
    c.restore();
  }

  drawTitle(G) {
    const c = this.ctx;
    const zone = ZONES[0];
    c.drawImage(this.paperFor(zone), 0, 0);
    this.frame(zone);
    c.textAlign = 'center';
    // A few idle spirits drift behind the title for life.
    if (G.world) {
      for (const s of G.world.spirits) this.drawSpirit(G.world, s);
    }
    c.fillStyle = INK;
    c.font = `900 104px ${SERIF}`;
    c.fillText('INKWARD', VIEW_W / 2, 218);
    // Brush stroke under the word.
    c.strokeStyle = VERMILLION;
    c.lineWidth = 7;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(VIEW_W / 2 - 250, 246);
    c.quadraticCurveTo(VIEW_W / 2, 258, VIEW_W / 2 + 250, 244);
    c.stroke();
    this.stamp(VIEW_W / 2 + 308, 168, 54, 'IW');
    c.font = `italic 21px ${SERIF}`;
    c.fillStyle = '#4a4238';
    c.fillText('A sumi-e sealing rite. The inkstone has cracked, and its spirits are loose upon the scrolls.', VIEW_W / 2, 292);
    c.font = `16px ${SANS}`;
    c.fillText('Walk a closed loop of ink around a spirit to seal it. Sealed spirits burst — and their splashes seal their neighbours.', VIEW_W / 2, 322);
    c.fillText('Survive eight waves on each of three scrolls, and seal the Cracked Inkstone itself.', VIEW_W / 2, 346);

    this.button(UI.playBtn, 'BEGIN THE RITE');
    this.button(UI.workshopBtn, 'WORKSHOP', { fill: '#4a4238', font: 18 });

    c.font = `15px ${SANS}`;
    c.fillStyle = INK;
    c.textAlign = 'center';
    const legend = [
      'WASD / Arrows — walk the scroll',
      'Hold Mouse — lay ink; close the loop to seal',
      'Space — dash (briefly untouchable)',
      'P — pause · M — mute · 1–3 — choose a gift',
    ];
    legend.forEach((line, i) => c.fillText(line, VIEW_W / 2, 648 + i * 22));
    c.font = `14px ${SANS}`;
    c.fillStyle = '#4a4238';
    const meta = G.meta;
    const best = meta.bestScore > 0 ? `Best score ${meta.bestScore}${meta.bestGrade ? ` · grade ${meta.bestGrade}` : ''} · ` : '';
    c.fillText(`${best}Ink beads in the sleeve: ${meta.beads}`, VIEW_W / 2, 428);
  }

  drawWorkshop(G) {
    const c = this.ctx;
    const zone = ZONES[0];
    c.drawImage(this.paperFor(zone), 0, 0);
    this.frame(zone);
    c.textAlign = 'center';
    c.fillStyle = INK;
    c.font = `900 44px ${SERIF}`;
    c.fillText('The Keeper’s Workshop', VIEW_W / 2, 84);
    c.font = `16px ${SANS}`;
    c.fillStyle = '#4a4238';
    c.fillText('Ink beads earned in the rite buy permanent blessings. They persist between visits.', VIEW_W / 2, 116);
    c.font = `700 18px ${SANS}`;
    c.fillStyle = INK;
    c.fillText(`Your sleeve holds ${G.meta.beads} beads`, VIEW_W / 2, 142);

    WORKSHOP.forEach((item, i) => {
      const rect = UI.rowRect(i);
      const level = workshopLevel(G.meta, item.id);
      const maxed = level >= item.max;
      const cost = maxed ? null : item.costs[level];
      const afford = cost !== null && G.meta.beads >= cost;
      c.save();
      c.fillStyle = 'rgba(244,236,217,0.75)';
      c.fillRect(rect.x, rect.y, rect.w, rect.h);
      c.strokeStyle = INK;
      c.lineWidth = 1.6;
      c.strokeRect(rect.x, rect.y, rect.w, rect.h);
      c.textAlign = 'left';
      c.fillStyle = INK;
      c.font = `700 19px ${SERIF}`;
      c.fillText(item.name, rect.x + 18, rect.y + 28);
      c.font = `14px ${SANS}`;
      c.fillStyle = '#4a4238';
      c.fillText(item.desc, rect.x + 18, rect.y + 52);
      // Rank pips.
      for (let pip = 0; pip < item.max; pip++) {
        c.beginPath();
        c.arc(rect.x + rect.w - 210 + pip * 22, rect.y + 36, 7, 0, Math.PI * 2);
        c.fillStyle = pip < level ? VERMILLION : 'rgba(33,29,24,0.18)';
        c.fill();
      }
      c.textAlign = 'right';
      c.font = `700 16px ${SANS}`;
      if (maxed) {
        c.fillStyle = JADE;
        c.fillText('MASTERED', rect.x + rect.w - 18, rect.y + 42);
      } else {
        c.fillStyle = afford ? VERMILLION : 'rgba(33,29,24,0.4)';
        c.fillText(`BUY — ${cost} beads`, rect.x + rect.w - 18, rect.y + 42);
      }
      c.restore();
    });
    this.button(UI.backBtn, 'BACK', { fill: '#4a4238', font: 18 });
  }

  drawMap(G) {
    const c = this.ctx;
    const world = G.world;
    const zone = ZONES[Math.min(world.zoneIndex + 1, ZONES.length - 1)];
    c.drawImage(this.paperFor(zone), 0, 0);
    this.frame(zone);
    c.textAlign = 'center';
    c.fillStyle = INK;
    c.font = `900 42px ${SERIF}`;
    c.fillText('The Pilgrim Road', VIEW_W / 2, 108);
    c.font = `italic 17px ${SERIF}`;
    c.fillStyle = '#4a4238';
    c.fillText(`${ZONES[world.zoneIndex].name} lies sealed behind you. The road forks — choose its gift, then walk on.`, VIEW_W / 2, 140);

    // The road: three scroll-seals joined by a winding stroke.
    const nodes = ZONES.map((z, i) => ({ x: 236 + i * 340, y: 268 + (i % 2) * 36 }));
    c.strokeStyle = INK;
    c.lineWidth = 4;
    c.setLineDash([2, 10]);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(nodes[0].x, nodes[0].y);
    c.quadraticCurveTo(nodes[1].x - 120, nodes[1].y - 90, nodes[1].x, nodes[1].y);
    c.quadraticCurveTo(nodes[2].x - 120, nodes[2].y + 90, nodes[2].x, nodes[2].y);
    c.stroke();
    c.setLineDash([]);
    nodes.forEach((node, i) => {
      const done = i <= world.zoneIndex;
      const next = i === world.zoneIndex + 1;
      c.beginPath();
      c.arc(node.x, node.y, next ? 34 + Math.sin(G.time * 3) * 3 : 30, 0, Math.PI * 2);
      c.fillStyle = done ? VERMILLION : '#f4ecd9';
      c.fill();
      c.strokeStyle = INK;
      c.lineWidth = 2.4;
      c.stroke();
      c.fillStyle = done ? '#f4ecd9' : INK;
      c.font = `900 22px ${SERIF}`;
      c.fillText(['I', 'II', 'III'][i], node.x, node.y + 8);
      c.fillStyle = INK;
      c.font = `700 19px ${SERIF}`;
      c.fillText(ZONES[i].name, node.x, node.y + 62);
      c.font = `italic 13px ${SERIF}`;
      c.fillStyle = '#4a4238';
      c.fillText(done ? 'sealed' : next ? 'the road ahead' : 'beyond the mist', node.x, node.y + 84);
    });

    // The fork: two boon cards.
    c.fillStyle = INK;
    c.font = `700 20px ${SERIF}`;
    c.fillText('The road offers:', VIEW_W / 2, 428);
    G.boons.forEach((boonId, i) => {
      const boon = ROAD_BOONS.find((b) => b.id === boonId);
      const rect = UI.boonRect(i);
      const hover = inRect(input.mouse.x, input.mouse.y, rect);
      c.save();
      c.fillStyle = hover ? '#fff8e8' : 'rgba(244,236,217,0.88)';
      c.fillRect(rect.x, rect.y, rect.w, rect.h);
      c.strokeStyle = hover ? VERMILLION : INK;
      c.lineWidth = hover ? 3 : 2;
      c.strokeRect(rect.x, rect.y, rect.w, rect.h);
      c.fillStyle = INK;
      c.font = `700 22px ${SERIF}`;
      c.fillText(boon.name, rect.x + rect.w / 2, rect.y + 42);
      c.font = `15px ${SANS}`;
      c.fillStyle = '#4a4238';
      wrapText(c, boon.desc, rect.w - 48).forEach((line, li) => {
        c.fillText(line, rect.x + rect.w / 2, rect.y + 74 + li * 20);
      });
      c.restore();
    });
    c.font = `14px ${SANS}`;
    c.fillStyle = '#4a4238';
    c.fillText(`Score ${world.score} · ${world.beadsRun} beads gathered · Vigour ${Math.ceil(world.player.hp)}`, VIEW_W / 2, 640);
  }

  drawUpgrade(G) {
    const c = this.ctx;
    this.drawPlay(G);
    c.fillStyle = 'rgba(28,24,19,0.55)';
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    c.textAlign = 'center';
    c.fillStyle = '#f4ecd9';
    c.font = `900 38px ${SERIF}`;
    c.fillText('The wave rests', VIEW_W / 2, 130);
    c.font = `italic 17px ${SERIF}`;
    c.fillText('Choose one gift before the next pour. (Click, or press 1–3.)', VIEW_W / 2, 162);

    G.choices.forEach((choice, i) => {
      const rect = UI.cardRect(i);
      const hover = inRect(input.mouse.x, input.mouse.y, rect);
      const isRelic = choice.kind === 'relic';
      const def = choice.kind === 'upgrade'
        ? UPGRADES.find((u) => u.id === choice.id)
        : choice.kind === 'relic'
          ? RELICS.find((r) => r.id === choice.id)
          : { name: 'Cache of Beads', desc: 'A sleeveful of loose ink beads: +20, right now.' };
      c.save();
      c.fillStyle = hover ? '#fff8e8' : '#f4ecd9';
      c.fillRect(rect.x, rect.y, rect.w, rect.h);
      c.strokeStyle = isRelic ? GOLD : hover ? VERMILLION : INK;
      c.lineWidth = hover ? 3.4 : 2.2;
      c.strokeRect(rect.x, rect.y, rect.w, rect.h);
      if (isRelic) {
        c.strokeStyle = GOLD;
        c.lineWidth = 1.2;
        c.strokeRect(rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12);
      }
      const cx = rect.x + rect.w / 2;
      // Glyph: a stamp for relics, a brush for upgrades, a bead for the cache.
      if (isRelic) this.stamp(cx, rect.y + 62, 52, 'R');
      else if (choice.kind === 'beads') {
        c.fillStyle = INK;
        c.beginPath();
        c.arc(cx, rect.y + 62, 20, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#f4ecd9';
        c.beginPath();
        c.arc(cx - 6, rect.y + 55, 5, 0, Math.PI * 2);
        c.fill();
      } else {
        c.strokeStyle = '#7a5a34';
        c.lineWidth = 7;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(cx - 16, rect.y + 34);
        c.lineTo(cx + 10, rect.y + 78);
        c.stroke();
        c.fillStyle = INK;
        c.beginPath();
        c.ellipse(cx + 15, rect.y + 86, 6, 11, 0.7, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = VERMILLION;
      c.font = `700 12px ${SANS}`;
      const kindLabel = choice.kind === 'upgrade'
        ? `UPGRADE · RANK ${(G.world.upgradeLevels[choice.id] ?? 0) + 1}`
        : choice.kind === 'relic' ? 'RELIC · ONE OF A KIND' : 'TREASURE';
      c.fillText(kindLabel, cx, rect.y + 128);
      c.fillStyle = INK;
      c.font = `700 23px ${SERIF}`;
      wrapText(c, def.name, rect.w - 36).forEach((line, li) => {
        c.fillText(line, cx, rect.y + 162 + li * 27);
      });
      c.font = `15px ${SANS}`;
      c.fillStyle = '#4a4238';
      wrapText(c, def.desc, rect.w - 44).forEach((line, li) => {
        c.fillText(line, cx, rect.y + 226 + li * 21);
      });
      c.font = `700 15px ${SANS}`;
      c.fillStyle = '#4a4238';
      c.fillText(`— ${i + 1} —`, cx, rect.y + rect.h - 20);
      c.restore();
    });
  }

  drawEnd(G, victory) {
    const c = this.ctx;
    const world = G.world;
    const zone = world.zone;
    c.drawImage(this.paperFor(zone), 0, 0);
    this.frame(zone);
    c.textAlign = 'center';
    c.fillStyle = INK;
    if (victory) {
      c.font = `900 52px ${SERIF}`;
      c.fillText('THE INKSTONE IS SEALED', VIEW_W / 2, 150);
      const g = gradeFor(world.score);
      this.stamp(VIEW_W / 2, 268, 118, g.grade);
      c.font = `italic 19px ${SERIF}`;
      c.fillStyle = '#4a4238';
      c.fillText(g.note, VIEW_W / 2, 356);
    } else {
      c.font = `900 52px ${SERIF}`;
      c.fillText('THE PAPER TEARS', VIEW_W / 2, 150);
      c.font = `italic 19px ${SERIF}`;
      c.fillStyle = '#4a4238';
      c.fillText(`The spirits overrun ${zone.name}, wave ${world.waveIndex + 1}. The keeper will return — keepers always do.`, VIEW_W / 2, 196);
    }
    const stats = [
      ['Final score', `${world.score}`],
      ['Spirits burst', `${world.burstTotal}`],
      ['Loops closed', `${world.loopsClosed}`],
      ['Longest chain', `${world.maxChain}`],
      ['Best combo', `×${Math.min(8, 1 + Math.floor(world.bestCombo / 6))} (${world.bestCombo})`],
      ['Damage taken', `${world.damageTaken}`],
      ['Ink beads earned', `${world.beadsRun}`],
      ['Time on the scroll', `${Math.floor(world.time / 60)}:${String(Math.floor(world.time % 60)).padStart(2, '0')}`],
    ];
    c.font = `17px ${SANS}`;
    stats.forEach(([label, value], i) => {
      const colX = VIEW_W / 2 - 250 + (i % 2) * 500;
      const rowY = (victory ? 404 : 268) + Math.floor(i / 2) * 40;
      c.textAlign = 'right';
      c.fillStyle = '#4a4238';
      c.fillText(label, colX + 130, rowY);
      c.textAlign = 'left';
      c.fillStyle = INK;
      c.font = `700 17px ${SANS}`;
      c.fillText(value, colX + 142, rowY);
      c.font = `17px ${SANS}`;
    });
    this.button(UI.againBtn, victory ? 'A NEW RITE' : 'TRY AGAIN');
    this.button(UI.titleBtn, 'TITLE', { fill: '#4a4238' });
    if (victory && world.score >= (G.meta.bestScore ?? 0)) {
      c.font = `italic 15px ${SERIF}`;
      c.fillStyle = VERMILLION;
      c.fillText('A new best score for the sleeve.', VIEW_W / 2, 586);
    }
  }

  drawPause(G) {
    const c = this.ctx;
    c.fillStyle = 'rgba(28,24,19,0.5)';
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    c.textAlign = 'center';
    c.fillStyle = '#f4ecd9';
    c.font = `900 44px ${SERIF}`;
    c.fillText('The brush rests', VIEW_W / 2, 330);
    c.font = `17px ${SANS}`;
    c.fillText('P or Esc — resume · M — mute · Hold mouse and walk a loop to seal', VIEW_W / 2, 372);
  }

  draw(G) {
    const c = this.ctx;
    c.textBaseline = 'alphabetic';
    switch (G.screen) {
      case 'title':
        this.drawTitle(G);
        break;
      case 'workshop':
        this.drawWorkshop(G);
        break;
      case 'map':
        this.drawMap(G);
        break;
      case 'upgrade':
        this.drawUpgrade(G);
        break;
      case 'victory':
        this.drawEnd(G, true);
        break;
      case 'defeat':
        this.drawEnd(G, false);
        break;
      default:
        this.drawPlay(G);
        if (G.paused) this.drawPause(G);
    }
    // The scroll's outer edge, on every screen.
    c.strokeStyle = 'rgba(33,29,24,0.55)';
    c.lineWidth = 10;
    c.strokeRect(0, 0, VIEW_W, VIEW_H);
  }
}
