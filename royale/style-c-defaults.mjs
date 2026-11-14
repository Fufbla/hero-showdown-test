import {sanitizeLook} from './appearance.mjs';
// New-character presets only. Existing saved appearances keep their values.
export const STYLE_C_DEFAULTS=Object.freeze({
  male:Object.freeze(sanitizeLook({version:3,name:'Coast Guardian',presentation:'male',skin:'#b97343',eyes:'#855024',hair:'short-locs',hairColor:'#29212b',suit:'#263778',trim:'#e2bf60',capeColor:'#263399',emblem:'star',emblemColor:'#f1ce64',brows:'bold',mouth:'neutral',build:'balanced'})),
  female:Object.freeze(sanitizeLook({version:3,name:'Coast Sentinel',presentation:'female',skin:'#b97343',eyes:'#855024',hair:'curly-ponytail',hairColor:'#382335',suit:'#71328c',trim:'#e2bf60',capeColor:'#7738a0',emblem:'star',emblemColor:'#f1ce64',brows:'bold',mouth:'neutral',build:'balanced'})),
});
export const styleCDefault=presentation=>({...STYLE_C_DEFAULTS[presentation==='female'?'female':'male']});

export const STYLE_C_VIEWS = ['front', 'side', 'back', 'left'];
