/* Deterministic scene model. No DOM, graphics, audio or frame-rate dependency. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HealthiaCaveCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DEFAULTS = Object.freeze({duration:105, outro:3.4, warning:1.02, fall:.72, attack:.35, cooldown:.16, hearts:3, invulnerability:.7, step:1/120,steerSpeed:5.2});
  const VEE_COLLISION_RADIUS=.57;
  const CHARACTERS=Object.freeze({summy:{name:'SUPER SUMMY',mode:'whirlwind'},sadie:{name:'SUPER SADIE',mode:'punch'},vee:{name:'SUPER VEE',mode:'dodge'}});
  function characterId(value){return typeof value==='number'?['summy','sadie','vee'][value]||'summy':Object.hasOwn(CHARACTERS,String(value).toLowerCase())?String(value).toLowerCase():'summy';}
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function deadzoneAxis(value,deadzone=.16){if(!Number.isFinite(value))return 0;const a=clamp(value,-1,1);return Math.abs(a)<=deadzone?0:Math.sign(a)*(Math.abs(a)-deadzone)/(1-deadzone);}
  function gamepadSteering(pads){let axis=0;for(const p of pads||[]){if(!p||p.connected===false)continue;const b=i=>!!(p.buttons[i]?.pressed||p.buttons[i]?.value>.5),left=b(14),right=b(15),a=left||right?Number(right)-Number(left):deadzoneAxis(p.axes?.[0]||0);if(Math.abs(a)>Math.abs(axis))axis=a;}return axis;}
  function random(seed) {let s=seed>>>0;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
  function phaseAt(t,duration=DEFAULTS.duration){return t<duration/7?0:t<duration*.48?1:2;}
  function speedAt(t,duration=DEFAULTS.duration,character='summy'){return (6.4+4.4*Math.pow(clamp(t/duration,0,1),.8))*(character==='vee'?1.2:1);}
  function outroOpacity(age,duration=DEFAULTS.outro){const u=clamp((age-.8)/Math.max(.1,duration-1.4),0,1);return u*u*(3-2*u);}
  function buildSchedule(config,seed){
    if(config.character==='sadie')return buildPunchSchedule(config,seed);
    if(config.character==='vee')return buildDodgeSchedule(config,seed);
    const rng=random(seed),rows=[];let t=2.4,wave=0,last=-1;
    while(t<config.duration-2){
      const phase=phaseAt(t,config.duration),u=clamp(t/config.duration,0,1);
      const warning=config.warning*(1-.45*u),fall=config.fall*(1-.49*u);
      const count=phase===0?2:phase===1?(wave%3===2?3:2):(wave%4===1?2:3);
      let lanes=[0,1,2];for(let i=2;i>0;i--){const j=Math.floor(rng()*(i+1));[lanes[i],lanes[j]]=[lanes[j],lanes[i]];}
      if(wave===0)lanes=[0,2,1];
      else if(wave===1)lanes=[1,0,2];
      else if(lanes[0]===last)lanes.push(lanes.shift());
      if(count===3&&wave%2===0)lanes=[0,1,2];
      const spacing=.10-.045*u,end=t+(count-1)*spacing+warning+fall;
      // Keep each wave whole: at least two distinct lanes, with overlapping falls.
      // A short clear gap between waves prevents unreadable same-lane stacks.
      if(end>config.duration-.65)break;
      for(let k=0;k<count;k++){
        const lane=lanes[k],spawn=t+k*spacing;
        rows.push({lane,spawn,warning,fall,phase,wave,kind:'stalactite'});last=lane;
      }
      t=end+.32-.18*u+rng()*.07;wave++;
    }
    rows.sort((a,b)=>a.spawn-b.spawn);return rows.map((r,id)=>Object.assign({id},r));
  }
  function buildPunchSchedule(config,seed){
    const rng=random(seed),rows=[];let t=2.4,id=0;
    while(t<config.duration-1.5){const u=t/config.duration,phase=phaseAt(t,config.duration),warning=.85-.28*u,fall=.72-.28*u;
      if(t+warning+fall>config.duration-.65)break;
      rows.push({id:id++,lane:1,spawn:t,warning,fall,phase,wave:id,punchWindow:fall*.44});
      t+=warning+fall+.33-.2*u+rng()*.1;
    }return rows;
  }
  function buildDodgeSchedule(config,seed){
    const rng=random(seed),rows=[];let t=2.4,id=0,wave=0,lastSafe=1;
    // Ground obstacles are visible for their entire approach. There is no ceiling or falling phase.
    while(t<config.duration-1.5){const u=t/config.duration,phase=phaseAt(t,config.duration),warning=0,fall=0,approach=1.8-.65*u;
      if(t+approach>config.duration-.65)break;
      const choices=[0,1,2].filter(lane=>lane!==lastSafe),safe=wave===0?0:choices[Math.floor(rng()*choices.length)];
      const blocked=[0,1,2].filter(lane=>lane!==safe);
      for(const lane of blocked)rows.push({id:id++,lane,spawn:t,warning,fall,approach,ground:true,phase,wave,safeLanes:[safe]});
      lastSafe=safe;t+=approach+.23-.12*u;wave++;
    }return rows;
  }
  class Model {
    constructor(options={}) {this.config=Object.assign({},DEFAULTS,options);this.character=characterId(options.character);this.config.character=this.character;this.seed=options.seed??1992;this.reset();}
    reset(){
      this.lane=1;this.lanePosition=1;this.previousLanePosition=1;this.steerAxis=0;this.lateralVelocity=0;this.dodged=0;this.punchCooldown=0;this.time=0;this.outroAge=0;this.distance=0;this.speed=speedAt(0,this.config.duration,this.character);this.hearts=this.config.hearts;this.state='ready';this.phase=0;
      this.schedule=buildSchedule(this.config,this.seed);this.next=0;this.rocks=[];this.attacks=[];this.events=[];
      this.cooldown=0;this.laneCooldowns=[0,0,0];this.invulnerable=0;this.destroyed=0;this.missed=0;this.hitCount=0;this.combo=0;this.bestCombo=0;this.inputs=0;this.wrong=0;this.attackPose=null;this.poseUntil=0;
    }
    start(){if(this.state==='ready')this.state='running';}
    pause(){if(this.state==='running'){this.state='paused';this.steerAxis=0;this.lateralVelocity=0;}}
    resume(){if(this.state==='paused')this.state='running';}
    emit(type,data={}){this.events.push(Object.assign({type,time:this.time},data));}
    drain(){const out=this.events;this.events=[];return out;}
    attack(lane){
      if(this.character!=='summy'||this.state!=='running'||!Number.isInteger(lane)||lane<0||lane>2||this.laneCooldowns[lane]>1e-8)return false;
      this.inputs++;this.cooldown=this.config.cooldown;this.laneCooldowns[lane]=this.config.cooldown;this.attackPose=lane;this.poseUntil=this.time+this.config.attack;
      const target=this.rocks.filter(r=>r.lane===lane&&!r.resolved&&r.hitAt===null).sort((a,b)=>a.impactAt-b.impactAt)[0];
      const attack={lane,start:this.time,end:this.time+this.config.attack,targetId:target?.id??null};
      if(target){target.hitAt=this.time+.14;target.acceptedAt=this.time;}else this.wrong++;
      this.attacks.push(attack);this.emit('attack',{lane,targetId:attack.targetId});return true;
    }
    input(lane){return this.character==='vee'?false:this.character==='sadie'?(lane===1&&this.punch()):this.attack(lane);}
    steer(axis){
      if(this.character!=='vee'||this.state!=='running')return false;
      const next=Number.isFinite(axis)?clamp(axis,-1,1):0;if(next===this.steerAxis)return false;
      if(next&&Math.sign(next)!==Math.sign(this.steerAxis)){this.inputs++;this.emit('dodge',{direction:Math.sign(next),position:this.lanePosition});}
      this.steerAxis=next;if(!next)this.lateralVelocity=0;return true;
    }
    punch(){
      if(this.character!=='sadie'||this.state!=='running'||this.punchCooldown>1e-8)return false;
      this.inputs++;this.punchCooldown=.23;this.attackPose=1;this.poseUntil=this.time+.35;
      const target=this.rocks.find(r=>!r.resolved&&r.hitAt===null&&this.time>=r.punchAt&&this.time<r.impactAt);
      const contact=target?this.time+.09:null;
      if(target){target.hitAt=contact;target.acceptedAt=this.time;}else this.wrong++;
      this.attacks.push({lane:1,kind:'punch',start:this.time,end:this.time+.35,targetId:target?.id??null});this.emit('punch',{targetId:target?.id??null});return true;
    }
    tick(dt){
      dt=clamp(dt,0,.05);
      if(this.state==='outro'){
        // Continue through the tunnel and keep animating until the screen is fully black.
        this.outroAge=Math.min(this.config.outro,this.outroAge+dt);this.distance+=dt*this.speed;
        if(this.outroAge>=this.config.outro){this.state='complete';this.emit('complete',{destroyed:this.destroyed,hearts:this.hearts});}
        return;
      }
      if(this.state!=='running')return;
      // The scene calls fixed ticks. Smaller steps also work in deterministic tests.
      this.time+=dt;this.punchCooldown=Math.max(0,this.punchCooldown-dt);
      if(this.character==='vee'){
        this.previousLanePosition=this.lanePosition;this.lanePosition=clamp(this.lanePosition+this.steerAxis*this.config.steerSpeed*dt,0,2);
        this.lateralVelocity=dt?(this.lanePosition-this.previousLanePosition)/dt:0;this.lane=Math.round(this.lanePosition);
      }
      this.phase=phaseAt(this.time,this.config.duration);
      this.speed=speedAt(this.time,this.config.duration,this.character);this.distance+=dt*this.speed;
      this.cooldown=Math.max(0,this.cooldown-dt);this.laneCooldowns=this.laneCooldowns.map(c=>Math.max(0,c-dt));this.invulnerable=Math.max(0,this.invulnerable-dt);
      while(this.next<this.schedule.length&&this.schedule[this.next].spawn<=this.time){
        const row=this.schedule[this.next++],rock=Object.assign({},row,{fallAt:row.spawn+row.warning,impactAt:row.spawn+row.warning+row.fall+(row.approach||0),punchAt:row.spawn+row.warning+row.fall-(row.punchWindow||.6),state:row.ground?'ground':'warning',resolved:false,hitAt:null,spawnDistance:this.distance-(this.time-row.spawn)*this.speed,spawnSpeed:this.speed});
        this.rocks.push(rock);this.emit(row.ground?'obstacle':'warning',{id:rock.id,lane:rock.lane});
      }
      for(const rock of this.rocks){
        if(rock.resolved)continue;
        if(rock.hitAt!==null&&this.time>=rock.hitAt){
          rock.resolved=true;rock.state='shattered';rock.resolvedAt=this.time;
          this.destroyed++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);this.emit('shatter',{id:rock.id,lane:rock.lane});continue;
        }
        if(this.time>=rock.fallAt&&rock.state==='warning'){rock.state='falling';this.emit('fall',{id:rock.id,lane:rock.lane});}
        // An accepted timely attack owns its target, even when its visual arrives just after impact time.
        if(this.time>=rock.impactAt&&rock.hitAt===null){
          // Sweep the continuous position to the exact contact instant, not a rounded lane.
          const contactFraction=dt?clamp((rock.impactAt-(this.time-dt))/dt,0,1):1;
          const contactX=this.previousLanePosition+(this.lanePosition-this.previousLanePosition)*contactFraction;
          if(this.character==='vee'&&Math.abs(contactX-rock.lane)>VEE_COLLISION_RADIUS){rock.resolved=true;rock.state='passed';rock.resolvedAt=this.time;this.dodged++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);this.emit('pass',{id:rock.id,lane:rock.lane});continue;}
          rock.resolved=true;rock.state='impact';rock.resolvedAt=this.time;this.missed++;this.combo=0;
          const hurt=this.invulnerable<=1e-8;
          if(hurt){this.hearts=Math.max(0,this.hearts-1);this.invulnerable=this.config.invulnerability;this.hitCount++;}
          this.emit('impact',{id:rock.id,lane:rock.lane,hurt});
          if(!this.hearts){this.state='defeat';this.attackPose=null;this.attacks=[];this.steerAxis=0;this.lateralVelocity=0;this.emit('defeat');break;}
        }
      }
      this.rocks=this.rocks.filter(r=>!r.resolved||this.time-r.resolvedAt<.8);
      this.attacks=this.attacks.filter(a=>a.end>this.time);
      if(this.poseUntil<=this.time)this.attackPose=null;
      if(this.state==='running'&&this.time>=this.config.duration&&this.rocks.every(r=>r.resolved)){
        this.state='outro';this.outroAge=0;this.attackPose=null;this.attacks=[];this.steerAxis=0;this.lateralVelocity=0;this.emit('outro');
      }
    }
    snapshot(){return {character:this.character,lane:this.lane,lanePosition:this.lanePosition,steerAxis:this.steerAxis,lateralVelocity:this.lateralVelocity,dodged:this.dodged,state:this.state,time:this.time,outroAge:this.outroAge,phase:this.phase,hearts:this.hearts,destroyed:this.destroyed,missed:this.missed,hitCount:this.hitCount,progress:clamp(this.time/this.config.duration,0,1),active:this.rocks.filter(r=>!r.resolved).map(r=>({id:r.id,lane:r.lane,state:r.state,remaining:r.impactAt-this.time})),attackPose:this.attackPose};}
  }
  // Hysteresis and neutral-to-press edges prevent repeats while allowing fast direction changes.
  class PadEdges {
    constructor(){this.previous={};this.axes=new Map();}
    reset(){this.previous={};this.axes.clear();}
    sample(pads){
      const now={left:false,up:false,right:false,confirm:false,pause:false,back:false};
      const seen=new Set();
      for(const p of pads||[]){if(!p)continue;seen.add(p.index);const b=i=>!!(p.buttons[i]?.pressed||p.buttons[i]?.value>.5);
        let a=this.axes.get(p.index)||{x:0,y:0};const x=p.axes[0]||0,y=p.axes[1]||0;
        a.x=Math.abs(x)<.3?0:x<-.6?-1:x>.6?1:a.x;
        a.y=Math.abs(y)<.3?0:y<-.6?-1:y>.6?1:a.y;this.axes.set(p.index,a);
        now.left||=b(14)||a.x===-1;now.right||=b(15)||a.x===1;now.up||=b(12)||a.y===-1;
        now.confirm||=b(0);now.pause||=b(9);now.back||=b(1)||b(8);
      }
      for(const key of this.axes.keys())if(!seen.has(key))this.axes.delete(key);
      const edges=Object.keys(now).filter(k=>now[k]&&!this.previous[k]);this.previous=now;return edges;
    }
  }
  return {Model,PadEdges,DEFAULTS,CHARACTERS,VEE_COLLISION_RADIUS,deadzoneAxis,gamepadSteering,characterId,buildSchedule,buildPunchSchedule,buildDodgeSchedule,phaseAt,speedAt,outroOpacity,random,clamp};
});
