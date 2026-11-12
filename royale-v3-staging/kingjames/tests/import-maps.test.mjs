import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../../../',import.meta.url);
const origin='https://example.test/hero-showdown-test/';
const entries=['index.html','gameplay/index.html','kingjames/index.html','local-coop/index.html'];
const urlLike=/^(?:\.{1,2}\/|\/|[a-z][a-z\d+.-]*:)/i;

for(const entry of entries){
 test(`${entry}: browser-valid import targets under the GitHub Pages project path`,()=>{
  const path='royale-v3-staging/'+entry;
  const html=readFileSync(new URL(path,root),'utf8');
  const page=new URL(path,origin);
  const base=new URL(html.match(/<base href="([^"]+)"/)?.[1]||page.href,page);
  const {imports}=JSON.parse(html.match(/<script type="importmap">(.*?)<\/script>/s)[1]);
  const resolved=new Map();
  for(const [key,value] of Object.entries(imports)){
   // URL(value, base) alone accepts bare paths that browsers reject in import maps.
   assert.match(value,urlLike,`${path}: ${key} has a bare import-map target: ${value}`);
   const target=new URL(value,base);
   assert.equal(target.origin,page.origin);
   assert.ok(target.pathname.startsWith('/hero-showdown-test/'),`${path}: target escapes the project path`);
   if(urlLike.test(key))resolved.set(new URL(key,base).href,target);
  }
  for(const module of ['powers.mjs','eris-ui.mjs','cloud-validation.mjs','local-coop/serialize.mjs','equipment.mjs','hero-art.mjs','local-coop/app.mjs']){
   const shared=new URL('royale/'+module,origin);
   const target=resolved.get(shared.href);
   assert.ok(target,`${path}: missing shared module ${module}`);
   assert.equal(target.pathname,new URL('royale-v3-staging/gameplay/'+(module==='local-coop/app.mjs'?'local-coop-app.mjs':module.split('/').at(-1)),origin).pathname);
  }
 });
}
