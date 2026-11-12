// Presentation-only selection. Nothing in this module writes an account or save.
export const TEST_CODE='0000000000';
export const OUTFIT_ID='kingjames-original';
export const TEST_PREFIX='royale-v2-prototype-'+TEST_CODE+':';
export function isPrototypeContext({pathname,search,parentPath,sameOrigin=true}={}){
 const p=new URLSearchParams(search||'');
 return sameOrigin&&/\/royale-v3-staging\/kingjames\/(?:index\.html)?$/.test(pathname||'')&&
  /\/royale-v3-staging\/(?:index\.html)?$/.test(parentPath||'')&&p.get('v2TestCharacter')===TEST_CODE;
}
export const isKingJames=look=>String(look?.name||'').trim().toLowerCase()==='kingjames';
export const selectedOutfit=(enabled,look)=>enabled&&isKingJames(look)?OUTFIT_ID:null;
export function kingJamesLook(base){return {...base,name:'KingJames',hair:'none',facialHair:'beard',
 skin:'#a96943',eyes:'#65452e',hairColor:'#211c20',brows:'bold',eyeShape:'almond',mouth:'neutral',
 suit:'#b91c2e',trim:'#20212b',emblemColor:'#f3e8df',cape:false,
 build:'balanced',height:1,shoulders:1,torso:1,arms:1,legs:1,waist:1,hips:1,chest:1,jaw:1};}
// Never replace a populated slot, including a non-KingJames test hero.
export function prototypeSlot(slots){
 const existing=slots.findIndex(s=>s&&isKingJames(s.snapshot?.look));
 return existing>=0?{index:existing,create:false}:{index:slots.findIndex(s=>!s),create:true};
}
