// Reposition a complete authored body frame; never animate individual limbs or
// change the saved hero. Steel keeps its authored flight; regular costume
// engines can also reposition their older upright flight frames.
export function flightPose(hero,manifest,frame,time=0,{authored=false}={}){
 if(!hero.flying||hero.grounded||hero.steel||hero.dead||hero.stun>0||hero.respawnAge<.6||(!authored&&manifest.animations.fly))return null;
 const angle=.75,cos=Math.cos(angle),sin=Math.sin(angle),[nx,ny]=frame.head;
 const anchor=[manifest.foot[0]+35,manifest.foot[1]-94+Math.sin(time*3)*1.5];
 const point=p=>[anchor[0]+(p[0]-nx)*cos-(p[1]-ny)*sin,anchor[1]+(p[0]-nx)*sin+(p[1]-ny)*cos];
 return {angle,anchor,point,head:[...anchor,.06],apply(c){c.translate(...anchor);c.rotate(angle);c.translate(-nx,-ny);}};
}
