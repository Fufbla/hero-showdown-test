import {FINAL_FILES} from './final-preservation.mjs';
export const POLISH_BASE='2bdfa1d9244e490f702894eae15267f314aafad2';
export const POLISH_FILES=new Set(['legendary-ui.mjs','boss-effects.mjs','boss-ui.mjs','legendary-art.mjs','renderer.mjs','journey.mjs','reward-chest.mjs','style-c-hair.mjs','style-c-source.mjs','landscape.css','landscape-layout.mjs','app.mjs','index.html','menu-landscape.css','POLISH-REVIEW.md','assets/reward-chests.webp','assets/reward-chests.png','tests/polish-preservation.mjs','tests/polish.test.mjs','tests/polish-review.html','tests/polish-review.mjs','tests/polish-render.mjs','tests/landscape-layout.test.mjs','tests/armor-integration.test.mjs','tests/creature-integration-preservation.mjs','tests/power-armor-preservation.mjs','tests/hero-preservation.mjs','tests/world-ui-preservation.mjs'].map(p=>'royale/'+p));

// Exact final-build scope; final-integration.test.mjs also compares all files to FINAL_BASE.
for(const path of FINAL_FILES)POLISH_FILES.add(path);
