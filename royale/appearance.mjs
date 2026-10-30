// Appearance is presentation only. Physics and combat never read these values.
export const APPEARANCE_VERSION = 2;
export const EMBLEMS = ['leaf', 'bolt', 'shield', 'star', 'wave', 'sun'];
export const HAIR_STYLES = ['curls', 'locs', 'short', 'waves', 'ponytail', 'braids', 'none'];
export const DEFAULT_LOOK = Object.freeze({
  version: APPEARANCE_VERSION, name: 'Coast Guardian', presentation: 'male', age: 'young',
  skin: '#a96943', eyes: '#65452e', hair: 'curls', hairColor: '#2c2630',
  face: 'oval', eyeShape: 'almond', brows: 'soft', nose: 'straight', mouth: 'smile', facialHair: 'none',
  build: 'balanced', height: 1, shoulders: 1, muscle: .35, torso: 1, arms: 1, legs: 1,
  suit: '#247e69', trim: '#ffe0a0', emblemColor: '#ffe0a0', emblem: 'leaf', capeColor: '#194e4c', cape: true,
});
export const LOOK_OPTIONS = Object.freeze({
  presentation: ['male', 'female'], age: ['teen', 'young', 'older'], build: ['slender', 'balanced', 'strong', 'full'],
  hair: HAIR_STYLES, face: ['oval', 'round', 'angular'], eyeShape: ['almond', 'round', 'wide'],
  brows: ['soft', 'straight', 'bold'], nose: ['small', 'straight', 'broad'], mouth: ['neutral', 'smile', 'full'],
  facialHair: ['none', 'stubble', 'beard'], emblem: EMBLEMS,
});
export const LOOK_RANGES = Object.freeze({height:[.88,1.12],shoulders:[.8,1.2],muscle:[0,1],torso:[.85,1.15],arms:[.85,1.15],legs:[.85,1.15]});
export const COLOR_FIELDS = ['skin','eyes','hairColor','suit','trim','emblemColor','capeColor'];
export const validColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
export function validateName(value) {
  if (typeof value !== 'string') return {ok:false,name:'',error:'Enter a hero name.'};
  const name=value.normalize('NFC').trim().replace(/ +/g,' '), length=[...name].length;
  if (!length) return {ok:false,name,error:'Enter a hero name.'};
  if (length<2||length>22) return {ok:false,name,error:'Use 2–22 characters.'};
  if (!/^[\p{L}\p{M}\p{N} '\u2019-]+$/u.test(name)||!/[\p{L}]/u.test(name)) return {ok:false,name,error:'Use letters, numbers, spaces, apostrophes or hyphens, with at least one letter.'};
  return {ok:true,name,error:''};
}
export function sanitizeLook(raw = {}) {
  if (!raw || typeof raw !== 'object') raw={};
  const result={...DEFAULT_LOOK};
  const checked=validateName(raw.name);
  result.name=checked.ok?checked.name:DEFAULT_LOOK.name;
  for(const [key,values] of Object.entries(LOOK_OPTIONS)) if(values.includes(raw[key]))result[key]=raw[key];
  for(const [key,[min,max]] of Object.entries(LOOK_RANGES)){
    const n=Number(raw[key]);if(raw[key]!==undefined&&Number.isFinite(n))result[key]=Math.min(max,Math.max(min,n));
  }
  for(const key of COLOR_FIELDS)if(validColor(raw[key]))result[key]=raw[key].toLowerCase();
  // The old accent was also the emblem color. Retain that relationship on migration.
  if(!validColor(raw.emblemColor)&&validColor(raw.trim))result.emblemColor=raw.trim.toLowerCase();
  result.cape=typeof raw.cape==='boolean'?raw.cape:DEFAULT_LOOK.cape;
  return result;
}
export const STARTER_OUTFIT=Object.freeze({id:'starter-basic',origin:'starter'});
export const canRecolorOutfit = outfit => outfit?.id==='starter-basic'&&outfit?.origin==='starter';
export function sanitizeOutfit(raw) {
  if(!raw||canRecolorOutfit(raw))return {...STARTER_OUTFIT};
  // Boundary for future fixed-color items; no equipment catalog or unlock system is added here.
  if(!['purchased','earned','rare','legendary'].includes(raw.origin))return {...STARTER_OUTFIT};
  const palette={};for(const key of ['suit','trim','emblemColor','capeColor'])palette[key]=validColor(raw.palette?.[key])?raw.palette[key]:DEFAULT_LOOK[key];
  return {id:String(raw.id||'fixed-outfit').slice(0,80),origin:raw.origin,palette};
}
export function costumePalette(look,outfit=STARTER_OUTFIT){
  outfit=sanitizeOutfit(outfit);
  return canRecolorOutfit(outfit)?{suit:look.suit,trim:look.trim,emblemColor:look.emblemColor,capeColor:look.capeColor}:{...sanitizeOutfit(outfit).palette};
}
