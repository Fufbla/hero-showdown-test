// Preview-only network fence. The production entry point never imports this file.
export const PREVIEW_PREFIX='royale-motion-preview-0000000000:';
export const PREVIEW_VERSION='motion-plan-4-8-6-v1';
const here=new URL('./',import.meta.url);
const live=new URL('../royale/',import.meta.url);
const media=/\.(?:png|jpe?g|webp|gif|svg|avif|wav|mp3|ogg|mp4)(?:$|\?)/i;
export function assetURL(value){
 const u=new URL(String(value),document.baseURI);
 // Reuse original world/equipment art read-only; the preview owns all its code.
 if(u.href.startsWith(here.href)&&media.test(u.href)&&!u.href.startsWith(new URL('./motion-assets/',here).href))
   return live.href+u.href.slice(here.href.length);
 return u.href;
}
const src=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
Object.defineProperty(HTMLImageElement.prototype,'src',{...src,set(value){src.set.call(this,assetURL(value));}});
const nativeFetch=window.fetch.bind(window);
window.fetch=(input,init={})=>{
 const raw=input instanceof Request?input.url:String(input),u=new URL(raw,document.baseURI);
 const method=(init.method||(input instanceof Request?input.method:'GET')).toUpperCase();
 if(u.origin!==location.origin||!['GET','HEAD'].includes(method))return Promise.reject(new Error('This motion preview cannot contact or write to cloud accounts.'));
 return nativeFetch(input instanceof Request?new Request(assetURL(u),input):assetURL(u),init);
};
const open=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(method,url,...args){if(new URL(url,document.baseURI).origin!==location.origin||!['GET','HEAD'].includes(String(method).toUpperCase()))throw Error('Cloud requests disabled in motion preview');return open.call(this,method,assetURL(url),...args);};
window.WebSocket=class {constructor(){throw Error('Multiplayer is disabled in the isolated motion preview.');}};
window.__motionIsolation={prefix:PREVIEW_PREFIX,version:PREVIEW_VERSION,cloudWrites:false};
