// Bounded, world-anchored sprite effects. Reads gameplay; never changes a hero.
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const loadImage=url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Motion atlas unavailable'));image.src=url;});
export class MotionFX{
 constructor(){this.owners=new WeakMap();this.ready=false;this.seen=new Set();this.lastStats={};}
 async preload({imageLoader=loadImage,jsonLoader=async url=>(await fetch(url)).json()}={}){
  const url=new URL('./effects/manifest.json',import.meta.url);
  try{this.manifest=await jsonLoader(url);this.atlas=await imageLoader(new URL(this.manifest.atlas,url));this.ready=true;return true;}catch(e){this.error=e.message;return false;}
 }
 state(owner,time){let s=this.owners.get(owner);if(!s||time<s.time){s={time,particles:[],echoes:[],lastDust:time-.2,lastEcho:time-.2,grounded:owner.grounded,y:owner.y,jumpAge:owner.jumpAge,steel:!!owner.steel};this.owners.set(owner,s);}return s;}
 emit(s,id,x,y,face,time,{width=95,height=95,alpha=1}={}){
  s.particles.push({id,x,y,face,born:time,width,height,alpha});if(s.particles.length>28)s.particles.shift();this.seen.add(id+':'+face);
 }
 update(game,h,time,engine){
  const s=this.state(game.hero,time),dt=clamp(time-s.time,0,.1);s.time=time;
  const speed=Math.abs(h.vx||0),face=(h.face||1)<0?-1:1,passive=(game.powers?.data?.levels?.speed||0)>0;
  if(dt>0){
   if(passive&&!h.dead&&h.grounded&&speed>40&&!h.flying){
    const intensity=clamp(speed/504);
    if(time-s.lastDust>.13-.065*intensity){this.emit(s,'dust',h.x-face*8,h.y,face,time,{width:45+intensity*30,height:45+intensity*30,alpha:.5+intensity*.3});s.lastDust=time;}
    if(time-s.lastEcho>.07&&speed>220&&s.lastPaint){s.echoes.push({x:h.x-face*18,y:h.y,born:time,paint:{...s.lastPaint},alpha:.10+intensity*.04});s.lastEcho=time;}
    if(time-(s.lastStreak??-1)>.065){this.emit(s,'streak',h.x-face*13,h.y-13,face,time,{width:80+intensity*65,height:75,alpha:.3+intensity*.5});s.lastStreak=time;}
   }
   if(passive&&!h.dead&&!h.flying&&h.jumpAge<s.jumpAge)this.emit(s,h.jumps>=2?'airJump':'takeoff',h.x,s.grounded?s.y:h.y,face,time,{width:65,height:92,alpha:.6});
   if(passive&&!h.dead&&h.grounded&&!s.grounded)this.emit(s,'landing',h.x,h.y,face,time,{width:92,height:82,alpha:.85});
   if(!!h.steel!==s.steel){s.changedSteel=time;this.seen.add(h.steel?'transform':'restore');}
  }
  s.grounded=h.grounded;s.y=h.y;s.jumpAge=h.jumpAge;s.steel=!!h.steel;
  s.particles=s.particles.filter(p=>time-p.born<this.manifest.clips[p.id].duration);
  s.echoes=s.echoes.filter(p=>time-p.born<.22).slice(-4);
  this.lastStats={particles:s.particles.length,echoes:s.echoes.length,seen:[...this.seen],steel:!!h.steel};
  return s;
 }
 sprite(c,id,index,x,y,w,h,face=1,alpha=1,anchor=[.5,.98]){
  const m=this.manifest,a=m.clips[id];if(!a||alpha<=0)return;
  c.save();c.globalAlpha*=alpha;c.translate(x,y);c.scale(face,1);
  c.drawImage(this.atlas,Math.max(0,Math.min(7,index))*m.cell[0],a.row*m.cell[1],...m.cell,-w*anchor[0],-h*anchor[1],w,h);c.restore();
 }
 draw(c,game,pos,time,layer,h,engine){
  if(!this.ready)return;
  const s=layer==='back'?this.update(game,h,time,engine):this.state(game.hero,time),face=(h.attack?.face||h.face||1)<0?-1:1;
  if(layer==='back'){
   for(const p of s.echoes){c.save();c.globalAlpha*=p.alpha*(1-(time-p.born)/.22);engine.drawEcho(c,p.x,p.y,p.paint);c.restore();}
   for(const p of s.particles){const phase=clamp((time-p.born)/this.manifest.clips[p.id].duration);this.sprite(c,p.id,Math.floor(phase*8),p.x,p.y,p.width,p.height,p.face,p.alpha*(1-phase*.35),p.id==='streak'?[.9,.84]:p.id==='landing'?[.5,.84]:[.5,.98]);}
   if(h.steel&&h.flying){this.sprite(c,'shimmer',Math.floor(time*20)%8,pos.x-face*36,pos.y-27,80,42,face,.32,[.7,.5]);this.seen.add('steel-flight');}
  }else{
   // The shared sprite engine may last have drawn the other co-op hero.
   // Capture this owner's body only after their own draw for the next frame.
   s.lastPaint=engine.lastPaint?{...engine.lastPaint}:null;
   if(s.changedSteel!==undefined&&time-s.changedSteel<.32){const p=(time-s.changedSteel)/.32;this.sprite(c,'shimmer',Math.floor(p*8),pos.x,pos.y-110+p*110,90,50,face,.75,[.5,.5]);}
   if(h.steel&&['strength','superKick'].includes(h.attack?.power)){
    const kind=h.attack.kind,start=kind==='punch'?.055:.10,age=h.attack.age;
    if(age>=start&&age<start+.17){this.sprite(c,'impact',Math.floor((age-start)/.17*8),pos.x+face*(kind==='punch'?61:66),pos.y-(kind==='punch'?62:48),74,74,face,.88,[.55,.5]);this.seen.add('steel-'+h.attack.power);}
   }
  }
 }
}
export const kingJamesFX=new MotionFX();
