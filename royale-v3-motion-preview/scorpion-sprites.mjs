// Regional presentation only. The shared Story rig and combat stay unchanged.
export const SCORPION_SKIN='royale/assets/boss-sprites/atlases/regional-giant-scorpion-parts.png';
export const SCORPION_REVIEW={name:'Giant Scorpion',design:'Venom Crawler',cell:512,anchor:[256,480],referenceHeight:165,states:['idle','walk','claw','clawCombo','sting','stingPattern','hit','defeat']};
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>{n=clamp(n);return n*n*(3-2*n);};
const mix=(a,b,q)=>a+(b-a)*q;

export function scorpionPresentationPose(p,b,rig){
 if(b.state!=='dead')return {...p,phase:b.phase,defeated:false};
 // Lower the abdomen to the floor, keep every supporting foot fixed, relax
 // the pincers and settle the tail into depth. No collision body is moved.
 const q=ease(b.age/.78),body={...p.body,x:0,y:mix(p.body.y,48,q),roll:mix(p.body.roll,.025,q)};
 const legs=p.legs.map((leg,i)=>{const def=rig.legs[i],hip=rig.bodyPoint(def.rest[0],body),foot={...leg.position};return {...leg,position:foot,planted:true,lift:0,joints:rig.legIK(def,hip,foot,body.roll)};});
 const root=rig.bodyPoint({x:640,y:250},body),stinger={x:mix(p.stinger.x,795,q),y:mix(p.stinger.y,555,q)},end={x:stinger.x+65,y:stinger.y-131};
 const solved=rig.solveTail(root,end,p.time,mix(p.tailPlane,0,q),-1,false);
 const claws=p.claws.map(a=>{const v=a.weapon,weapon={...v,y:v.y+q*30,angle:v.angle+v.side*q*.18};return {...rig.clawArm(weapon,body,0),opening:mix(a.opening,0,q),trail:[]};});
 return {...p,body,legs,claws,root,stinger,stingerSocket:end,tail:solved.points,tailPlane:solved.plane,tailFeasible:solved.feasible,phase:b.phase,defeated:true};
}
