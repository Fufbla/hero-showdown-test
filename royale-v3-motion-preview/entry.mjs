import './motion-safety.mjs';
import {motionSprites} from './motion-sprites.mjs';
try{
 await motionSprites.preload();
 await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('../assets/animation/motion-core.js',import.meta.url).href;s.onload=resolve;s.onerror=()=>reject(Error('Game motion library unavailable'));document.head.append(s);});
 await import('./clothing-catalog-preview.mjs');
 await import('./app.mjs');
}catch(error){
 console.error(error);const el=document.getElementById('hero-art-status');if(el){el.hidden=false;el.textContent='Motion preview could not start: '+error.message+' Reload to retry.';}
}
