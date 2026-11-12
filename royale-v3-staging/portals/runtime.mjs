import {createPortalPreview} from './sprites.mjs?v=portals-1';
import {drawPortal as fallback} from '../../royale/portal-art.mjs';
const images={},createCanvas=(width,height)=>Object.assign(document.createElement('canvas'),{width,height});
let renderer=null,error=null,pulse=-10,previousRegion=null,lastPadCheck=-1,padPressed=false;
const now=()=>performance.now()/1000;
export const portalReady=typeof Image==='undefined'?Promise.resolve(false):Promise.all(['frames','vortex','particles','lighting'].map(async key=>{
 const image=new Image();image.src=new URL(`./assets/${key}.webp?v=portals-1`,import.meta.url).href;await image.decode();images[key]=image;
})).then(()=>{renderer=createPortalPreview(images,{createCanvas});return true;}).catch(e=>{error=String(e);console.error('Portal artwork failed to load',e);return false;});
export function pulsePortal(){pulse=now();}
export function portalStatus(){return {ready:!!renderer,error,cache:renderer?.cache.size||0};}
if(typeof document!=='undefined'){
 document.addEventListener('keydown',e=>{if(e.code==='ArrowUp')pulsePortal();},{passive:true});
 document.addEventListener('click',e=>{if(e.target.closest?.('#world-portal,[data-travel],#confirm-fast-travel'))pulsePortal();},{passive:true});
}
export function drawPortal(c,x,y,region,time,label='REGION PORTAL · FREE',game=null,kind='regular'){
 if(!renderer){fallback(c,x,y,region,time,label);return;}
 const t=now();if(t-lastPadCheck>.03){lastPadCheck=t;const down=Array.from(navigator.getGamepads?.()||[]).some(p=>p?.buttons?.[12]?.pressed);if(down&&!padPressed)pulse=t;padPressed=down;}const scene=game?`${game.regionId}:${game.arenaScene?.legendary||!!game.arenaScene}`:null;
 if(scene&&scene!==previousRegion){if(previousRegion!==null)pulse=t;previousRegion=scene;}
 const id=kind==='world'?7:kind==='return'?15:kind==='boss'?region+7:Math.max(0,Math.min(6,region-1));
 const near=!!game?.hero&&Math.abs(game.hero.x-x)<=90&&Math.abs(game.hero.y-y)<100;
 renderer.draw(c,id,x,y,t,{size:kind==='boss'?202:184,near,activation:t-pulse});
 c.save();c.font='bold 10px system-ui';c.textAlign='center';c.fillStyle='#102330ee';c.fillRect(x-86,y+10,172,20);c.fillStyle='#f6ecd6';c.fillText(label,x,y+24,166);c.restore();
}
export function worldPortalPreview(parent){
 const canvas=createCanvas(200,180);canvas.setAttribute('aria-label','World Portal — fast travel costs 100 coins');canvas.style.cssText='width:160px;height:144px;display:block;margin:auto';parent.prepend(canvas);
 const c=canvas.getContext('2d');let last=0;function tick(t){if(!canvas.isConnected)return;if(t-last>=50){last=t;c.clearRect(0,0,200,180);renderer?.draw(c,7,100,165,t/1000,{size:180});}requestAnimationFrame(tick);}portalReady.then(()=>requestAnimationFrame(tick));
}
