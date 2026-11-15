// Preview-only UI. Bundled by build-environment-review.cjs; never published.
import {Game} from '../royale/core.mjs';
import {Renderer} from '../royale/renderer.mjs';
import {WORLD_REGIONS} from '../royale/world.mjs';
import {styleCDefault} from '../royale/style-c-defaults.mjs';
import {prepareReleaseArt} from '../royale/release-src/presentation.mjs';
const $=id=>document.getElementById(id),canvas=$('world'),renderer=new Renderer(canvas);
const first=new Game({look:{...styleCDefault('male'),name:'Environment preview'}});
const second=new Game({look:{...styleCDefault('female'),name:'Co-op preview'}});
let night=false,last=performance.now(),frames=0,total=0,peak=0,baseline='';
for(const region of WORLD_REGIONS){const option=document.createElement('option');option.value=region.id;option.textContent=region.name;$('region').append(option);}
function reset(){
 const id=Number($('region').value),x=Number($('position').value),y=Number($('height').value);
 for(const [i,g] of [first,second].entries()){
  g.loadRegion(id,{x:x+i*100,y});g.paused=true;g.clock=()=>({night});g.hero.face=i?-1:1;
 }
 $('status').textContent='Loading '+first.getRegion().name;$('metrics').textContent='';renderer.scene=null;frames=0;total=0;peak=0;baseline=first.save();
}
for(const id of ['region','position','height'])$(id).onchange=reset;
$('night').onchange=()=>{night=$('night').checked;reset();};
$('mobile').onchange=()=>{$('stage').classList.toggle('mobile',$('mobile').checked);renderer.resize();reset();};
$('coop').onchange=reset;
$('region').value='1';reset();
addEventListener('error',e=>{$('error').textContent=e.message;});
addEventListener('unhandledrejection',e=>{$('error').textContent=String(e.reason?.stack||e.reason);});
void prepareReleaseArt().then(()=>{$('art').textContent='Hero artwork loaded';}).catch(e=>{$('error').textContent=String(e);});
function frame(now){
 const dt=Math.min(.05,(now-last)/1000);last=now;first.time+=dt;second.time=first.time;
 const start=performance.now();renderer.draw(first,1,dt);
 if($('coop').checked){renderer.c.save();renderer.c.translate(-renderer.camera,-renderer.cameraY);renderer.drawPlayer(second,1,dt);renderer.c.restore();}
 const cost=performance.now()-start;frames++;total+=cost;peak=Math.max(peak,cost);
 $('status').textContent=renderer.environment.illustrated.ready(first.getRegion())?first.getRegion().name+' ready':'Loading '+first.getRegion().name;
 if(frames%30===0){
  $('metrics').textContent=`${(total/frames).toFixed(1)} ms average draw • ${peak.toFixed(1)} ms peak • ${frames} frames`;
  $('save').textContent=first.save()===baseline?'Progress unchanged':'Progress changed';
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
