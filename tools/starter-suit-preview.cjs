// Build an account-free QA screen after the normal release build. Never part of
// publication: a normal release build deletes this temporary output again.
const fs=require('node:fs'),path=require('node:path');
const {runtimePlugin}=require('./build-royale-release.cjs');
const esbuild=require('./release-build/node_modules/esbuild');
const root=path.resolve(__dirname,'..');
const output=path.resolve(root,process.argv[2]||'_site');
async function main(){
 const source=fs.readFileSync(path.join(root,'royale-v3-staging/gameplay/index.html'),'utf8');
 const start=source.indexOf('<section id="creator"'),end=source.indexOf('<section id="pause-menu"',start);
 if(start<0||end<0)throw Error('Creator markup missing');
 const card=source.slice(start,end).replace('class="overlay" hidden','class="overlay"');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Starter suit — isolated creator check</title><link rel="stylesheet" href="royale.css"><link rel="stylesheet" href="interface-controls.css"><style>#tab-body,#panel-body{display:none!important}.overlay{bottom:35px}#review-status{position:fixed;bottom:0;padding:8px 20px;font:13px system-ui;color:#eedca8}#hero-preview{image-rendering:auto}</style></head><body>'+card+'<output id="review-status">Loading artwork…</output><script>Object.defineProperty(window,"localStorage",{get(){throw Error("Storage is disabled in this art preview")}});Object.defineProperty(window,"sessionStorage",{get(){throw Error("Storage is disabled in this art preview")}});</script><script type="module" src="release/starter-review.mjs"></script></body></html>';
 await esbuild.build({absWorkingDir:root,entryPoints:['royale-v3-staging/starter-suit/review.mjs'],outfile:path.join(output,'royale/release/starter-review.mjs'),bundle:true,format:'esm',platform:'browser',target:['es2022'],plugins:[runtimePlugin]});
 fs.writeFileSync(path.join(output,'royale/starter-review.html'),html);
 console.log('Isolated creator preview prepared. No accounts or save APIs are initialized.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
