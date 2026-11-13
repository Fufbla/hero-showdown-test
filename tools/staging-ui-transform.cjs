// Apply the reviewed interface to the verified release graph without editing
// shared production sources. Exact boundaries make unexpected source drift fail.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function replace(s,from,to){if(!s.includes(from))throw Error('Staging UI source boundary changed: '+from.slice(0,90));return s.replace(from,to);}
module.exports=function(file,s){
 if(file==='royale/core.mjs')s=replace(s,'this.testPowers=false;','this.testPowers=testPowers===true;');
 if(file==='royale/app.mjs'){
  s="import {installInterface} from '../royale-v3-staging/interface/interface.mjs';\n"+s;
  s=replace(s,'const v2TestHero=false;',"const v2TestHero=params.get('testAccount')==='0000000000';");
  s=replace(s,"const storagePrefix=codePlay?", "const storagePrefix=v2TestHero?'royale-v2-prototype-0000000000:':codePlay?");
  s=replace(s,"let soundEnabled=false", "let interfaceUI=null;\nlet soundEnabled=false");
  s=replace(s,"&&game.treeVisit&&!online()&&game.canSave()", "&&(screen==='clothing'||game.treeVisit)&&!online()&&game.canSave()");
  s=replace(s,"reason:ready?'Cloud hero verified':clothingCloudReason,", "reason:ready?'Hero ready':!game.canSave()?'Resume and spend five seconds outside combat before purchasing.':clothingCloudReason,");
  s=s.replace('Purchases require a loaded Cloud hero at the Tree of Eris. Open the game through V3 login.','Open the Clothing Store with a loaded hero outside combat.');
  s=replace(s,"if(next==='tree')queueMicrotask", "interfaceUI?.screen(next);\n  if(next==='tree'||next==='clothing')queueMicrotask");
  s=replace(s,"'play','powerPicker','pause','tree','controls'", "'play','powerPicker','pause','clothing','tree','controls'");
  s=replace(s,'function canLeaveMenu(){',"function canLeaveMenu(){\n if(clothingBusy||interfaceUI?.blocked())return false;");
  s=replace(s,'function backToPause(){',"function backToPause(){\n if(screen==='clothing'){interfaceUI.back();return;}");
  s=replace(s,"if(screen==='play')pause();", "if(screen==='clothing'){interfaceUI.back();return;}\n if(screen==='play')pause();");
  s=replace(s,"storageNotice();if(codePlay&&result.ok)","storageNotice();interfaceUI?.saved();if(codePlay&&result.ok)");
  s=replace(s,"const panel=criticalPending?$('permanent-save'):$( {", "const panel=criticalPending?$('permanent-save'):$( { clothing:'clothing-menu',");
  s=replace(s,"renderRoster();setScreen('roster');\nvoid prepareStyleCMaterials()",`interfaceUI=installInterface({
 hero:()=>game.look,status:currentClothingStatus,
 saved:()=>({slot:activeSlot,updatedAt:store.slot(activeSlot)?.updatedAt}),
 open:()=>{if(game.started&&canLeaveMenu())setScreen('clothing');},
 back:()=>{if(!clothingBusy)showPause();},
 restore:()=>{if(clothingBusy)return;if(codePlay){parent.postMessage({type:'royale-restore-cloud-heroes'},location.origin);}else if(v2TestHero){store.load();renderRoster();setScreen('roster');say('Test heroes restored from this browser.');}else say('Enter your 10-digit code to restore cloud heroes.',6);}
});
// Reserved public test code only. Existing test saves are reused unchanged.
if(v2TestHero&&!store.slot(0)&&store.writable){
 const fixture=new Game({look:{...styleCDefault('male'),name:'Interface Test'}}),snapshot=JSON.parse(fixture.save());snapshot.coins=2100;
 const created=store.writeSlot(0,snapshot,{expectedId:null,requireDurable:true});if(!created.ok)throw Error(created.error);
}
renderRoster();setScreen('roster');
void prepareStyleCMaterials()`);
 }
 if(file==='royale-v3-staging/app.mjs'){
  // Keep the account bridge and reserved test entry; only change its destination/UI.
  s=fs.readFileSync(path.join(root,file),'utf8');
  s=replace(s,"$('game-frame').src='./kingjames/index.html?v2TestCharacter='+CHARACTER_TEST_CODE+'&v=black-hood-1'+qa;", "$('game-frame').src='./gameplay/?testAccount='+CHARACTER_TEST_CODE;");
  s=s.replace("status('KINGJAMES PROTOTYPE · 0000000000 · Progress saves on this browser every eight seconds.');","status('Test hero ready.');");
  s=replace(s,"function showCloudNote(visible){const note=$('roster').querySelector('p');if(note)note.hidden=!visible;}","function showCloudNote(){document.body.classList.add('staging-session');}");
  s+=`\nwindow.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==$('game-frame').contentWindow||e.data?.type!=='royale-restore-cloud-heroes')return;void run(async()=>{if(characterTestSession){launchCharacterTest();return;}if(clothingSavesPending.size)throw Error('Wait for the outfit save to finish.');await launch();});});\n`;
 }
 return s;
};
