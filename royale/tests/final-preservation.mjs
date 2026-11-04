import {CLEANUP_FILES} from './cleanup-preservation.mjs';
// Scope of the final test-build work. Artwork and simulation have no exceptions.
export const FINAL_BASE='3fdaee3eeba50a703f6a850b1871facd1de7896e';
export const FINAL_FILES=new Set([
 'app.mjs','index.html','landscape.css','renderer.mjs','package.json','package-lock.json',
 'tools/build-playtest.mjs','FINAL-PLAYTEST.md',
 'tests/final-preservation.mjs','tests/final-integration.test.mjs',
 'tests/final-mobile.html','tests/final-mobile.mjs',
 'tests/phase5-checks.mjs','tests/polish-preservation.mjs',
 'tests/browser-checks.mjs','tests/phase3-checks.mjs',
 'tests/landscape-layout.test.mjs',
 'qa/final-mobile/landscape-patrol.jpg',
].map(p=>'royale/'+p));

for(const path of CLEANUP_FILES)FINAL_FILES.add(path);

// Authorized isolated multiplayer addition; original solo/art invariants remain exact.
for (const path of [
  "royale/multiplayer/.gitignore",
  "royale/multiplayer/DEPLOYMENT.md",
  "royale/multiplayer/README.md",
  "royale/multiplayer/VALIDATION.md",
  "royale/multiplayer/authority.mjs",
  "royale/multiplayer/client.mjs",
  "royale/multiplayer/delta.mjs",
  "royale/multiplayer/inspect-host.mjs",
  "royale/multiplayer/load.mjs",
  "royale/multiplayer/package-lock.json",
  "royale/multiplayer/package.json",
  "royale/multiplayer/protocol.mjs",
  "royale/multiplayer/qa/local-load.json",
  "royale/multiplayer/runtime.mjs",
  "royale/multiplayer/server.mjs",
  "royale/multiplayer/store.mjs",
  "royale/multiplayer/tests/authority.test.mjs",
  "royale/multiplayer/tests/combat.test.mjs",
  "royale/multiplayer/tests/network.test.mjs",
  "royale/multiplayer/tests/powers.test.mjs",
  "royale/multiplayer/tests/review-server.mjs",
  "royale/multiplayer/tests/review.html",
  "royale/multiplayer/tests/review.mjs",
  "royale/multiplayer/tests/safety.test.mjs",
  "royale/multiplayer/tests/socket-helper.mjs"
]) FINAL_FILES.add(path);

// Actual-game integration scope; original engine, artwork and save formats stay protected.
for(const path of ['royale/eris-ui.mjs', 'royale/journey-menu.mjs', 'royale/legendary-ui.mjs', 'royale/power-menu.mjs', 'royale/power-upgrades.mjs', 'royale/backend/supabase/migrations/20261104161434_royale_multiplayer_fence.sql', 'royale/multiplayer/game-session.mjs', 'royale/multiplayer/menu.mjs', 'royale/multiplayer/menu.css', 'royale/multiplayer/migration.mjs', 'royale/multiplayer/tests/migration-fixture.mjs', 'royale/multiplayer/tests/migration.test.mjs', 'royale/multiplayer/tests/integration.test.mjs'])FINAL_FILES.add(path);

// Deployment templates, controlled load evidence and browser screenshots.
for(const path of ['.env.example','load-controlled.mjs','deploy/client-config.example.json','deploy/nginx.conf.example','deploy/royale.service','deploy/OPERATIONS.md','qa/controlled-load.json','qa/controlled-load-repeat.json','tests/load-server.mjs','tests/mobile.html','qa/browser/two-heroes-landscape.jpg','qa/browser/room-controls.jpg'])FINAL_FILES.add('royale/multiplayer/'+path);

// Authorized static solo release configuration, packaging and regression coverage.
for(const path of ['royale/release-config.mjs', 'royale/multiplayer-gate.mjs', 'royale/tools/build-solo.mjs', 'royale/tests/solo-release.test.mjs', 'royale/SOLO-DEPLOYMENT.md'])FINAL_FILES.add(path);
