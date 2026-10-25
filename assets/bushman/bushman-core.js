/* Bushman's deterministic combat rules. Shared by the game and regression tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BushmanCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const DAMAGE=14,BLAST_DAMAGE=DAMAGE*2,REQUIRED_HITS=4;
 const ATTACKS=Object.freeze({
  punch:{windup:.32,active:.27,contact:.06,recover:.32},
  kick:{windup:.46,active:.35,contact:.08,recover:.42},
  fireball:{windup:.55,active:.32,contact:.06,recover:.48},
  scorch:{windup:.82,active:.34,contact:.06,recover:.62},
  blast:{windup:1.12,active:.62,contact:.08,recover:.82}
 });
 function create(){return {version:1,charge:0,credits:[],serial:0,action:null,time:0,walk:0,moving:false,recoil:0,casts:0,scorchCooldown:0,projectiles:[],zones:[],flares:[]};}
 function credit(s,id,kind,landed,blocked){
  if(!landed||blocked||!['punch','kick','fireball'].includes(kind)||s.credits.includes(id))return false;
  s.credits.push(id);if(s.credits.length>32)s.credits.shift();s.charge=Math.min(REQUIRED_HITS,s.charge+1);return true;
 }
 function begin(s,kind,face,target){
  if(s.action||!ATTACKS[kind]||(kind==='blast'&&s.charge<REQUIRED_HITS))return false;
  s.action={kind,age:0,id:++s.serial,face:face>0?1:-1,target,released:false};return true;
 }
 function stage(a){if(!a)return 'idle';const p=ATTACKS[a.kind];return a.age<p.windup?'windup':a.age<p.windup+p.active?'active':'recover';}
 function advance(s,dt){
  const a=s.action;if(!a||!(dt>0))return [];
  const p=ATTACKS[a.kind],events=[];a.age+=dt;
  if(!a.released&&a.age+1e-9>=p.windup+p.contact){
   a.released=true;
   if(a.kind==='blast'){
    if(s.charge<REQUIRED_HITS){s.action=null;return [];}
    s.charge=0;
   }
   events.push({...a});
  }
  if(a.age+1e-9>=p.windup+p.active+p.recover)s.action=null;
  return events;
 }
 function cancel(s){s.action=null;s.moving=false;}
 function segmentHit(x0,x1,y,r,h){return Math.max(x0,x1)+r>=h.x-36&&Math.min(x0,x1)-r<=h.x+36&&y+r>=h.y-220&&y-r<=h.y-22;}
 function meleeHit(x,face,reach,above,h){const d=(h.x-x)*face;return d>=-20&&d<=reach+36&&604-above>=h.y-220&&604-above<=h.y-22;}
 function blastHit(x,face,h){const d=(h.x-x)*face;return d>=-25&&d<=595&&h.y>604-300;}
 function zoneHit(z,h){return Math.abs(h.x-z.x)<z.radius+24&&h.y>604-45;}
 function snapshot(s){return JSON.parse(JSON.stringify(s));}
 function valid(s){
  if(!s||s.version!==1||!Number.isInteger(s.charge)||s.charge<0||s.charge>4||!Number.isFinite(s.time)||!Number.isFinite(s.walk)||!Number.isFinite(s.serial))return false;
  if(s.action&&(!ATTACKS[s.action.kind]||!Number.isFinite(s.action.age)||!Number.isFinite(s.action.target)||![-1,1].includes(s.action.face)))return false;
  return ['credits','projectiles','zones','flares'].every(k=>Array.isArray(s[k])&&s[k].length<=(k==='credits'?32:k==='zones'?1:32))&&s.projectiles.every(p=>['ball','seed'].includes(p.kind)&&['x','y','life','age','sx','sy','target'].every(k=>Number.isFinite(p[k]))&&[-1,1].includes(p.face))&&s.zones.every(z=>['x','life','radius','tick'].every(k=>Number.isFinite(z[k])))&&s.flares.every(f=>['x','y','life','max','face'].every(k=>Number.isFinite(f[k])));
 }
 return {DAMAGE,BLAST_DAMAGE,REQUIRED_HITS,ATTACKS,create,credit,begin,stage,advance,cancel,segmentHit,meleeHit,blastHit,zoneHit,snapshot,valid};
});
