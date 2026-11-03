import {AGILITY_REGIONS} from './assets/power-armor/agility/regions.mjs';
import {SPEED_REGIONS} from './assets/power-armor/speed/regions.mjs';
import {SUPER_KICK_REGIONS} from './assets/power-armor/superKick/regions.mjs';
import {WHIRLWIND_REGIONS} from './assets/power-armor/whirlwind/regions.mjs';
import {STRENGTH_REGIONS} from './assets/power-armor/strength/regions.mjs';
import {ROOTS_REGIONS} from './assets/power-armor/roots/regions.mjs';
import {STEEL_REGIONS} from './assets/power-armor/steel/regions.mjs';
import {FIREBALL_REGIONS} from './assets/power-armor/fireball/regions.mjs';

const sheets = new Map();
const pending = new Map();
const regions = {fireball:FIREBALL_REGIONS, steel:STEEL_REGIONS, roots:ROOTS_REGIONS, strength:STRENGTH_REGIONS, whirlwind:WHIRLWIND_REGIONS, superKick:SUPER_KICK_REGIONS, speed:SPEED_REGIONS, agility:AGILITY_REGIONS};

function loadImage(url) {
  return new Promise((resolve,reject)=>{
    const img=new Image();img.onload=()=>resolve(img);
    img.onerror=()=>reject(Error('Missing armor sheet '+url.pathname.split('/').pop()));img.src=url.href;
  });
}
export function prepareArmorCollection(collection,{imageLoader=loadImage}={}) {
  if (!pending.has(collection)) {
    const requests=Object.keys(regions[collection]).map(async id=>{
      const image=await imageLoader(new URL('./assets/power-armor/'+collection+'/'+id+'.webp',import.meta.url));
      sheets.set(collection+'/'+id,image);
    });
    pending.set(collection,Promise.all(requests).then(()=>true).catch(()=>{pending.delete(collection);return false;}));
  }
  return pending.get(collection);
}
export const prepareFireballArt=options=>prepareArmorCollection('fireball',options);
export const prepareSteelArt=options=>prepareArmorCollection('steel',options);

export const prepareRootsArt=options=>prepareArmorCollection('roots',options);
export function armorCollection(item){
  if(item.agilityLevels)return 'agility';
  if(item.speedLevels)return 'speed';
  if(item.superKickLevels)return 'superKick';
  if(item.whirlwindLevels)return 'whirlwind';
  if(item.strengthLevels)return 'strength';
  if(item.rootsLevels)return 'roots';
  if(item.steelLevels)return 'steel';
  if(item.fireballLevels)return 'fireball';
  return null;
}

const parts=['helmet','chest','boots','gloves'];
function sprite(item,part,view) {
  const collection=armorCollection(item);
  const image=sheets.get(collection+'/'+item.art);
  if (!image) return null;
  const rect=regions[collection][item.art][parts.indexOf(part)*3+view];
  return {image,rect};
}

export function drawArmorIcon(c,item,size) {
  const s=sprite(item,item.part||'chest',0);
  if (!s) return false;
  const [, ,w,h]=s.rect, scale=.9*size/Math.max(w,h);
  c.drawImage(s.image,...s.rect,(size-w*scale)/2,(size-h*scale)/2,w*scale,h*scale);
  return true;
}

// Registration is expressed in the posed hero's own coordinates. The shoe cap
// follows the foot angle separately from the greave, especially during kicks.
export function drawArmorPiece(c,part,item,pose,a,side) {
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
  } else if(part==='gloves') {
    // Extend from the original elbow towards the hand, following the punching arm.
    const [,elbow,hand]=pose.arms[side],dx=hand[0]-elbow[0],dy=hand[1]-elbow[1];
    const length=Math.hypot(dx,dy), width=Math.min(length*.87,a.length*.62);
    c.translate(...elbow);c.rotate(Math.atan2(dy,dx)-Math.PI/2);
    if(side===1)c.scale(-1,1);
    c.drawImage(s.image,...s.rect,-width*.5,length*.15,width,length*1.12);
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
