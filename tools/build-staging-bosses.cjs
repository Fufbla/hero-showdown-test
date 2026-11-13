// Approved boss test only. Keep normal staging accounts and shared Royale intact.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),version='boss-test-1';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
function replace(s,a,b){if(!s.includes(a))throw Error('Boss adapter source changed: '+a.slice(0,90));return s.replace(a,b);}
let app=read('royale-v3-staging/kingjames/app.mjs');
// Called at the end of the full staging build, so this input is regenerated first.
if(!app.includes('// Boss test integration.')){
 app="// Boss test integration.\nimport {practiceRequest,makePracticeGame} from '../bosses/practice.mjs?v="+version+"';\n"+app;
 app=replace(app,"const codePlay=['1','v3']", "const bossPractice=practiceRequest(params,v2TestHero);\nconst codePlay=['1','v3']");
 app=replace(app,'const storagePrefix = testPrefix || (','const storagePrefix = testPrefix || (bossPractice?`royale-boss-practice-0000000000:${bossPractice.id}:`:null) || (');
 app=app.replaceAll('testPrefix||practiceHero?sessionStorage:localStorage','testPrefix||practiceHero||bossPractice?sessionStorage:localStorage');
 app=replace(app,'try{ledger=await LegendaryLedger.open','if(!bossPractice)try{ledger=await LegendaryLedger.open');
 app=replace(app,'function persist({manual=false}={}){','function persist({manual=false}={}){\n  if(bossPractice)return {ok:true,practice:true};');
 app=replace(app,'function persistSnapshot(snapshot,requireDurable=false){','function persistSnapshot(snapshot,requireDurable=false){\n  if(bossPractice)return {ok:true,practice:true};');
 app=replace(app,'function startCritical(expectedRevision,snapshot){','function startCritical(expectedRevision,snapshot){\n  if(bossPractice)return;');
 app=replace(app,"$('safe-save-note').textContent=game.canSave()?","$('manual-save').disabled=bossPractice||!game.canSave();$('safe-save-note').textContent=bossPractice?'Boss Test is temporary. Use Boss Test → Return to My Hero to resume your saved adventure.':game.canSave()?");
 app=replace(app,"$('manual-save').onclick=async()=>{","$('manual-save').onclick=async()=>{if(bossPractice){say('Practice progress is temporary. Return to My Hero to resume your saved adventure.',6);return;}");
 app=replace(app,"if(event.type==='legendary-clear-ready'&&!online())", "if(bossPractice&&event.type==='legendary-clear-ready'){game.pendingLegendaryVictory=null;game.bossEncounter=null;game.arenaScene.cleared=true;game.legendaryHazards=[];game.clearEnemyShots();game.paused=false;say('Boss Test complete! Pause → Boss Test to choose another fight.',8);continue;}\n    if(event.type==='legendary-clear-ready'&&!online())");
 const code=`
if(v2TestHero){
 const button=document.createElement('button');button.id='boss-test-open';button.type='button';button.className='secondary';button.textContent='Boss Test · Choose Opponent';button.onclick=()=>parent.postMessage({type:'royale-boss-test-open'},location.origin);$('pause-primary').prepend(button);
}
if(bossPractice){
 let saved;
 try{const data=JSON.parse(localStorage.getItem(V2_TEST_STORAGE_PREFIX+PROFILE_KEY));saved=data?.slots?.find(s=>s?.snapshot?.look?.name?.toLowerCase()==='kingjames')?.snapshot;}catch{}
 const fallback=JSON.parse(new Game({look:kingJamesLook(styleCDefault('male')),testPowers:true}).save());
 game=makePracticeGame(Game,saved||fallback,bossPractice);kingJamesSlot=activeSlot;startPatrol(true);handleEvents();
 const label=document.querySelector('.phase-label');if(label)label.textContent='BOSS TEST · PRACTICE';
 say('Boss Test · Level 99 practice hero · Pause → Boss Test to switch or return.',9);
}
`;
 app=replace(app,'void prepareStyleCMaterials().then(ready=>{',code+'\nvoid prepareStyleCMaterials().then(ready=>{');
 // A read-only diagnostic supports live QA without exposing account data.
 app=replace(app,"simulationTime:String(game.time),artReady:","boss:JSON.stringify(game.arenaScene?{state:game.arenaScene.boss.state,phase:game.arenaScene.boss.phase,...renderer.bossArt.inspect(game.arenaScene.boss)}:null),simulationTime:String(game.time),artReady:");
 app=replace(app,"window.kingJamesQA=Object.freeze({status:()=>({screen,", "window.kingJamesQA=Object.freeze({status:()=>({boss:game.arenaScene?{id:game.arenaScene.legendary||game.regionId,phase:game.arenaScene.boss.phase,state:game.arenaScene.boss.state,attack:game.arenaScene.boss.attack?.kind,art:renderer.bossArt.inspect(game.arenaScene.boss)}:null,practice:!!bossPractice,screen,");
 write('royale-v3-staging/kingjames/app.mjs',app);
}
let html=read('royale-v3-staging/kingjames/index.html');
html=html.replace(/<script type="importmap">([\s\S]*?)<\/script>/,(_,raw)=>{
 const m=JSON.parse(raw),base=new URL('https://game.test/royale/');
 for(const [source,file]of Object.entries({'boss-art.mjs':'art.mjs','boss-effects.mjs':'effects.mjs','legendary-art.mjs':'legendary-art.mjs'})){
  const target='../royale-v3-staging/bosses/'+file+'?v='+version;
  for(const [key,value]of Object.entries(m.imports))if(new URL(key,base).pathname==='/royale/'+source){m.imports[key]=target;if(new URL(value,base).pathname==='/royale/'+source)m.imports[value]=target;}
  m.imports['./'+source]=target;
 }
 for(const [key,value]of Object.entries(m.imports))if(new URL(value,base).pathname==='/royale-v3-staging/kingjames/app.mjs')m.imports[key]=value.replace(/\?v=[^&]+/,'?v='+version);
 return '<script type="importmap">'+JSON.stringify(m)+'</script>';
});
html=html.replace(/kingjames\/entry.mjs\?v=[^"&]+/g,'kingjames/entry.mjs?v='+version);write('royale-v3-staging/kingjames/index.html',html);
let entry=read('royale-v3-staging/kingjames/entry.mjs').replace(/app.mjs\?v=[^']+/g,'app.mjs?v='+version);write('royale-v3-staging/kingjames/entry.mjs',entry);
let parent=read('royale-v3-staging/index.html');
if(!parent.includes('bosses/launcher.mjs'))parent=parent.replace('</body>','<script type="module" src="./bosses/launcher.mjs?v='+version+'"></script></body>');
parent=parent.replaceAll('./app.mjs?v=armor-stats-1','./app.mjs?v='+version);write('royale-v3-staging/index.html',parent);
let parentApp=read('royale-v3-staging/app.mjs');
parentApp=parentApp.replace("+'&v=armor-stats-1'+qa","+'&v="+version+"'+qa");write('royale-v3-staging/app.mjs',parentApp);
console.log('Built all-boss test presentation and isolated practice selector for 0000000000.');
