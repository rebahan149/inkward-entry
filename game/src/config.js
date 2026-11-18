// INKWARD's fixed numbers: the scroll's size, its palette, and the pools the
// run draws from — upgrades, relics, and the workshop's permanent unlocks.
// Level and wave data lives in levels.js; behaviour lives in world.js.

export const VIEW_W = 1152;
export const VIEW_H = 768;

/** The rice-paper field the keeper may walk, inside the scroll's frame. */
export const ARENA = { x: 30, y: 96, w: 1092, h: 630 };

export const INK = '#211d18';
export const INK_SOFT = '#4a4238';
export const PAPER = '#f4ecd9';
export const PAPER_DEEP = '#e9dcbf';
export const VERMILLION = '#bc3a1e';
export const VERMILLION_DEEP = '#8f2a14';
export const GOLD = '#b98a2e';
export const JADE = '#3f6f5a';

export const PLAYER_BASE = {
  hp: 100,
  ink: 100,
  speed: 238,
  radius: 15,
  inkRegen: 6.5,
  inkCostPerPx: 0.052,
  trailLife: 5.0,
  minLoopArea: 2300,
  chainRadius: 96,
  dashCooldown: 2.4,
  dashTime: 0.16,
  dashSpeed: 880,
};

/** Spirit kinds: score for a burst, touch damage, and how the pool names them. */
export const SPIRITS = {
  wisp: { score: 50, damage: 8, radius: 15, beads: 1 },
  dart: { score: 75, damage: 10, radius: 12, beads: 1 },
  wraith: { score: 115, damage: 12, radius: 16, beads: 2 },
  brute: { score: 160, damage: 18, radius: 27, beads: 3 },
  carp: { score: 500, damage: 16, radius: 46, beads: 12 },
  inkstone: { score: 1500, damage: 14, radius: 52, beads: 40 },
};

/** Run upgrades: chosen one-of-three after every wave. max = stack cap. */
export const UPGRADES = [
  { id: 'widebrush', name: 'Wide-Hair Brush', max: 3, desc: 'Your splashes reach further: chain-seal radius +22%.' },
  { id: 'deepwell', name: 'Deep Inkwell', max: 3, desc: '+30 maximum ink, and ink to fill it.' },
  { id: 'swiftink', name: 'Swift-Ground Sumi', max: 3, desc: 'Ink flows back 40% faster.' },
  { id: 'longtrail', name: 'Patient Stroke', max: 2, desc: 'Your brush trail lingers 1.6s longer before it dries.' },
  { id: 'sandals', name: 'River Sandals', max: 3, desc: 'Move 11% faster across the paper.' },
  { id: 'phantomstep', name: 'Phantom Step', max: 2, desc: 'Dash recharges 30% sooner and carries you further.' },
  { id: 'echoseal', name: 'Echo Seal', max: 2, desc: 'Bursts splash harder: a bursting spirit seals neighbours over a wider ring.' },
  { id: 'heavysumi', name: 'Heavy Sumi Cake', max: 2, desc: 'Your bursts strike brutes twice — one seal cracks them open.' },
  { id: 'secondheart', name: 'Second Heart', max: 2, desc: '+25 maximum health, and mend 25 now.' },
  { id: 'mendingwash', name: 'Mending Wash', max: 3, desc: 'Rinse your wounds: restore 35 health now.' },
  { id: 'greedybrush', name: 'Gilded Bristles', max: 2, desc: 'Bursts shake loose 30% more ink beads.' },
  { id: 'bigloops', name: 'Calligrapher’s Eye', max: 2, desc: 'Grand loops pay: score grows with the area your ring encloses.' },
  { id: 'quickseal', name: 'Fast-Drying Ink', max: 2, desc: 'Sealed spirits burst 30% sooner — chains snap like firecrackers.' },
  { id: 'thornink', name: 'Thorn Ink', max: 2, desc: 'Spirits that cross your wet trail are slowed, dragging through the ink.' },
];

/** Relics: rarer one-of-a-kind finds, offered in the same pick and at bosses. */
export const RELICS = [
  { id: 'carpscale', name: 'Carp Scale', desc: 'Dashing lays a short brush stroke that can close a loop.' },
  { id: 'crackedbead', name: 'Cracked Bead', desc: 'When you are hurt, the bead shatters the air: nearby spirits are sealed.' },
  { id: 'hanko', name: 'Vermillion Hanko', desc: 'Every fifth loop you close is stamped — its seals score double.' },
  { id: 'bambooflask', name: 'Bamboo Flask', desc: 'Your ink refills to full at the start of every wave.' },
  { id: 'mirrorcharm', name: 'Mirror Charm', desc: 'Once per scroll, death is refused: you mend to half health instead.' },
  { id: 'thunderbristles', name: 'Thunder Bristles', desc: 'Every few seconds a stray spirit is struck and sealed by storm-ink.' },
  { id: 'oldcoin', name: 'Pilgrim’s Old Coin', desc: 'Each wave you clear leaves 3 extra ink beads in your sleeve.' },
  { id: 'papercrane', name: 'Paper Crane', desc: 'Move 8% faster; your trail dries 25% slower.' },
  { id: 'inkmoon', name: 'Ink Moon', desc: 'Your combo holds 1.2 seconds longer before it fades.' },
  { id: 'dragonwhisker', name: 'Dragon Whisker', desc: 'Drawing costs 20% less ink — the brush nearly floats.' },
];

/**
 * Named synergies, checked where their halves meet (world.js) and listed in
 * the README: Wide-Hair Brush + Echo Seal widens chains a second time;
 * Vermillion Hanko + Calligrapher’s Eye makes stamped grand loops refund
 * ink; Thorn Ink + Fast-Drying Ink slows spirits inside your rings too.
 */
export const WORKSHOP = [
  { id: 'sturdypaper', name: 'Sturdier Paper', max: 3, costs: [30, 55, 90], desc: '+10 maximum health on every run, per rank.' },
  { id: 'deepstone', name: 'Deeper Inkstone', max: 3, costs: [30, 55, 90], desc: '+10 maximum ink on every run, per rank.' },
  { id: 'wornsandals', name: 'Well-Worn Sandals', max: 3, costs: [25, 50, 85], desc: '+4% movement speed on every run, per rank.' },
  { id: 'gildedhanko', name: 'Gilded Hanko', max: 3, costs: [35, 65, 100], desc: '+6% score on every run, per rank.' },
  { id: 'secondbreath', name: 'Second Breath', max: 3, costs: [25, 50, 85], desc: 'Dash recharges 7% sooner, per rank.' },
  { id: 'blessedbrush', name: 'Blessed Brush', max: 1, costs: [150], desc: 'Begin every run with a blessing: one free upgrade, chosen by fate.' },
];

/** Victory grades by final score. */
export const GRADES = [
  { grade: 'S', min: 24000, note: 'The scroll sings your name.' },
  { grade: 'A', min: 18000, note: 'A master’s hand, steady and sure.' },
  { grade: 'B', min: 12000, note: 'The inkstone is sealed, the grove at peace.' },
  { grade: 'C', min: 7000, note: 'Sealed — though the paper is torn in places.' },
  { grade: 'D', min: 0, note: 'Sealed, barely. The spirits will gossip.' },
];

export function gradeFor(score) {
  for (const g of GRADES) if (score >= g.min) return g;
  return GRADES[GRADES.length - 1];
}
