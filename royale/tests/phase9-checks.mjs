import {Game} from '../core.mjs';
import {WORLD_REGIONS} from '../world.mjs';
import {PROFILE_KEY} from '../saves.mjs';
const $=id=>document.getElementById(id),frame=$('frame'),wait=ms=>new Promise(r=>setTimeout(r,ms));let serial=0;
export function verticalCommand(frame,action,value){
 const request=`vertical-${++serial}`;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{removeEventListener('message',receive);reject(Error('Fixture timeout: '+action));},30000);function receive(e){if(e.source===frame.contentWindow&&e.origin===location.origin&&e.data?.type==='royale-vertical-result'&&e.data.request===request){clearTimeout(timer);removeEventListener('message',receive);resolve(e.data);}}addEventListener('message',receive);frame.contentWindow.postMessage({type:'royale-vertical-fixture',action,value,request},location.origin);});
}
if($('run'))$('run').onclick=async()=>{
 $('run').disabled=true;$('log').textContent='';let count=0;
 const check=(name,ok)=>{if(!ok)throw Error(name);count++;$('log').textContent+=`PASS · ${name}\n`;};
 const until=async fn=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('UI timeout');await wait(35);}};
 try{
 for(const [width,height,mode] of [[390,844,'touch'],[844,390,'touch'],[320,568,'touch'],[768,1024,'keyboard'],[1280,800,'controller']])for(const region of WORLD_REGIONS){
  $('report').textContent=`Running ${width}×${height} · ${region.name} · ${mode} · ${count} checks passed`;
  frame.width=width;frame.height=height;const session=`vertical-checks-${Date.now()}-${width}-${region.id}`,prefix=`royale-test-${session}:`,g=new Game({look:{name:'Vertical Explorer',cape:true,build:width===320?'full':width===844?'slender':'strong'}});g.travel(region.id);g.hero.invulnerable=999;const stamp=new Date().toISOString();
  sessionStorage.setItem(prefix+PROFILE_KEY,JSON.stringify({version:2,revision:0,activeSlot:0,legacyImported:true,slots:[{id:session,createdAt:stamp,updatedAt:stamp,lastRegion:region.name,snapshot:JSON.parse(g.save())},null,null]}));
  await new Promise(r=>{frame.onload=r;frame.src=`../?qa=1&touch=1&testSession=${session}`;});const d=frame.contentDocument;await until(()=>d.querySelector('[data-action=continue]'));d.querySelector('[data-action=continue]').click();
  const inside=n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=-1&&r.right<=width+1&&r.top>=0&&r.bottom<=height+1;};
  check(`${width} ${region.name}: HUD and touch controls visible`,inside(d.getElementById('hp-text'))&&inside(d.getElementById('xp-text'))&&inside(d.querySelector('[data-control=jump]'))&&inside(d.getElementById('stick')));
  check(`${width} ${region.name}: no horizontal overflow`,d.documentElement.scrollWidth===width);
  for(let tier=1;tier<=4;tier++){
   const result=await verticalCommand(frame,'climb',{tier,mode}),s=result.state;
   check(`${width} ${region.name} tier ${tier}: real ${mode} handler lands and resets double jump`,result.detail.landed&&result.detail.double&&s.hero.jumps===0);
   check(`${width} ${region.name} tier ${tier}: vertical camera contains hero`,s.hero.y-88>=s.camera.y-1&&s.hero.y<=s.camera.y+s.camera.height);
   check(`${width} ${region.name} tier ${tier}: elevated monster has valid home`,s.enemies.some(e=>e.surface===`climb-0-${tier}`&&e.hp>0&&(e.flying||Math.abs(e.y-e.ground)<1)));
  }
  await verticalCommand(frame,'place','climb-0-3');const wound=await verticalCommand(frame,'wound','climb-0-3');check(`${width} ${region.name}: 50% threshold has no knockback or damage bonus`,wound.detail.before.x===wound.detail.after.x&&wound.detail.before.y===wound.detail.after.y&&wound.detail.before.damage===wound.detail.after.damage);
  const before=wound.state.enemies.find(e=>e.id===wound.detail.id);const result=await verticalCommand(frame,'step',120);const after=result.state.enemies.find(e=>e.id===before.id);
  check(`${width} ${region.name}: wounded elevated enemy remains active`,after.desperate&&after.hp>0&&!['idle','dead'].includes(after.state));
  check(`${width} ${region.name}: bounded texture caches`,result.state.cache.monsters<=6&&result.state.cache.scenes<=2&&result.state.cache.terrain<=48&&result.state.cache.bosses<=3);
  d.getElementById('pause').click();
 }
 $('report').textContent=`COMPLETE · ${count} Phase 9 browser assertions passed · all seven regions, four elevated tiers, five viewports; keyboard, synthetic touch and mocked controller. Physical devices not tested.`;
 }catch(e){$('report').textContent=`FAIL · ${e.message}\n${count} checks passed.`;}
 finally{$('run').disabled=false;}
};
