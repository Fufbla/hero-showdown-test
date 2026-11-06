import {createRequire} from 'node:module';import {writeFile,mkdir} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
import {prepareStyleCMaterials} from '../style-c-materials.mjs';import {drawHero} from '../style-c-hero.mjs';import {styleCDefault} from '../style-c-defaults.mjs';import {previewHero} from '../hero-rig.mjs';import {HAIR_REFERENCE_V3} from '../hair-reference-v3.mjs';
const setup={canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))};if(!await prepareStyleCMaterials(setup))throw Error('art load');
const out=fileURLToPath(new URL('../qa/nine-hair-review/',import.meta.url));await mkdir(out,{recursive:true});
const views=['front','right','back','left'];
for(const [hair,{name}] of Object.entries(HAIR_REFERENCE_V3)){
 const canvas=createCanvas(1440,1100),c=canvas.getContext('2d');c.fillStyle='#143c3b';c.fillRect(0,0,1440,1100);c.fillStyle='#ffe9b8';c.font='bold 27px sans-serif';c.fillText(name+' · original game heads',25,42);
 for(let row=0;row<2;row++)for(let v=0;v<4;v++){
  const sex=row?'male':'female',look={...styleCDefault(sex),hair,skin:row?'#6b4233':'#e99b83',hairColor:'#3e2048'},x=v*360,y=70+row*500;
  c.fillStyle='#e2dbb8';c.font='17px sans-serif';c.fillText(`${sex} · ${views[v]}`,x+90,y+22);
  const tile=createCanvas(700,750);drawHero(tile.getContext('2d'),340,710,look,previewHero('idle',0),0,4,{view:views[v]});
  c.drawImage(tile,95,100,440,510,x,y+30,360,390);drawHero(c,x+180,y+485,look,previewHero('idle',0),0,.62,{view:views[v]});
 }
 await writeFile(out+hair+'.webp',canvas.toBuffer('image/webp',95));
}
console.log('Rendered 72 enlarged/normal original-head hairstyle views.');
// Compact contact sheets for phone review, generated from the same game renderer.
for(const sex of ['female','male']){
 const canvas=createCanvas(1200,2850),c=canvas.getContext('2d');c.fillStyle='#143c3b';c.fillRect(0,0,1200,2850);c.fillStyle='#ffe9b8';c.font='bold 28px sans-serif';c.fillText('Nine hairstyles · '+sex+' original head',24,40);c.font='18px sans-serif';c.textAlign='center';['Front','Right','Back','Left'].forEach((label,i)=>c.fillText(label,150+i*300,75));c.textAlign='left';
 let row=0;
 for(const [hair,{name}] of Object.entries(HAIR_REFERENCE_V3)){
  const y=95+row*305;c.fillStyle='#f2e3b8';c.font='bold 20px sans-serif';c.fillText(name,25,y+23);
  for(let v=0;v<4;v++){
   const look={...styleCDefault(sex),hair,skin:sex==='male'?'#6b4233':'#e99b83',hairColor:'#3e2048'},tile=createCanvas(700,750);
   drawHero(tile.getContext('2d'),340,710,look,previewHero('idle',0),0,4,{view:views[v]});c.drawImage(tile,155,115,390,390,v*300+15,y+30,270,270);
  }
  row++;
 }
 await writeFile(out+'all-nine-'+sex+'.webp',canvas.toBuffer('image/webp',95));
}
{
 const canvas=createCanvas(1440,1700),c=canvas.getContext('2d');c.fillStyle='#143c3b';c.fillRect(0,0,1440,1700);c.fillStyle='#ffe9b8';c.font='bold 28px sans-serif';c.fillText('Original faces · skin and feature checks',24,42);
 const variants=[['Original features',{}],['Soft eyebrows',{brows:'soft'}],['Straight brows · smile',{brows:'straight',mouth:'smile'}],['Round eyes · full lips',{eyeShape:'round',mouth:'full'}]];
 const tones=[['female','#eed9cd','Pale skin'],['male','#34231e','Dark skin'],['female','#369e62','Fantasy skin'],['male','#eed9cd','Pale skin']];
 for(let row=0;row<4;row++){
  const [sex,skin,label]=tones[row],y=95+row*395;c.fillStyle='#e2dbb8';c.font='18px sans-serif';c.fillText(sex+' · '+label,24,y);
  for(let v=0;v<4;v++){
   const [title,changes]=variants[v],look={...styleCDefault(sex),hair:sex==='female'?'double-puffs':'fade',skin,hairColor:'#3e2048',...changes},tile=createCanvas(700,750);
   drawHero(tile.getContext('2d'),340,710,look,previewHero('idle',0),0,4,{view:'front'});c.drawImage(tile,170,180,340,370,v*360+25,y+10,310,337);c.font='16px sans-serif';c.fillStyle='#ffe9b8';c.fillText(title,v*360+22,y+365);
  }
 }
 await writeFile(out+'skin-feature-checks.webp',canvas.toBuffer('image/webp',96));
}
// A self-contained approval gallery opens without a server, login or save data.
{
 const {readFile}=await import('node:fs/promises');
 const sheets=await Promise.all(Object.entries(HAIR_REFERENCE_V3).map(async([id,{name}])=>({id,name,image:'data:image/webp;base64,'+(await readFile(out+id+'.webp')).toString('base64')})));
 sheets.push({id:'skin',name:'Skin and facial features',image:'data:image/webp;base64,'+(await readFile(out+'skin-feature-checks.webp')).toString('base64')});
 const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nine hairstyles — approval preview</title><style>:root{color-scheme:dark;font-family:system-ui;background:#143c3b;color:#f4eacb}body{margin:0}header{position:sticky;top:0;background:#102e32;padding:15px;border-bottom:1px solid #65776c}h1{font:27px Georgia;margin:0 0 8px}p{font-size:14px;line-height:1.5;margin:7px 0}.controls{display:flex;gap:8px;flex-wrap:wrap}button,select{font:inherit;color:inherit;background:#204f48;border:1px solid #9aaa89;border-radius:8px;padding:11px;min-height:44px}select{flex:1;min-width:180px}main{overflow:auto}img{display:block;width:100%;max-width:1440px;margin:auto}body.zoom img{width:1440px;max-width:none}footer{padding:18px;color:#ced9c5}</style><header><h1>Nine hairstyles · original heads</h1><p>Approval preview · Not published. Each hairstyle shows female and male heads in Front, Right, Back and Left views.</p><div class="controls"><button id="prev" aria-label="Previous hairstyle">←</button><select id="style" aria-label="Choose hairstyle"></select><button id="next" aria-label="Next hairstyle">→</button><button id="zoom" aria-pressed="false">Enlarge</button></div></header><main><img id="sheet" alt=""></main><footer>Rendered by the game’s character renderer. Original Style C faces, bodies and costumes retained.</footer><script>const sheets=${JSON.stringify(sheets)};const select=document.getElementById('style'),image=document.getElementById('sheet');sheets.forEach((s,i)=>select.add(new Option(s.name,i)));function show(){const s=sheets[Number(select.value)];image.src=s.image;image.alt=s.name+' on original character heads';}select.onchange=show;document.getElementById('prev').onclick=()=>{select.value=(Number(select.value)+sheets.length-1)%sheets.length;show()};document.getElementById('next').onclick=()=>{select.value=(Number(select.value)+1)%sheets.length;show()};document.getElementById('zoom').onclick=e=>{const on=document.body.classList.toggle('zoom');e.target.setAttribute('aria-pressed',String(on));e.target.textContent=on?'Fit to screen':'Enlarge'};show();</script></html>`;
 await writeFile(out+'hairstyle-approval-preview.html',html);
}
