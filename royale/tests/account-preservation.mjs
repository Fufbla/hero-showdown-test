import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
export const ACCOUNT_FILES=new Set(['account-callback.html','account-callback.css','account-callback.mjs','auth-callback-state.mjs','tests/auth-callback.test.mjs','cloud-client.mjs','saves.mjs','save-recovery.mjs','recovery-ui.mjs','tests/account-recovery.test.mjs','tests/account-preservation.mjs','ACCOUNT-IMPLEMENTATION.md','backend/index.ts','tests/account-staging.mjs','tests/hero-preservation.mjs','tests/polish.test.mjs'].map(p=>'royale/'+p));
for(const path of ['app.mjs', 'player-accounts-config.mjs', 'player-account-client.mjs', 'player-account-ui.mjs', 'player-accounts.css', 'cloud-autosave.mjs', 'player-save-migration.mjs', 'backend/recovery.mjs', 'backend/supabase/migrations/20261105133227_royale_account_recovery.sql', 'tests/player-account-security.test.mjs', 'tests/player-cloud.test.mjs', 'tests/recovery-request-staging.mjs', 'tests/player-accounts-browser.html', 'tests/player-accounts-browser.mjs', 'tests/player-accounts-staging.mjs'])ACCOUNT_FILES.add('royale/'+path);
ACCOUNT_FILES.add('royale/tests/player-cloud-database.test.mjs');
ACCOUNT_FILES.add('royale/tests/player-accounts-e2e.mjs');
ACCOUNT_FILES.add('royale/tests/player-cloud-staging.mjs');
ACCOUNT_FILES.add('royale/tests/player-recovery-staging.mjs');
ACCOUNT_FILES.add('royale/backend/supabase/migrations/20261105180000_royale_numeric_recovery.sql');
ACCOUNT_FILES.add('royale/qa/accounts/royale-account-landscape.png');
ACCOUNT_FILES.add('royale/multiplayer/tests/safety.test.mjs');
export function assertAccountSafetyScope(){
 const original=name=>execFileSync('git',['show','594a4b8f6281d7f004268e7b4f72a1fe1ab13912:royale/'+name],{cwd:new URL('../../',import.meta.url),encoding:'utf8'});
 let saves=readFileSync(new URL('../saves.mjs',import.meta.url),'utf8');
 saves=saves.replace("export const BACKUP_KEY='healthia.royale.profiles.backup.v2';\n",'').replace('      // Retain the last valid envelope before replacing it. Never back up a\n      // damaged envelope over a usable recovery copy. Failure aborts the write.\n      if(current!==null&&parseProfiles(current))this.storage.setItem(BACKUP_KEY,current);\n','');
 assert.equal(saves,original('saves.mjs'),'Only the previous-valid-envelope backup may change local saving');
 const omitRefresh=s=>s.replace(/ async refresh\(\)\{[\s\S]*?\n apply\(row\)/,'\n apply(row)');
 assert.equal(omitRefresh(readFileSync(new URL('../cloud-client.mjs',import.meta.url),'utf8')),omitRefresh(original('cloud-client.mjs')),'Only atomic roster refresh may change cloud client behavior');
}
