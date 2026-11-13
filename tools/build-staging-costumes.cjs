// Add the approved ten-costume collection only to V3 staging's module graph.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const imports=(s,prefix)=>s.replace(/((?:from\s*|import\s*\()\s*['"])\.\//g,'$1'+prefix);
function replace(s,a,b){if(!s.includes(a))throw Error('Costume adapter baseline changed: '+a.slice(0,100));return s.replace(a,b);}
const rows=[['dolphin-costume','Dolphin Costume'],['pink-shark-costume','Pink Shark Costume'],['hamburger-costume','Hamburger Costume'],['stuffed-animal-costume','Stuffed Animal Costume'],['zombie-costume','Zombie Costume'],['reaper-costume','Reaper Costume'],['fishsticks-costume','I Love Fishsticks Costume'],['pizza-slice-costume','Pizza Slice Costume'],['black-business-suit','Black Business Suit'],['white-business-suit','White Business Suit']];
let policy=read('royale/cosmetics/outfit-policy.mjs');
policy=replace(policy,'const historicalRows=[','const historicalRows=[\n'+rows.map(([id,name])=>' '+JSON.stringify([id,name,[['fullbody',700]]])+',').join('\n'));
policy=policy.replace('matching-outfits-no-headwear-v1','matching-outfits-face-only-v2');
write('royale-v3-staging/cloud/cosmetics/outfit-policy.mjs',policy);
write('royale-v3-staging/costumes/outfit-policy.mjs',policy);
let runtime=imports(read('royale/cosmetics/runtime.mjs'),'../../royale/cosmetics/');
runtime="import {COSTUMES,costumeById,costumeForState} from './catalog.mjs';\nimport {costumeSprites} from './engine.mjs';\n"+runtime;
runtime=replace(runtime,'new URL(path,import.meta.url)',"new URL(path,new URL('../../royale/cosmetics/',import.meta.url))");
runtime=replace(runtime,'.then(data=>({data,index:catalogIndex(data)}))',".then(data=>{data={...data,sets:[...data.sets,...COSTUMES]};return {data,index:catalogIndex(data)};})");
runtime=replace(runtime,' async loadIds(ids,{review=false,retry=false}={}){',` async loadIds(ids,{review=false,retry=false}={}){
  const costume=ids.length===1&&COSTUMES.find(o=>o.pieces[0].id===ids[0]);
  if(costume){if(!await costumeSprites.preload(costume.id))throw Error(costumeSprites.error);this.notify();return [{id:costume.pieces[0].id,category:'fullbody',costumeId:costume.id}];}`);
runtime=replace(runtime,' layers(state){',` layers(state){
  const costume=costumeForState(state);
  if(costume){if(!costumeSprites.outfits.has(costume.id))void costumeSprites.preload(costume.id).then(ok=>{if(ok)this.notify();});return [{id:costume.pieces[0].id,category:'fullbody',costumeId:costume.id}];}`);
write('royale-v3-staging/costumes/runtime.mjs',runtime);
let catalog=imports(read('royale/clothing-catalog-preview.mjs'),'../../royale/');
const begin=catalog.indexOf("  const response=await fetch(new URL('./cosmetics/catalog.json'"),end=catalog.indexOf('  sets=data.sets;',begin);
if(begin<0||end<0)throw Error('Catalog fetch boundary missing');
catalog=catalog.slice(0,begin)+"  const {data}=await clothingRuntime.catalog();\n"+catalog.slice(end);
catalog=catalog.replaceAll('Complete outfit · front view','Complete outfit · gameplay view');
write('royale-v3-staging/costumes/store.mjs',catalog);
let tryon=imports(read('royale/clothing-tryon.mjs'),'../../royale/');
tryon=replace(tryon,"if(!pose?.arms?.length||!pose?.legs?.length)","if(!pose?.arms?.length||!pose?.legs?.length&&pose?.artSource!=='full-body-costume')");
tryon=replace(tryon,"['run','Running']","['run','Running'],['jump','Jump'],['doubleJump','Double jump'],['punch','Punch'],['kick','Kick'],['strength','Super Strength'],['superKick','Super Kick'],['fireball','Fireball'],['flight','Flight'],['steel','Steel Body']");
write('royale-v3-staging/costumes/tryon.mjs',tryon);
let purchase=imports(read('royale/clothing-purchase-ui.mjs'),'../../royale/');
purchase=purchase.replace('Waiting for permanent V3 cloud confirmation…','Saving this outfit…').replace("result.cloudConfirmed?'Your outfit was saved to this hero.':'Transaction not confirmed.'","result.cloudConfirmed?'Your outfit was saved to this hero.':result.localConfirmed?'Saved on this test browser.':'Transaction not confirmed.'");
write('royale-v3-staging/costumes/purchase-ui.mjs',purchase);
// Online snapshots are replaced frequently; renderer ownership must survive them.
let peers=read('royale/multiplayer/game-session.mjs').replace(/((?:from\s*|import\s*\()\s*['"])\.\.\//g,'$1../../royale/');peers=imports(peers,'../../royale/multiplayer/');
peers="import {CostumeOwners} from './owners.mjs';\n"+peers;
peers=replace(peers,'    super();this.client=', '    super();this.costumeOwners=new CostumeOwners();this.client=');
peers=replace(peers,'    for(const p of this.state?.nearby||[])','    this.costumeOwners.retain((this.state?.nearby||[]).map(p=>p.id));\n    for(const p of this.state?.nearby||[])');
peers=replace(peers,'{outfit:p.outfit,clothing:', '{owner:this.costumeOwners.get(p.id),outfit:p.outfit,clothing:');
write('royale-v3-staging/costumes/game-session.mjs',peers);
// The regular gameplay renderer also works for owned costumes on cloud heroes.
let renderer=imports(read('royale/renderer.mjs'),'../../royale/');
renderer="import {costumeForState} from './catalog.mjs';\nimport {costumeSprites} from './engine.mjs';\n"+renderer;
renderer=replace(renderer,'draw(game,alpha,dt){const c=', 'draw(game,alpha,dt){const costume=costumeForState(game.cosmetics);const c=');
renderer=replace(renderer,'const generated=!steelMode&&(',"const costumeBody=costume&&costumeSprites.draw(c,pos.x,pos.y,game.look,spriteHero,t,{id:costume.id,owner:game.hero});\n    const generated=!!costumeBody||!steelMode&&(");
renderer=replace(renderer,"const pose=generated||steelMode?poseFor(game.look,visualHero,t,'game'):","const pose=costumeBody||(generated||steelMode?poseFor(game.look,visualHero,t,'game'):");
renderer=replace(renderer,'cloth:this.cloth,dt:game.paused?0:dt\n      });','owner:game.hero,cloth:this.cloth,dt:game.paused?0:dt\n      }));');
renderer=replace(renderer,'if(steelMode)drawSteelSilhouette','if(steelMode&&!costumeBody)drawSteelSilhouette');
write('royale-v3-staging/costumes/renderer.mjs',renderer);
// KingJames keeps its approved default outfit and boss work when no costume is worn.
let king=read('royale-v3-staging/kingjames/renderer.mjs');
king="import {costumeForState} from '../costumes/catalog.mjs';\nimport {costumeSprites} from '../costumes/engine.mjs';\n"+king;
king=replace(king,'draw(game,alpha,dt){const c=','draw(game,alpha,dt){const costume=costumeForState(game.cosmetics);const c=');
king=replace(king,'const attackPresentation=this.prototypeSession&&','const attackPresentation=this.prototypeSession&&!costume&&');
king=replace(king,'const prototype=this.prototypeSession&&','const prototype=this.prototypeSession&&!costume&&');
king=replace(king,'const fullBody=prototype&&',"const costumeBody=costume&&costumeSprites.draw(c,pos.x,pos.y,game.look,spriteHero,t,{id:costume.id,owner:game.hero});\n    const fullBody=costumeBody||prototype&&");
king=replace(king,'const f=kingJamesSprites.lastFrame;', 'const f=costumeBody?costumeSprites.lastFrame:kingJamesSprites.lastFrame;');
write('royale-v3-staging/kingjames/renderer.mjs',king);
let app=read('royale-v3-staging/kingjames/app.mjs');
app=replace(app,'function saveClothingToAccount(snapshot){',`function saveClothingToAccount(snapshot){
 if(v2TestHero){const result=store.writeSlot(activeSlot,snapshot,{expectedId:activeId,requireDurable:true});return Promise.resolve({...result,localConfirmed:result.ok});}`);
app=replace(app,'function currentClothingStatus(){\n const ready=clothingCloudVerified', 'function currentClothingStatus(){\n const ready=(clothingCloudVerified||v2TestHero)');
app=replace(app,"reason:ready?'V3 cloud hero verified':clothingCloudReason", "reason:ready?(v2TestHero?'Local test hero; saves on this browser':'V3 cloud hero verified'):clothingCloudReason");
app=replace(app,'complete({...result,cloudConfirmed:true,localSaved:', 'complete({...result,cloudConfirmed:!v2TestHero,localConfirmed:v2TestHero,localSaved:');
app=replace(app,'if(ready)setCosmeticPreviewRenderer((c,x,y,look,hero,time,scale,view)=>kingJamesSprites.draw',"if(ready)setCosmeticPreviewRenderer((c,x,y,look,hero,time,scale,view)=>!game.cosmetics?.equipped?.fullbody&&kingJamesSprites.draw");
write('royale-v3-staging/kingjames/app.mjs',app);
// Preserve and redirect every versioned alias used by these staging entrypoints.
const mappings={
 '/royale/cosmetics/outfit-policy.mjs':'outfit-policy.mjs','/royale/cosmetics/runtime.mjs':'runtime.mjs','/royale/cosmetics/preview.mjs':'preview.mjs',
 '/royale/clothing-catalog-preview.mjs':'store.mjs','/royale/clothing-tryon.mjs':'tryon.mjs','/royale/clothing-purchase-ui.mjs':'purchase-ui.mjs',
 '/royale/hero-art.mjs':'hero-art.mjs','/royale-v3-staging/gameplay/hero-art.mjs':'hero-art.mjs',
 '/royale/multiplayer/game-session.mjs':'game-session.mjs','/royale/renderer.mjs':'renderer.mjs'
};
for(const [file,basePath] of [['index.html','/royale-v3-staging/'],['kingjames/index.html','/royale/'],['gameplay/index.html','/royale/'],['local-coop/index.html','/royale/local-coop/']]){
 const dest='royale-v3-staging/'+file;let html=read(dest).replace('Clothing Store · 36 outfits','Clothing Store · 46 outfits');
 // The complete costume preview has twelve actions; keep every label readable.
 html=html.replace(/<style id="costume-motion-layout">[\s\S]*?<\/style>/g,'');
 html=html.replace('</head>','<style id="costume-motion-layout">.clothing-fit-views[aria-label="Preview walking and running movements"]{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr))}</style></head>');
 html=html.replace(/<script type="importmap">([\s\S]*?)<\/script>/,(_,json)=>{const m=JSON.parse(json),base=new URL(basePath,'https://build.invalid');
  for(const [src,name]of Object.entries(mappings)){const rel=path.posix.relative(basePath,'/royale-v3-staging/costumes/'+name),target=(rel.startsWith('.')?rel:'./'+rel)+'?v=costumes-2';
   for(const [key,value]of Object.entries(m.imports))if(new URL(key,base).pathname===src||new URL(value,base).pathname===src){m.imports[key]=target;if(new URL(value,base).pathname===src)m.imports[value]=target;}
   const key=path.posix.relative(basePath,src);m.imports[key.startsWith('.')?key:'./'+key]=target;
  }
  for(const [key,value]of Object.entries(m.imports))if(['/royale-v3-staging/kingjames/app.mjs','/royale-v3-staging/kingjames/renderer.mjs'].includes(new URL(value,base).pathname))m.imports[key]=value.replace(/\?v=[^&]+/,'?v=costumes-2');
  const facePath=path.posix.relative(basePath,'/royale-v3-staging/costumes/face.mjs');
  const faceKey=facePath.startsWith('.')?facePath:'./'+facePath;
  m.imports[faceKey]=faceKey+'?v=black-hood-1';
  return '<script type="importmap">'+JSON.stringify(m)+'</script>';});
 if(file==='index.html')html=html.replace(/src="\.\/app\.mjs\?v=[^"]+"/,'src="./app.mjs?v=black-hood-1"');
 write(dest,html);
}
// Reload the test iframe as well as the face module after a costume art fix.
const parentApp=read('royale-v3-staging/app.mjs').replace(/\+'&v=[^']+'\+qa/,"+'&v=black-hood-1'+qa");
write('royale-v3-staging/app.mjs',parentApp);
console.log('Built ten-costume staging integration. Existing gameplay and production routes unchanged.');
