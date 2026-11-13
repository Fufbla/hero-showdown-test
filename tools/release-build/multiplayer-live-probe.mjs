// Focused compatibility probe using only the two newly created QA accounts.
import fs from 'node:fs';
if(process.env.ROYALE_RELEASE_LIVE_QA!=='1')throw Error('Explicit live QA opt-in required');
const fixture=JSON.parse(fs.readFileSync('/tmp/royale-release-cloud-qa.json','utf8'));
const endpoint='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-mp-test';
const report={at:new Date().toISOString(),endpoint,productionMultiplayerPassed:false,accounts:[],existingPlayerWrites:0};
for(const [i,a] of fixture.accounts.entries()){
 const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+a.access},body:JSON.stringify({action:'copy',slot:0}),signal:AbortSignal.timeout(20000)}),body=await r.json();
 if(r.ok){a.multiplayer=body;fs.writeFileSync('/tmp/royale-release-cloud-qa.json',JSON.stringify(fixture),{mode:0o600});}
 report.accounts.push({account:i+1,status:r.status,accepted:r.ok,error:body.error||null});
}
report.reason='Deployed multiplayer decoder accepts versions 1-8; the release uses version 9. Its separate test-copy persistence is not production V3 saving.';
fs.writeFileSync('docs/release-20261113/multiplayer-live-resume.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
