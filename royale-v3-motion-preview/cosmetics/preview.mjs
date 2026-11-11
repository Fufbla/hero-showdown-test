import {drawHero} from '../hero-art.mjs';
import {previewHero} from '../hero-rig.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';

// Catalog cards and the fitting room use the same complete outfit rendering.
// Preview armor is empty, so another outfit's accessory or cape cannot linger.
export function drawOutfitPreview(canvas,{look,layers=[],view='front',motion='idle',direction=1,time=0,scale}={}){
 const c=canvas.getContext('2d');if(!c)return null;
 const x=canvas.width/2,y=canvas.height-20;
 c.clearRect(0,0,canvas.width,canvas.height);
 c.fillStyle='rgba(150,210,170,.1)';c.beginPath();c.ellipse(x,y,canvas.width*.18,8,0,0,Math.PI*2);c.fill();
 const hero=previewHero(motion,time);hero.face=direction;
 if(motion!=='idle')hero.vx=Math.abs(hero.vx)*direction;
 return drawHero(c,x,y,{...(look||styleCDefault('male')),cape:false},hero,time,
  scale??Math.min(canvas.width/145,canvas.height/125),
  {view,outfit:{origin:'cosmetic-preview',pieces:{},hideBaseCape:true},clothing:layers});
}
