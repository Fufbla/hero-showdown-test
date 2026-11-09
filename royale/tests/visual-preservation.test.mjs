import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
const base='0b94a1fbba6ef015146f8f422cec32a63b88377f';
test('visual update preserves all source artwork, account/save/combat/inventory and multiplayer runtime files against its actual starting release',()=>{
 const paths=['royale/assets','royale/core.mjs','royale/world.mjs','royale/equipment.mjs','royale/appearance.mjs','royale/style-c-face.mjs','royale/style-c-hair.mjs','royale/saves.mjs','royale/powers.mjs','royale/combat-tuning.mjs','royale/world-loot.mjs','royale/journey.mjs','royale/local-coop/app.mjs','royale/local-coop/cloud.mjs','royale/local-coop/session.mjs','royale/local-coop/input.mjs','royale-v3-staging/app.mjs','royale-v3-staging/cloud.mjs','supabase','royale/online'];
 assert.equal(execFileSync('git',['diff','--name-only',base,'--',...paths],{encoding:'utf8'}).trim(),'');
});
