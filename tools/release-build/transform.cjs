function replace(s,a,b){if(!s.includes(a))throw Error('Release source changed: '+a.slice(0,110));return s.replace(a,b);}
function between(s,start,end,replacement=''){
  const a=s.indexOf(start),b=s.indexOf(end,a+start.length);
  if(a<0||b<0)throw Error('Release boundary changed: '+start);
  return s.slice(0,a)+replacement+s.slice(b);
}
function game(s){
  s=s.replace(/^import .*from '\.\/v2-test-hero\.mjs';\n/m,'');
  s=s.replace(/^import .*from '\.\/v2-sprites\/(?:runtime|approved-motion)\.mjs';\n/gm,'');
  s=s.replace(/^if\(\/\^\(world\|vertical\).*\n/m,'');
  s=s.replace(/^const testPrefix=.*$/m,"const testPrefix='';");
  s=s.replace(/^const practiceHero =.*$/m,'const practiceHero=null;');
  s=s.replace(/^const v2TestHero=.*$/m,'const v2TestHero=false;');
  s=replace(s,"const storagePrefix = testPrefix || (v2TestHero?V2_TEST_STORAGE_PREFIX:(codePlay?(params.get('codePlay')==='v3'?'royale-v3-play:':'royale-code-play-v1:'):(practiceHero ? `style-c-trial-v1-${practiceHero}:` : '')));","const storagePrefix=codePlay?(params.get('codePlay')==='v3'?'royale-v3-play:':'royale-code-play-v1:'):'';");
  s=between(s,'if(v2TestHero){\n renderer.v2SpriteTest=true;','const creatorHome=');
  s=between(s,'let phase10QA=null;','void prepareStyleCMaterials()',"let phase10QA=null;\nrenderRoster();setScreen('roster');\n");
  s=s.replace("if(v2TestHero)game=new Game({save:maxV2TestPowers(JSON.parse(game.save()),{starterLoadout:true}),testPowers:true});",'');
  s=s.replaceAll("params.has('qa')",'false');
  s=s.replace(/^for\(const link of document\.querySelectorAll\('#roster a\[href\^="tests\/"\]'\)\).*\n/m,'');
  s=s.replace(/^\$\('measure-performance'\)\.onclick=.*\n/m,'');
  s=s.replace(/^import \{FrameMetrics,performanceLabel\}.*\n/m,'');
  s=between(s,'function beginMeasurement(', 'const menuGamepad=');
  s=s.replace(/^  if\(measurement.*\n/gm,'');
  s=s.replaceAll("$('diagnostics').hidden = !false;",'');
  s=replace(s,"const result=store.cloud?await store.commit(activeSlot,game.save()):persist({manual:true});","const result=codePlay?await confirmTravelSave(()=>({ok:true})):store.cloud?await store.commit(activeSlot,game.save()):persist({manual:true});");
  s=replace(s,"store.cloud?'Game saved to your account.':'Hero saved on this browser.'","codePlay||store.cloud?'Game saved to your account.':'Hero saved on this browser.'");
  // Local heroes retain their original namespace and may buy cosmetics normally.
  s=replace(s,'function saveClothingToAccount(snapshot){','function saveClothingToAccount(snapshot){\n if(!codePlay)return Promise.resolve(store.writeSlot(activeSlot,snapshot,{expectedId:activeId,requireDurable:true}));');
  s=replace(s,'const ready=clothingCloudVerified&&game.started', 'const ready=(clothingCloudVerified||!codePlay)&&game.started');
  s=s.replaceAll('V3 cloud','Cloud').replaceAll('V3 Cloud Login','your account');
  return s;
}
function renderer(s){
  s=s.replace(/^import \{outfitTrial\}.*\n/m,'');
  s=replace(s,'const savedCostume=costumeForState(game.cosmetics),costume=this.prototypeSession?outfitTrial.selected(savedCostume):savedCostume;', 'const costume=costumeForState(game.cosmetics);');
  s=s.replaceAll('this.prototypeSession&&','').replaceAll('this.v2SpriteTest','false');
  s=replace(s,'this.height=720;false=false;', 'this.height=720;');
  s=s.replace('this.width=1280;this.height=720;false=false;','this.width=1280;this.height=720;');
  s=replace(s,'const prototype=!costume&&kingJamesSprites.selected(game.look);','const prototype=!costume&&kingJamesSprites.selected(game.look);');
  s=between(s,'    if(fullBody){Object.assign(this.canvas.dataset,','    if(steelMode&&!fullBody)', '');
  // Preserve active powers for approved transformation and attack animations.
  s=s.replace('const spriteHero=false?{...visualHero,v2Active:game.powers?.active}:visualHero;','const spriteHero={...visualHero,v2Active:game.powers?.active};');
  s=s.replaceAll("from '../../royale/hero-art.mjs'","from '../../royale/release-src/presentation.mjs'");
  return s;
}
function cloud(s){
  s=s.replace(/^import \{CHARACTER_TEST_CODE,isCharacterTestCode\}.*\n/m,'');
  s=between(s,'// Fixed code 0000000000','async function save(');
  s=s.replace('if(isCharacterTestCode(code)){launchCharacterTest();return;}','');
  s=s.replace("if(characterTestSession){launchCharacterTest();return;}",'');
  s=s.replace("$('game-frame').src='./gameplay/?codePlay=v3&v=armor-stats-1&cloudLoad='+Date.now();", "$('game-frame').src=new URL('../royale/gameplay/?codePlay=v3&cloudLoad='+Date.now(),import.meta.url).href;");
  s=s.replaceAll('V3 cloud','Cloud').replaceAll('V3 Cloud','Cloud');
  return s;
}
function coop(s){
  s=replace(s,"qa=new URLSearchParams(location.search).get('qa')==='1'",'qa=false');
  s=between(s,'if(qa){\n const harness=','updateStart();');
  s=replace(s,"[['stats','Hero Stats'],['tree','Tree of Eris'],['gear','Equipment'],['travel','World'],]","[['stats','My Hero'],['tree','Tree of Eris']]");
  s=s.replace("players[i].tab='powers';openMenu();","players[i].tab='tree';openMenu();");
  s=replace(s,"const tabs=['stats','tree','gear','travel'];","const tabs=['stats','tree'];");
  s=replace(s,"if(p.tab==='travel'){","if(p.tab==='travel'&&p.portal&&g.nearPortal()){");
  return s;
}
module.exports=function transform(file,s){
  if(file==='royale/app.mjs')s=game(s);
  if(file==='royale-v3-staging/kingjames/renderer.mjs')s=renderer(s);
  if(file==='royale-v3-staging/app.mjs')s=cloud(s);
  if(file==='royale-v3-staging/gameplay/local-coop-app.mjs')s=coop(s);
  if(file==='royale/multiplayer-gate.mjs'){
    s=replace(s,"loadMenu=()=>import('./multiplayer/menu.mjs')",'loadMenu=null');
    s=replace(s,"if(enabled){const {MultiplayerMenu}=await loadMenu();return new MultiplayerMenu(hooks);}",'');
  }
  if(file==='royale/core.mjs')s=s.replace('this.testPowers=testPowers===true;','this.testPowers=false;');
  if(file==='royale-v3-staging/kingjames/selection.mjs')s="export const OUTFIT_ID='kingjames-original';\nexport const selectedOutfit=enabled=>enabled?OUTFIT_ID:null;\n";
  if(file==='royale-v3-staging/gameplay/serialize.mjs'){
    s=s.replace("new URL('../../royale/local-coop/json-worker.mjs',import.meta.url)","new URL('../../royale/release/json-worker.mjs',import.meta.url)");
  }
  return s.replaceAll('V3 cloud hero','hero').replaceAll('V3 cloud','cloud');
};
