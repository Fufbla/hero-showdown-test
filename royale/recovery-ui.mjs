import {inspectLocalHeroes,exportLocalRecovery} from './save-recovery.mjs';

export function installSaveRecovery(storage,root=document){
 const open=root.getElementById('recover-local'),dialog=root.getElementById('local-recovery');
 const results=root.getElementById('recovery-results'),status=root.getElementById('recovery-status');
 open.onclick=()=>{
  const report=inspectLocalHeroes(storage);results.replaceChildren();
  for(const hero of report.heroes){
   const row=root.createElement('p');
   row.textContent=`${hero.snapshot.look.name} · Level ${hero.snapshot.level} · ${hero.snapshot.coins} coins · ${hero.key} · slot ${hero.slot+1}`;
   results.append(row);
  }
  for(const issue of report.issues){const row=root.createElement('p');row.textContent=`${issue.key}: ${issue.reason}`;results.append(row);}
  status.textContent=report.heroes.length?'Readable hero copies found. Nothing has been restored, imported or overwritten.':'No readable hero was found in this browser’s known save locations. This does not check other devices or websites.';
  dialog.showModal();root.getElementById('cancel-recovery').focus();
 };
 root.getElementById('cancel-recovery').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>open.focus());
 root.getElementById('download-recovery').onclick=()=>{
  const url=URL.createObjectURL(new Blob([exportLocalRecovery(storage)],{type:'application/json'}));
  const link=root.createElement('a');link.href=url;link.download='hero-showdown-royale-local-backup.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  status.textContent='Backup download requested. Keep it private: it contains your heroes and progress. Browser storage was not changed.';
 };
}
