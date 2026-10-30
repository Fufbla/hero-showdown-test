// Coastal Beginnings is deliberately independent of Story/Versus world state.
export const WORLD_WIDTH = 6160;
export const DEATH_Y = 890;
export const REGIONS = [
  { x: 0, name: 'Sunwash Strand', note: 'A small beginning. A bigger adventure.' },
  { x: 1940, name: 'Driftwood Rise', note: 'Take the high road, or follow the shore.' },
  { x: 4020, name: 'Lighthouse Point', note: 'Every hero starts somewhere.' },
];
export const SURFACES = [
  { id: 'sand-a', x: 0, y: 600, w: 1390, h: 320, kind: 'sand' },
  { id: 'sand-b', x: 1540, y: 600, w: 1170, h: 320, kind: 'sand' },
  { id: 'sand-c', x: 2860, y: 600, w: 1260, h: 320, kind: 'sand' },
  { id: 'sand-d', x: 4270, y: 600, w: 1890, h: 320, kind: 'sand' },
  // Low, connected tide-pool routes make missed jumps forgiving.
  { id: 'pool-a', x: 1380, y: 664, w: 170, h: 256, kind: 'rock' },
  { id: 'pool-b', x: 2700, y: 664, w: 170, h: 256, kind: 'rock' },
  { id: 'pool-c', x: 4110, y: 664, w: 170, h: 256, kind: 'rock' },
  { id: 'p1', x: 420, y: 480, w: 230, h: 28, kind: 'grass', oneWay: true },
  { id: 'p2', x: 740, y: 370, w: 250, h: 28, kind: 'grass', oneWay: true },
  { id: 'p3', x: 1080, y: 455, w: 220, h: 24, kind: 'wood', oneWay: true },
  { id: 'p4', x: 1580, y: 470, w: 230, h: 28, kind: 'grass', oneWay: true },
  { id: 'p5', x: 1890, y: 355, w: 260, h: 26, kind: 'wood', oneWay: true },
  { id: 'p6', x: 2250, y: 265, w: 330, h: 30, kind: 'grass', oneWay: true },
  { id: 'p7', x: 2600, y: 445, w: 290, h: 24, kind: 'wood', oneWay: true },
  { id: 'p8', x: 3030, y: 480, w: 230, h: 28, kind: 'grass', oneWay: true },
  { id: 'p9', x: 3340, y: 355, w: 260, h: 28, kind: 'grass', oneWay: true },
  { id: 'p10', x: 3690, y: 445, w: 260, h: 24, kind: 'wood', oneWay: true },
  { id: 'p11', x: 4380, y: 480, w: 240, h: 28, kind: 'grass', oneWay: true },
  { id: 'p12', x: 4720, y: 365, w: 300, h: 26, kind: 'wood', oneWay: true },
  { id: 'p13', x: 5120, y: 470, w: 240, h: 28, kind: 'grass', oneWay: true },
];
export const CAMPS = [{ x: 160, y: 600, name: 'Shore camp' }, { x: 2340, y: 600, name: 'Driftwood camp' }, { x: 4370, y: 600, name: 'Lighthouse camp' }];
export const TYPES = {
  bottle: { name: 'Bottle Critter', hp: 34, damage: 5, speed: 43, xp: 14, coins: 3, w: 34, h: 49, color: '#65d9c6' },
  slime: { name: 'Trash Slime', hp: 48, damage: 6, speed: 32, xp: 20, coins: 5, w: 53, h: 36, color: '#b1ce67' },
  crawler: { name: 'Sand Crawler', hp: 60, damage: 7, speed: 54, xp: 26, coins: 7, w: 49, h: 32, color: '#efaa66' },
};
export const SPAWNS = [
  ['bottle', 600, 'sand-a'], ['bottle', 940, 'sand-a'], ['slime', 1230, 'sand-a'],
  ['bottle', 850, 'p2'], ['slime', 1700, 'sand-b'], ['crawler', 2010, 'sand-b'],
  ['bottle', 2460, 'sand-b'], ['slime', 2430, 'p6'], ['crawler', 3100, 'sand-c'],
  ['slime', 3500, 'sand-c'], ['bottle', 3890, 'sand-c'], ['bottle', 3470, 'p9'],
  ['crawler', 4620, 'sand-d'], ['slime', 4990, 'sand-d'], ['bottle', 5350, 'sand-d'],
  ['crawler', 5570, 'sand-d'], ['bottle', 4880, 'p12'],
];
export const regionAt = x => [...REGIONS].reverse().find(r => x >= r.x) || REGIONS[0];
