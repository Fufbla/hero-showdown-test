// Rendering-only registration. Never stored on a hero or used for equipment stats.
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
export function fittedBodyWidth(p,look,profile,length,span){
  // Torso length must not also enlarge armor horizontally. Use the resting rig
  // so attacks cannot pump the width of the chest, belt or cape clasps.
  const rest=p.m?.arms, shoulders=rest?.length===2?distance(rest[0][0],rest[1][0]):span;
  const baseLength=length/(look.torso||1);
  const width=profile?Math.max(baseLength*.80,Math.min(shoulders*.96,baseLength*1.10)):Math.max(baseLength*1.05,shoulders*1.04);
  return width*(.65+.35*(look.chest||1));
}
export function shoulderRotation(p,side){
  const rest=p.m?.arms?.[side],arm=p.arms?.[side];
  if(!rest||!arm)return 0;
  const angle=chain=>Math.atan2(chain[1][1]-chain[0][1],chain[1][0]-chain[0][0]);
  const delta=angle(arm)-angle(rest);
  return Math.atan2(Math.sin(delta),Math.cos(delta));
}
// Only the outer upper corners of the frontal/rear chest painting are shoulder
// plates. The neck, central breastplate and abdomen stay registered to the torso.
// Profile artwork has an overlapping single pauldron and stays intact.
export function chestLayer(c,pose,a,side,box,paint){
  if(a.profile){if(side==null)paint();return;}
  const [x,y,w,h]=box,wing=w*.24,band=h*.38;
  c.save();
  if(side==null){
    c.beginPath();c.rect(x+wing,y,w-2*wing,band);c.rect(x,y+band,w,h-band);c.clip();paint();
  }else{
    const root=pose.arms[side][0],dx=root[0]-a.shoulder[0],dy=root[1]-a.shoulder[1];
    const cos=Math.cos(a.torsoAngle),sin=Math.sin(a.torsoAngle),rx=dx*cos+dy*sin,ry=-dx*sin+dy*cos;
    const right=rx>0;
    c.translate(rx,ry);c.rotate(shoulderRotation(pose,side)-a.torsoAngle);c.translate(-rx,-ry);
    c.beginPath();c.rect(right?x+w-wing:x,y,wing,band);c.clip();paint();
  }
  c.restore();
}
