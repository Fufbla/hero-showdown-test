// Presentation reads the existing simulation clock. Never writes combat state.
export const VERSION='boss-test-1';
export const REGIONAL_IDS=['trash-monster','bushman','wastelander','giant-scorpion','venomis','atomdust','ultimate-pollution'];
export const LEGENDARY_IDS=['lightning','air','styrodog','sonic','styro','wastelander','venomis','atomdust'];
export const BOSS_IDS=[...REGIONAL_IDS.map(id=>'regional-'+id),...LEGENDARY_IDS.map(id=>'legendary-'+id)];
export const bossId=b=>b?.boss?(b.legendaryId?'legendary-'+b.legendaryId:'regional-'+REGIONAL_IDS[b.region-1]):null;
export const regionId=id=>typeof id==='number'?'regional-'+REGIONAL_IDS[id-1]:LEGENDARY_IDS.includes(id)?'legendary-'+id:id;
const clamp=n=>Math.max(0,Math.min(1,n));
export function attackFamily(shape){return ['melee','sweep'].includes(shape)?'melee':['projectile','bounce','wave'].includes(shape)?'ranged':'ground';}
export function contactReady(b){
 const a=b?.attack;if(!a||b.state!=='active')return false;
 if(a.shape==='leap')return b.age>=a.duration*.98;
 if(b.region===4&&!b.legendary)return b.age>=a.duration*.65||!!a.fired;
 return true;
}
export function spritePose(b,time=0){
 const a=b.attack,stage=b.state,progress=a?clamp(b.age/(stage==='windup'?a.warning:stage==='active'?a.duration:a.recovery)):0;
 let frame=0,family=a?attackFamily(a.shape):'idle';
 if(stage==='dead')frame=11;
 else if(a&&['windup','active','recover'].includes(stage)){
  const base={melee:4,ranged:8,ground:12}[family];
  frame=stage==='windup'?base:stage==='active'?(contactReady(b)?base+1:base):base+2;
 }else if(b.flash>0)frame=7;
 else if(Math.abs(b.x-(b.prevX??b.x))>.015)frame=2+(Math.floor(time*7)%2);
 else frame=Math.floor(time*2.5)%2;
 return {id:bossId(b),frame,family,stage,progress,contact:contactReady(b),face:b.face||-1};
}
// Natural-cue geometry is exposed for collision/readability regression checks.
export function cuePlan(b){
 const a=b?.attack;if(!a||!['windup','active','recover'].includes(b.state))return [];
 const active=contactReady(b),preparing=b.state==='windup'||b.state==='active'&&!active;
 if(['projectile','bounce','wave','barrier'].includes(a.shape))return [{kind:a.shape,active,preparing,source:{x:b.x+b.face*(b.w/2+(b.legendary?12:10)),y:b.y-(b.legendary?75:70)}}];
 if(a.shape==='charge')return [{kind:'charge',active,preparing,source:{x:b.x,y:b.y},zone:active?{x:b.x-b.w/2-18,y:b.y-100,w:b.w+36,h:100}:null}];
 return (a.zones||[]).map(z=>({kind:a.shape,active,preparing,zone:{...z},source:a.shape==='fall'?{x:z.x+z.w/2,y:90}:null}));
}
