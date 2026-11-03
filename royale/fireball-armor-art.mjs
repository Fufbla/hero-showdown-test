import {FIREBALL_REGIONS} from './assets/power-armor/fireball/regions.mjs';

const sheets = new Map();
let pending;
export function prepareFireballArt({imageLoader}={}) {
  if (!pending) {
    const load=imageLoader || (url=>new Promise((resolve,reject)=>{
      const img=new Image(); img.onload=()=>resolve(img); img.onerror=()=>reject(Error('Missing Fireball armor sheet')); img.src=url.href;
    }));
    pending=Promise.all(Object.keys(FIREBALL_REGIONS).map(async id=>{
      const img=await load(new URL('./assets/power-armor/fireball/'+id+'.webp',import.meta.url));
      sheets.set(id,img);
    })).then(()=>true).catch(()=>{pending=null;return false;});
  }
  return pending;
}

const parts=['helmet','chest','boots'];
function sprite(item,part,view) {
  const image=sheets.get(item.art);
  if (!image) return null;
  const rect=FIREBALL_REGIONS[item.art][parts.indexOf(part)*3+view];
  return {image,rect};
}

export function drawFireballIcon(c,item,size) {
  const s=sprite(item,item.part||'chest',0);
  if (!s) return false;
  const [, ,w,h]=s.rect, scale=.9*size/Math.max(w,h);
  c.drawImage(s.image,...s.rect,(size-w*scale)/2,(size-h*scale)/2,w*scale,h*scale);
  return true;
}

// Registration is expressed in the posed hero's own coordinates. The shoe cap
// follows the foot angle separately from the greave, especially during kicks.
export function drawFireballPiece(c,part,item,pose,a,side) {
  const s=sprite(item,part,a.back?2:a.profile?1:0);
  if (!s) return false;
  const [sx,sy,sw,sh]=s.rect;
  if (part==='helmet') {
    c.translate(...a.face); c.rotate(pose.headTilt||0);
    const w=a.faceWidth*(a.profile?.95:1.14), h=Math.min(w*sh/sw,a.faceWidth*.84);
    c.drawImage(s.image,...s.rect,-w*.50,-a.faceWidth*.15-h,w,h);
  } else if(part==='chest') {
    c.translate(...a.shoulder); c.rotate(a.torsoAngle);
    const w=a.bodyWidth*(a.profile?1.22:1.19), h=a.length*1.21;
    c.drawImage(s.image,...s.rect,-w*.50,-a.length*.23,w,h);
  } else if(part==='boots') {
    const [,knee,ankle]=pose.legs[side],dx=ankle[0]-knee[0],dy=ankle[1]-knee[1];
    const length=Math.hypot(dx,dy), w=Math.min(length*.92,a.length*.70);
    const split=Math.round(sh*.74);
    c.save();c.translate(...knee);c.rotate(Math.atan2(dy,dx)-Math.PI/2);
    c.drawImage(s.image,sx,sy,sw,split+1,-w*.50,-length*.11,w,length*1.14);c.restore();
    if(pose.sole!==side){
      c.translate(...ankle);c.rotate(pose.footAngles?.[side]||0);
      if(!a.profile&&side===1)c.scale(-1,1);
      const foot=Math.min(length*1.12,a.length*.86);
      c.drawImage(s.image,sx,sy+split-1,sw,sh-split+1,-foot*.43,-length*.14,foot,length*.43);
    }
  }
  return true;
}
