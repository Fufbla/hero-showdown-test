// Bounded reusable records. Active references live in the existing projectile
// arrays; releasing a record drops source references and never alters hit rules.
export class ProjectilePool {
 constructor(limit=64){this.limit=limit;this.free=[];this.created=0;this.members=new WeakSet();}
 acquire(values){let p=this.free.pop();if(!p){if(this.created>=this.limit)return null;p={hits:new Set()};this.members.add(p);this.created++;}p.hits.clear();Object.assign(p,{_free:false,x:0,y:0,vx:0,vy:0,life:0,source:null,damage:undefined,color:null,bossShot:false,bounce:0,gravity:0,pierce:0},values);return p;}
 release(p){if(!p||!this.members.has(p)||p._free)return;p._free=true;p.life=0;p.source=null;p.hits.clear();this.free.push(p);}
}
export function compactProjectiles(list,pool,keep=p=>p.life>0){let write=0;for(let i=0;i<list.length;i++){const p=list[i];if(keep(p))list[write++]=p;else pool?.release(p);}list.length=write;}
export function clearProjectiles(list,pool){for(const p of list)pool?.release(p);list.length=0;}
