// Batch 1 is layered onto the approved Style C commit. The older stage gates
// import this same narrow list instead of accepting arbitrary Royale changes.
const changed = new Set([
  'power-armor.mjs','fireball-armor-art.mjs','equipment.mjs','eris.mjs','eris-ui.mjs',
  'index.html','item-art.mjs','journey.mjs','powers.mjs','power-menu.mjs',
  'style-c-equipment.mjs','style-c-materials.mjs','backend/validation.mjs',
  'tests/world-ui-preservation.mjs','tests/style-c.test.mjs','tests/power-armor-preservation.mjs',
  'tests/fireball-armor.test.mjs','tests/fireball-review.html','tests/fireball-review.mjs',
  'tests/fireball-economy.mjs','FIREBALL-ARMOR.md',
  'roots-armor.mjs','tests/roots-armor.test.mjs','GROUND-ROOTS-ARMOR.md',
  'steel-armor.mjs','power-armor-art.mjs','tests/steel-armor.test.mjs','STEEL-ARMOR.md',
].map(name=>'royale/'+name));
export const isFireballFile = path => changed.has(path) ||
  /^royale\/assets\/power-armor\/roots\/(regions\.mjs|(seed|reed|briar|oak|lattice|mangrove|canopy|heartwood|worldroot)\.webp)$/.test(path) ||
  /^royale\/assets\/power-armor\/steel\/(regions\.mjs|(rivet|breakwater|rail|aegis|boreal|tortoise|lock|citadel|polaris)\.webp)$/.test(path) ||
  /^royale\/assets\/power-armor\/fireball\/(regions\.mjs|(ember|kiln|forge|flare|phoenix|caldera|furnace|corona|supernova)\.webp)$/.test(path);
