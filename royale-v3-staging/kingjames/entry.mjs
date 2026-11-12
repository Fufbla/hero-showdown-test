import {isPrototypeContext} from './selection.mjs';
const allowed=isPrototypeContext({pathname:location.pathname,search:location.search,
 parentPath:parent!==window?parent.location.pathname:'',sameOrigin:parent!==window&&parent.location.origin===location.origin});
if(!allowed){location.replace('../');}
else{
 await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('../../assets/animation/motion-core.js',import.meta.url).href;s.onload=resolve;s.onerror=reject;document.head.append(s);});
 await import('../../royale/clothing-catalog-preview.mjs');
 await import('./app.mjs?v=basic-attacks-1');
}
