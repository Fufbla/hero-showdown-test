// Only labelled session-storage review frames can invoke these disposable fixtures.
export function installVerticalQA(getGame,input,renderer,refresh){
 const params=new URLSearchParams(location.search);
 if(!params.has('qa')||!/^vertical-(checks|practice)-/.test(params.get('testSession')||''))return;
 const state=()=>{const g=getGame(),h=g.hero;return {hero:{x:h.x,y:h.y,vx:h.vx,vy:h.vy,grounded:h.grounded,jumps:h.jumps,hp:h.hp,level:h.level},camera:{x:renderer.camera,y:renderer.cameraY,width:renderer.width,height:renderer.height},region:g.regionId,enemyCount:g.enemies.length,enemies:g.enemies.map(e=>({id:e.id,type:e.type,x:e.x,y:e.y,hp:e.hp,maxHp:e.maxHp,state:e.state,desperate:e.desperate,surface:e.surface.id,ground:e.surface.y,flying:e.flying,airborne:e.airborne,rooted:e.rooted,lifted:e.lifted})),cache:{monsters:renderer.monsterAtlas.entries.size,scenes:renderer.environment.scenes.size,terrain:renderer.environment.terrain.size,bosses:renderer.bossArt.regions.size},phase:g.clock().phase,save:g.save()};};
 addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='royale-vertical-fixture')return;
  const {action,value,request}=event.data,g=getGame(),h=g.hero;let detail=null;
  if(action==='place'){
    const s=g.surfaces.find(s=>s.id===value);if(s){input.clear();Object.assign(h,{x:s.x+40,prevX:s.x+40,y:s.y,prevY:s.y,vx:0,vy:0,grounded:true,jumps:0,attack:null,invulnerable:999});g.combatTimer=0;}
  }
  if(action==='step'){
    const paused=g.paused;g.paused=false;
    for(let i=0;i<Math.min(1200,Math.max(0,Number(value)||0));i++){input.pollGamepad();g.step(1/60,input.sample());renderer.draw(g,1,1/60);}
    g.paused=paused;
  }
  if(action==='wound'){
    const e=g.enemies.find(e=>e.surface.id===value);if(e){e.protection=0;const before={x:e.x,y:e.y,damage:g.monsterDamage(e)};g.damageEnemy(e,e.hp-e.maxHp*.5,{stagger:false});detail={before,after:{x:e.x,y:e.y,damage:g.monsterDamage(e)},id:e.id};}
  }
  if(action==='climb'){
    const {tier,mode='keyboard'}=value,to=g.surfaces.find(s=>s.id===`climb-0-${tier}`),from=tier>1?g.surfaces.find(s=>s.id===`climb-0-${tier-1}`):null;
    const oldEnemies=g.enemies;g.enemies=[];input.clear();Object.assign(h,{x:from?from.x+from.w-35:to.x+35,y:from?.y??600,vx:0,vy:0,grounded:true,jumps:0,coyote:.1,invulnerable:999});
    const key=(code,on)=>window.dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code,bubbles:true})),stick=document.getElementById('stick'),jump=document.querySelector('[data-control="jump"]');
    const pointer=(target,type,id,x=0,y=0)=>target.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true}));
    const capture=[stick.setPointerCapture,jump.setPointerCapture],getPads=navigator.getGamepads;let held=false,double=false,landed=false,frames=0;const pad={connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false}))};
    try{
      if(mode==='touch'){stick.setPointerCapture=jump.setPointerCapture=()=>{};}
      if(mode==='controller')Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
      const paused=g.paused;g.paused=false;
      for(let f=0;f<180;f++){
        const moving=h.x<to.x+70,press=f===0||(!double&&h.jumps===1&&h.vy>-70);if(f>0&&press)double=true;
        if(mode==='keyboard'){if(moving!==held){key('KeyD',moving);key('ShiftLeft',moving);}if(press)key('Space',true);}
        if(mode==='touch'){const r=stick.getBoundingClientRect();if(moving!==held)pointer(stick,moving?'pointerdown':'pointerup',91,r.right,r.top+r.height/2);if(press)pointer(jump,'pointerdown',92);}
        if(mode==='controller'){pad.axes[0]=moving?1:0;pad.buttons[0].pressed=press;input.pollGamepad();}
        held=moving;g.step(1/60,input.sample());renderer.draw(g,1,1/60);frames++;
        if(mode==='keyboard'&&press)key('Space',false);if(mode==='touch'&&press)pointer(jump,'pointerup',92);
        if(f>5&&h.grounded&&Math.abs(h.y-to.y)<.01){landed=true;break;}
      }
      g.paused=paused;
    }finally{
      for(const code of['KeyD','ShiftLeft','Space'])key(code,false);pointer(stick,'pointercancel',91);pointer(jump,'pointercancel',92);input.clear();stick.setPointerCapture=capture[0];jump.setPointerCapture=capture[1];if(mode==='controller'){Object.defineProperty(navigator,'getGamepads',{configurable:true,value:getPads});input.pollGamepad();}g.enemies=oldEnemies;
    }
    detail={landed,double,frames,mode,tier};
  }
  renderer.draw(g,1,1/60);refresh();event.source.postMessage({type:'royale-vertical-result',request,state:state(),detail},event.origin);
 });
}
