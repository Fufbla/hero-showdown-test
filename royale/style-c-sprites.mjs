// Two prepared sprite sets accelerate ordinary gameplay. Customized heroes use
// the same illustrated keyframes, anatomical attachments and material layers.
import manifest from './assets/hero/style-c-accurate/sprites/frames.json' with {type:'json'};
import {STYLE_C_DEFAULTS} from './style-c-defaults.mjs';
const pages=[];
let loading;
export function prepareDefaultSprites({imageLoader}){
  if(!loading)loading=Promise.all(manifest.pages.map(async (path,i)=>{
    pages[i]=await imageLoader(new URL('./assets/hero/style-c-accurate/sprites/'+path,import.meta.url));
  })).then(()=>true).catch(()=>{loading=null;return false;});
  return loading;
}
export function defaultSpriteStatus(){return {pages:pages.filter(Boolean).length,expectedPages:manifest.pages.length};}
export function isDefaultLook(look) {
  const base=STYLE_C_DEFAULTS[look.presentation];
  return Object.keys(base).every(key=>key==='name'||base[key]===look[key]);
}
export function drawDefaultSprite(c,p,look) {
  const frame=manifest.characters[look.presentation]?.[p.clip]?.[p.frame];
  if(!frame||!pages[frame[0]])return false;
  const [page,x,y,w,h,pivotX,pivotY]=frame;
  const density=manifest.scale;
  c.drawImage(pages[page],x,y,w,h,-pivotX/density,-pivotY/density,w/density,h/density);
  return true;
}
