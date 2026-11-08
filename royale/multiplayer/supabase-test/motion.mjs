// Ephemeral presentation only. These packets never enter the game simulation,
// health/reward calculation, inventories or saved snapshots.
export const zoneOf=g=>`${g.regionId}:${g.arenaScene?(g.arenaScene.legendary||'boss'):'world'}`;
const fields={x:10000,y:10000,vx:2000,vy:3000,cycle:1e9,face:1,jumpAge:1e6,landing:10};
export function motionPacket(id,seq,zone,hero,sentAt=Date.now()){
  return {id,seq,zone,sentAt,hero:Object.fromEntries([...Object.keys(fields),'grounded'].map(k=>[k,hero[k]??(k==='grounded'?false:0)]))};
}
export function readMotion(raw){
  if(!raw||typeof raw.id!=='string'||raw.id.length>50||!Number.isSafeInteger(raw.seq)||raw.seq<1||typeof raw.zone!=='string'||raw.zone.length>100||!raw.hero)return null;
  const hero={};for(const [key,max] of Object.entries(fields)){const n=raw.hero[key];if(!Number.isFinite(n)||Math.abs(n)>max)return null;hero[key]=n;}
  if(typeof raw.hero.grounded!=='boolean')return null;hero.grounded=raw.hero.grounded;
  return {id:raw.id,seq:raw.seq,zone:raw.zone,hero,sentAt:raw.sentAt};
}
export const movementHz=players=>Math.min(20,Math.max(4,Math.floor(100/Math.max(2,players)**2)));
export class PeerMotion {
  constructor(){this.peers=new Map();}
  push(raw,known,zone,now=performance.now()){
    const p=readMotion(raw);if(!p||p.zone!==zone||!known.some(h=>h.id===p.id))return false;
    let track=this.peers.get(p.id);
    if(track?.zone!==zone){track={zone,seq:0,samples:[]};this.peers.set(p.id,track);}
    if(p.seq<=track.seq)return false;
    const previous=track.samples.at(-1);if(previous){track.gaps??=[];track.gaps.push(Math.max(0,now-previous.at));if(track.gaps.length>5)track.gaps.shift();const gaps=[...track.gaps].sort((a,b)=>a-b);track.buffer=Math.max(50,Math.min(100,gaps[Math.floor(gaps.length/2)]));}
    track.seq=p.seq;track.samples.push({...p.hero,at:now});if(track.samples.length>8)track.samples.shift();return true;
  }
  sample(peer,zone,now=performance.now()){
    const track=this.peers.get(peer.id),s=track?.samples,last=s?.at(-1);
    if(!last||track.zone!==zone||now-last.at>750)return null;
    // A short interpolation buffer hides arrival jitter. Bounded extrapolation
    // bridges one missed movement packet, then stops instead of drifting away.
    const target=now-(track.buffer||100);let a=s[0],b=last;
    for(let i=1;i<s.length;i++)if(s[i].at>=target){a=s[i-1];b=s[i];break;}else a=s[i];
    let x,y;
    if(target>=last.at){const dt=Math.min(120,target-last.at)/1000;x=last.x+last.vx*dt;y=last.y+(last.grounded?0:last.vy*dt);}
    else {const t=Math.max(0,Math.min(1,(target-a.at)/(b.at-a.at||1)));x=a.x+(b.x-a.x)*t;y=a.y+(b.y-a.y)*t;}
    return {...peer.hero,...last,x,y,prevX:x,prevY:y};
  }
}
