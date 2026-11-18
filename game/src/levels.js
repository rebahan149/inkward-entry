// The three scrolls of INKWARD and what leaks onto each. A wave is a recipe:
// how many of each spirit kind to pour in, and — on a scroll's last wave —
// which boss rises. Eight waves a scroll, three scrolls a run; the road
// between scrolls offers a boon (see ROAD_BOONS below).

/**
 * Wave recipes per scroll. w = wisps, d = darts, r = wraiths, b = brutes.
 * `boss` names the boss that replaces the pour on that wave.
 */
export const ZONES = [
  {
    id: 'bamboo',
    name: 'Bamboo Hollow',
    epithet: 'Scroll I — where the rain learned to whisper',
    paper: '#f4ecd9',
    wash: '#dfe4c8',
    accent: '#3f6f5a',
    motif: 'bamboo',
    waves: [
      { w: 3 },
      { w: 4, d: 1 },
      { w: 5, d: 2 },
      { w: 5, d: 3, r: 1 },
      { w: 6, d: 3, b: 1 },
      { w: 7, d: 4, r: 2 },
      { w: 8, d: 4, b: 1 },
      { w: 7, d: 4, r: 2, b: 1 },
    ],
  },
  {
    id: 'lake',
    name: 'Frozen Mirror Lake',
    epithet: 'Scroll II — the ice remembers every footprint',
    paper: '#eef0e9',
    wash: '#cfdde6',
    accent: '#3c5a78',
    motif: 'lake',
    waves: [
      { w: 5, d: 3, r: 1 },
      { w: 6, d: 4, r: 2 },
      { w: 6, d: 5, b: 1 },
      { w: 7, d: 5, r: 3 },
      { w: 8, d: 5, b: 2 },
      { w: 8, d: 6, r: 3, b: 1 },
      { w: 9, d: 6, r: 3, b: 2 },
      { boss: 'carp', w: 2 },
    ],
  },
  {
    id: 'shrine',
    name: 'Ember Vermillion Shrine',
    epithet: 'Scroll III — the inkstone’s heart, still warm',
    paper: '#f6ead6',
    wash: '#eecfae',
    accent: '#bc3a1e',
    motif: 'shrine',
    waves: [
      { w: 7, d: 5, r: 2, b: 1 },
      { w: 8, d: 6, r: 3, b: 1 },
      { w: 8, d: 7, r: 3, b: 2 },
      { w: 9, d: 7, r: 4, b: 2 },
      { w: 10, d: 8, r: 4, b: 2 },
      { w: 10, d: 8, r: 5, b: 3 },
      { w: 11, d: 9, r: 5, b: 3 },
      { boss: 'inkstone' },
    ],
  },
];

/** The branching road between scrolls: two of these are offered, pick one. */
export const ROAD_BOONS = [
  { id: 'rest', name: 'Pilgrim’s Rest', desc: 'Breathe. Mend 40 health before the next scroll.' },
  { id: 'shrine', name: 'Roadside Shrine', desc: 'Leave a stroke, take a gift: +25 ink beads.' },
  { id: 'spring', name: 'Ink Spring', desc: 'Dip the brush deep: +25 maximum ink for the rest of the run.' },
  { id: 'whetstone', name: 'Whetstone Shrine', desc: 'Sharper splashes: chain-seal radius +15 for the run.' },
];

export const BOSS_NAMES = {
  carp: 'The Great Ink Carp',
  inkstone: 'The Cracked Inkstone',
};
