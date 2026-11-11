// World-space camera, independent of hero proportions and display pixel density.
export function trackCamera(camera,hero,width,height,dt,{worldWidth=6160,arena=false,reset=false}={}){
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),blend=1-Math.exp(-9*Math.min(.1,Math.max(0,dt)));
  const maxX=Math.max(0,worldWidth-width),maxY=Math.max(0,600-height*.82),minY=arena?0:-600;
  const targetX=clamp(hero.x-width*.38,0,maxX);
  let targetY=camera.y;
  if(hero.y-hero.h<camera.y+height*.27)targetY=hero.y-hero.h-height*.27;
  else if(hero.y>camera.y+height*.68)targetY=hero.y-height*.68;
  targetY=clamp(targetY,minY,maxY);
  if(reset){camera.x=targetX;camera.y=clamp(hero.y-height*.68,minY,maxY);}
  else{camera.x+=(targetX-camera.x)*blend;camera.y+=(targetY-camera.y)*blend;}
  // A long fall must never outrun the camera, even in a narrow landscape viewport.
  camera.y=clamp(camera.y,Math.max(minY,hero.y-height*.9),Math.min(maxY,hero.y-hero.h-height*.08));
  camera.x=clamp(camera.x,0,maxX);camera.y=clamp(camera.y,minY,maxY);
  return camera;
}
export const inView=(x,y,w,h,camera,width,height,pad=100)=>x+w>camera.x-pad&&x<camera.x+width+pad&&y+h>camera.y-pad&&y<camera.y+height+pad;
