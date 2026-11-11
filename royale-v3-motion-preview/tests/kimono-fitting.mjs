import {motionFrameSample} from '../style-c-motion.mjs';
import {drawHero} from '../hero-art.mjs';
import {prepareStyleCMaterials,styleCTextureStatus} from '../style-c-materials.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {previewHero} from '../hero-rig.mjs';
import {universalRenderLook,PASSES} from '../cosmetics/template.mjs';
import {ClothingAssets} from '../cosmetics/assets.mjs';
import {drawClothingPass} from '../cosmetics/renderer.mjs';
const canvas=document.getElementById('review'),ctx=canvas.getContext('2d'),status=document.getElementById('status');let show=true,frozen=false,time=0,last=0;
document.getElementById('toggle').onclick=e=>{show=!show;e.target.textContent=show?'Hide Kimono':'Show Kimono';};
document.getElementById('freeze').onclick=e=>{frozen=!frozen;e.target.textContent=frozen?'Animate':'Freeze animation';};
try{
 const cache=new ClothingAssets();const manifests=await Promise.all(['fullbody','footwear','headwear'].map(part=>fetch('../cosmetics/assets/royal-kimono/'+part+'.json').then(r=>r.json())));
 const layers=await Promise.all(manifests.map(async manifest=>({manifest,image:await cache.load(manifest)})));
 if(!await prepareStyleCMaterials())throw Error(styleCTextureStatus().error);
 status.textContent='Ready · four views × two hero presentations · fitting preview only';
 function draw(now){
  if(!frozen)time+=Math.min(.05,(now-last)/1000||0);last=now;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const poseName=document.getElementById('pose').value,frame=document.getElementById('frame').value;
  const fixed=frame===''?null:motionFrameSample(poseName,Number(frame));
  for(let row=0;row<2;row++)for(let col=0;col<4;col++){
   const presentation=row?'female':'male',view=['front','right','back','left'][col],x=150+col*300,y=360+row*380,scale=2.7;
   const look=universalRenderLook({...styleCDefault(presentation),cape:false});const hero=fixed?.hero||previewHero(poseName,time);hero.invulnerable=0;
   ctx.fillStyle='#e7d89e';ctx.font='16px system-ui';ctx.textAlign='center';ctx.fillText(presentation.toUpperCase()+' · '+view.toUpperCase(),x,y-330);
   ctx.strokeStyle='#35585a';ctx.beginPath();ctx.moveTo(x-110,y+2);ctx.lineTo(x+110,y+2);ctx.stroke();
   drawHero(ctx,x,y,look,hero,fixed?.time??time,scale,{...fixed?.options,view,poseName,layered:true,clothing:show?layers:[],outfit:{id:'starter-basic',origin:'starter'}});
  }
  requestAnimationFrame(draw);
 }
 requestAnimationFrame(draw);
}catch(e){status.textContent='Unable to load preview: '+e.message;console.error(e);}
