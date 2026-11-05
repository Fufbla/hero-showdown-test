import {MultiplayerClient} from '../client.mjs';
import {Renderer,drawHero} from '../../renderer.mjs';
import {Input} from '../../input.mjs';
import {prepareStyleCMaterials} from '../../style-c-materials.mjs';
await prepareStyleCMaterials();
const $=id=>document.getElementById(id),renderer=new Renderer($('game'));
let client=null,game=null,nearby=[],selected=false;
const pause=()=>client?.command('pause',[!game?.paused]).catch(error=>$('error').textContent=error.message);
const input=new Input(document.body,pause);$('pause').onclick=pause;
const identity=new URL(location.href).searchParams.get('player');if(['1','2','3','4'].includes(identity))$('identity').value=identity;
$('connect').onclick=async()=>{
  client?.close();selected=false;const who=$('identity').value;
  client=new MultiplayerClient(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/royale`,async()=>{
    const r=await fetch('/fixture-session?player='+who);if(!r.ok)throw Error('Review server is unavailable.');return (await r.json()).token;
  });
  client.addEventListener('heroes',({detail})=>{if(!selected){if(detail.length){selected=true;client.select(detail[0].id);}else client.create(0,{name:'Test Hero '+who});}});
  client.addEventListener('status',({detail})=>$('status').textContent=detail);
  client.addEventListener('error',({detail})=>$('error').textContent=detail);
  client.addEventListener('state',({detail})=>{game=detail.game;nearby=detail.nearby;input.enabled=true;$('players').textContent=`${detail.players.length} connected · `+detail.players.map(p=>p.name).join(', ');$('metrics').textContent=JSON.stringify({id:detail.id,x:game.hero.x,y:game.hero.y,hp:game.hero.hp,level:game.hero.level,xp:game.hero.xp,coins:game.hero.coins,revision:detail.revision,tick:detail.tick,nearby:nearby.length,code:detail.code});});
  await client.connect();
};
function action(method,args){$('error').textContent='';client?.command(method,args).catch(e=>$('error').textContent=e.message);}
$('create').onclick=()=>action('mode',['create']);$('join').onclick=()=>action('mode',['join',$('code').value.trim().toUpperCase()]);$('solo').onclick=()=>action('mode',['solo']);$('reconnect').onclick=()=>client?.socket.close();
setInterval(()=>{if(client?.ready){input.pollGamepad();client.input(input.sample());}},1000/30);
let last=performance.now();
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(game){renderer.draw(game,1,dt);const c=renderer.c;c.save();c.setTransform(renderer.dpr*renderer.scale,0,0,renderer.dpr*renderer.scale,0,0);c.translate(-renderer.camera,-renderer.cameraY);for(const p of nearby){drawHero(c,p.hero.x,p.hero.y,p.look,p.hero,game.time,1,{outfit:p.outfit,dt});c.fillStyle='#fff5cc';c.font='bold 13px system-ui';c.textAlign='center';c.fillText(p.look.name,p.hero.x,p.hero.y-115);}c.restore();}requestAnimationFrame(frame);}requestAnimationFrame(frame);
