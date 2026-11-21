// Render actual runtime sprites for visual review; no source artwork is drawn
// or altered here. Pass an output directory for QA; --write-previews also
// refreshes store thumbnails from the actual customized-head composition.
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {VICE_ACTIONS as ACTIONS,baseHero,actionHero} from '../test-only/four-powers/vice/tests/actions.mjs';

const [{CostumeEngine},{NEW_OUTFITS},{styleCDefault},{ATTACKS}]=await Promise.all([
 import('../royale/fashion/engine.mjs'),import('../royale/fashion/new-costumes/definitions.mjs'),
 import('../royale/style-c-defaults.mjs'),import('../royale/core.mjs')
]);
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const output=path.resolve(process.argv[2]||'/workspace/scratch/hero-royale-new-costumes-review');
await mkdir(output,{recursive:true});
const engine=new CostumeEngine({canvasFactory:createCanvas,imageLoader:url=>loadImage(fileURLToPath(url)),jsonLoader:async url=>JSON.parse(await readFile(url))});
for(const outfit of NEW_OUTFITS)if(!await engine.preload(outfit.id))throw Error(outfit.id+': '+engine.error);
const lookFor=presentation=>({...styleCDefault(presentation),skin:presentation==='female'?'#d5a47f':'#613a25',
 hair:presentation==='female'?'box-braids':'high-top',hairColor:presentation==='female'?'#753c26':'#24212a',eyes:'#5a48b0'});
if(process.argv.includes('--write-previews'))for(const outfit of NEW_OUTFITS){
 const preview=engine.compose(outfit.id,0,{...styleCDefault('male'),hair:'buzz',skin:'#a96943',hairColor:'#3f2a23'});
 await writeFile(new URL('../royale/fashion/new-costumes/assets/'+outfit.id+'/preview.png',import.meta.url),preview.toBuffer('image/png'));
}
const labels={idle:'Idle / float',start:'Starting',stop:'Stopping',run:'Run',jump:'Jump',doubleJump:'Double jump',fall:'Falling',land:'Landing',
 punch:'Punch',kick:'Kick',strength:'Super Strength',superKick:'Super Kick',fireball:'Fireball',fireballAir:'Air fireball',
 flightStart:'Flight launch',hover:'Hover',fly:'Forward flight',hurt:'Hurt',defeat:'Defeat',recovery:'Recovery',seismicSmash:'Seismic Smash',
 walk:'Upright walk',runStart:'Lowering to run',rise:'Rising to walk',steel:'Steel Body'};
const report={output,files:[],frames:[]};
const CW=256,CH=282,TOP=82;
function sheet(columns,rows,title,subtitle){
 const canvas=createCanvas(CW*columns,TOP+CH*rows),c=canvas.getContext('2d');
 c.fillStyle='#111c2d';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#eff6ff';c.font='bold 26px sans-serif';c.fillText(title,22,34);
 c.fillStyle='#b2c2d6';c.font='15px sans-serif';c.fillText(subtitle,22,61);
 return {canvas,c};
}
function cell(c,column,row,{outfit,state,presentation='male',direction=1,label}){
 const x=column*CW,y=TOP+row*CH;
 c.save();c.translate(x,y);c.fillStyle=(row+column)%2?'#203047':'#1a293e';c.fillRect(2,2,CW-4,CH-4);
 c.strokeStyle='#516079';c.setLineDash([3,4]);c.beginPath();c.moveTo(12,232);c.lineTo(CW-12,232);c.stroke();c.setLineDash([]);
 c.save();c.beginPath();c.rect(4,4,CW-8,CH-42);c.clip();
 const look=lookFor(presentation),owner={},opts={id:outfit.id,owner,scale:1.35};
 let hero=state==='walk'||state==='rise'?{...baseHero(),face:direction,vx:120}:state==='runStart'?{...baseHero(),face:direction,vx:300}:
  state==='steel'?{...baseHero(),face:direction,steel:true}:actionHero(state,direction,ATTACKS);
 let time=.48;
 if(state==='start'||state==='runStart'){
  engine.draw(c,CW/2,232,look,{...baseHero(),face:direction},0,opts);time=.08;
 }else if(state==='stop'||state==='rise'){
  engine.draw(c,CW/2,232,look,{...baseHero(),face:direction,vx:300},0,opts);time=.08;
 }
 // Clear pre-roll drawing but keep its animation state.
 if(['start','runStart','stop','rise'].includes(state)){
  c.fillStyle=(row+column)%2?'#203047':'#1a293e';c.fillRect(4,4,CW-8,CH-42);
 }
 const pose=engine.draw(c,CW/2,232,look,hero,time,opts);
 if(!pose)throw Error('Unable to draw '+outfit.id+' '+state);
 const frame={...engine.lastFrame};report.frames.push({outfit:outfit.id,presentation,requested:state,...frame});c.restore();
 c.fillStyle='#edf5ff';c.font='bold 15px sans-serif';c.fillText(label||labels[state]||state,13,260);
 c.fillStyle='#9bafca';c.font='11px sans-serif';c.textAlign='right';c.fillText(frame.state+' · '+frame.frame+(direction<0?' ←':' →'),CW-12,277);c.restore();
}
async function save(canvas,name){const file=path.join(output,name+'.png');await writeFile(file,canvas.toBuffer('image/png'));report.files.push(file);}

const overviewRows=NEW_OUTFITS.flatMap(outfit=>outfit.fullTransform?[{outfit,presentation:'male'}]:[{outfit,presentation:'male'},{outfit,presentation:'female'}]);
const overview=sheet(7,overviewRows.length,'Hero Royale · four new test looks','Actual game renderer · hats retain customized heroes · ghost and wolf replace the full body');
for(const [row,item]of overviewRows.entries())for(const [column,state]of ['idle',item.outfit.id==='wolf-transformation'?'walk':'start','run','punch','kick','fly','steel'].entries()){
 cell(overview.c,column,row,{...item,state,label:column===0?item.outfit.name+(item.outfit.fullTransform?'':item.presentation==='female'?' · F':' · M'):undefined});
}
await save(overview.canvas,'four-costumes-overview');

for(const outfit of NEW_OUTFITS){
 for(const presentation of outfit.fullTransform?['male']:['male','female']){
  const full=sheet(7,3,outfit.name+(outfit.fullTransform?'':' · '+presentation),'All 21 gameplay actions · same saved appearance, registered foot position, and effect anchors');
  for(const [index,state]of ACTIONS.entries())cell(full.c,index%7,Math.floor(index/7),{outfit,presentation,state,direction:index%2?-1:1});
  await save(full.canvas,outfit.id+(outfit.fullTransform?'':'-'+presentation)+'-all-actions');
 }
 if(outfit.id==='wolf-transformation'){
  const gait=sheet(4,2,'Wolf Transformation · two distinct gaits','Upright walk, authored lowering, four-legged run, and rise · mirrored left/right');
  for(let row=0;row<2;row++)for(const [column,state]of ['walk','runStart','run','rise'].entries())cell(gait.c,column,row,{outfit,state,direction:row?-1:1});
  await save(gait.canvas,'wolf-walk-run-transitions');
 }
}
await writeFile(path.join(output,'review.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,files:report.files,rendered:report.frames.length},null,2));
