// Build the isolated QA screen after production. Rebuilding production removes it.
const fs=require('node:fs'),path=require('node:path');
const {runtimePlugin}=require('./build-royale-release.cjs');
const esbuild=require('./release-build/node_modules/esbuild');
const root=path.resolve(__dirname,'..'),out=path.join(root,'_site');
const option=(v,label=v)=>`<option value="${v}">${label}</option>`;
const select=(name,options)=>`<label>${name}<select aria-label="${name}" data-setting="${name}">${options.map(v=>Array.isArray(v)?option(...v):option(v)).join('')}</select></label>`;
async function main(){
 await esbuild.build({absWorkingDir:root,entryPoints:['royale/fashion/review/review.mjs'],outfile:path.join(out,'royale/release/fashion-review.mjs'),bundle:true,format:'esm',target:['es2022'],plugins:[runtimePlugin]});
 const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fashion — isolated runtime check</title>
 <style>*{box-sizing:border-box}body{margin:0;background:#f5efe5;color:#28202b;font:16px system-ui}header,main{padding:24px 30px}h1{margin:0 0 8px;font-size:30px}h2{font-size:18px;text-align:center}#status{display:block;margin:12px 0}nav{display:flex;gap:16px;align-items:end;flex-wrap:wrap}label{display:grid;gap:5px}select,button{font:inherit;padding:10px;border:1px solid #aa9da9;border-radius:8px;background:#fff;color:#292030}button{cursor:pointer}button:disabled{opacity:.5}#gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}article{border:1px solid #e0d7c9;border-radius:14px;background:#fffaf1}canvas{display:block;max-width:100%;margin:auto}#store{margin-top:28px;padding:20px;border:1px solid #b5a7bc;border-radius:14px;background:white}.clothing-heading{display:flex;justify-content:space-between}.clothing-layout{display:grid;grid-template-columns:360px 1fr;gap:20px}.clothing-list{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-height:360px;overflow:auto}.clothing-card{text-align:left}small{display:block;font-size:12px;margin-top:6px}.clothing-preview nav{display:flex;gap:4px}.upgrade-confirm{padding:16px;background:#fff3cb}.clothing-detail{padding-top:12px}@media(max-width:750px){#gallery{grid-template-columns:repeat(2,1fr)}.clothing-layout{display:block}.clothing-list{grid-template-columns:repeat(2,1fr)}}
 </style><header><h1>Hero Showdown Royale · Fashion</h1><output id="status">Loading complete poses…</output><nav>
 ${select('motion',['idle','walk','run','jump','doubleJump','punch','kick','strength','superKick','fireball','flight','land','hurt','defeat','steel'])}
 ${select('direction',[['1','Right'],['-1','Left']])}${select('skin',[['#b4774b','Warm brown'],['#59352e','Deep brown'],['#e8c497','Light']])}
 ${select('hair',['braids','ponytail','curls','waves','short','none'])}${select('hairColor',[['#291c20','Dark'],['#a54427','Auburn'],['#f4d395','Blonde']])}<button id="pause">Pause animations</button></nav></header>
 <main><section id="gallery" aria-label="Six outfit animations"></section><h2>Existing store · in-memory purchase fixture</h2><nav><button id="store-open">Clothing Store</button><button id="owned-open">My Outfits</button></nav><section id="store"></section></main>
 <script>for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{get(){throw Error('Storage disabled in isolated preview')}});const originalFetch=window.fetch.bind(window);window.fetch=(url,options)=>{if(new URL(url,location.href).origin!==location.origin)throw Error('External requests disabled in isolated preview');return originalFetch(url,options)};</script><script type="module" src="release/fashion-review.mjs"></script></html>`;
 fs.writeFileSync(path.join(out,'royale/fashion-review.html'),html);
 fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><meta http-equiv="refresh" content="0;url=royale/fashion-review.html"><a href="royale/fashion-review.html">Open isolated fashion check</a>');
 fs.mkdirSync(path.join(root,'.openai'),{recursive:true});fs.writeFileSync(path.join(root,'.openai/hosting.json'),JSON.stringify({static:{directory:'dist'}}));
 fs.rmSync(path.join(root,'dist'),{recursive:true,force:true});
 fs.cpSync(out,path.join(root,'dist'),{recursive:true});
 console.log('Prepared isolated browser check. Production rebuild removes all review pages.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
