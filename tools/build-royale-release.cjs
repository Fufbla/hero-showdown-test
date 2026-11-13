// Package the approved V3 graph at the existing /royale/ URL. Source review and
// developer tools stay in Git; the deployment receives only bundled runtime code.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const esbuild=require('./release-build/node_modules/esbuild');
const transform=require('./release-build/transform.cjs');
const fashionMap=require('./release-build/fashion-map.cjs');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(root,'_site'));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>{const f=path.join(out,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s);};
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const map=JSON.parse(read('royale-v3-staging/kingjames/index.html').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
const mappings=new Map();
for(const [from,to] of Object.entries(map)){
  if(from.includes('?'))continue;
  mappings.set(new URL(from,'https://build.test/royale/').pathname.slice(1),new URL(to,'https://build.test/royale/').pathname.slice(1));
}
mappings.delete('royale/app.mjs');
mappings.set('royale/renderer.mjs','royale-v3-staging/kingjames/renderer.mjs');
mappings.set('royale/hero-art.mjs','royale/release-src/presentation.mjs');

const sourceHashes={};
const runtimePlugin={name:'approved-v3-release',setup(build){
  build.onResolve({filter:/^[./]/},args=>{
    const original=path.resolve(args.resolveDir||root,args.path.split('?')[0]);
    let rel=path.relative(root,original).replaceAll(path.sep,'/');
    if(rel.startsWith('../'))throw Error('Import escapes project: '+rel);
    // Fallback adapters deliberately import the underlying shared implementation.
    if(!/[?&](?:costume-base|fashion-base|bossFallback)=1/.test(args.path)){
      rel=mappings.get(rel)||rel;rel=fashionMap[rel]||rel;
    }
    if(/\/(?:tests?|qa|backend-v3)\//.test(rel)||/(?:practice|launcher|outfit-wardrobe|v2-test-hero|boss-qa|input-qa|vertical-qa|legendary-qa|phase10-qa)\.mjs$/.test(rel))throw Error('Developer module entered release: '+rel);
    return {path:path.join(root,rel)};
  });
  build.onLoad({filter:/\.m?js$/},args=>{
    const rel=path.relative(root,args.path).replaceAll(path.sep,'/'),source=fs.readFileSync(args.path,'utf8');
    sourceHashes[rel]=hash(source);
    let contents=transform(rel,source);
    // Every chunk is directly in /royale/release/. Preserve source-relative asset
    // URLs, including manifests, without publishing the source module itself.
    contents=contents.replaceAll('import.meta.url',`new URL(${JSON.stringify('../../'+rel)},import.meta.url).href`);
    return {contents,loader:'js',resolveDir:path.dirname(args.path)};
  });
}};
const skipDirs=new Set(['.git','.github','dist','_site','node_modules','docs','review','tools','tests','test','qa','backend','backend-v3','release-src','scorpion-test-qa']);
function copyPublic(dir='',restricted=false){
  for(const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){
    const rel=path.posix.join(dir,entry.name),parts=rel.split('/');
    if(rel==='royale/multiplayer')continue;
    if(skipDirs.has(entry.name)||entry.name.startsWith('.')&&entry.name!=='.nojekyll')continue;
    if(parts[0].startsWith('royale-')&&parts[0]!=='royale-v3-staging')continue;
    if(entry.isDirectory()){copyPublic(rel,restricted||['royale','royale-v3-staging'].includes(parts[0]));continue;}
    if(/\.(?:md|txt|command|bat|py|sha256|zip)$/.test(rel)||/^(?:PACKAGE-MANIFEST|MANIFEST)/.test(entry.name))continue;
    if(restricted&&/\.(?:mjs|cjs|html|ts)$/.test(rel))continue;
    if(restricted&&entry.name.endsWith('.json')&&!/(?:\/assets\/|\/outfits\/|\/effects\/|\/transforms\/|\/portals\/)/.test(rel)&&rel!=='royale/local-coop/config.json')continue;
    if(!restricted&&/(?:test|review)\.html$/.test(rel))continue;
    if(restricted&&/(?:character-test|v2-sprites\/generated)/.test(rel))continue;
    const dest=path.join(out,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,rel),dest);
  }
}
function shell(html,base,script){
  html=html.replace(/<base href="[^"]+">/,'<base href="'+base+'">');
  html=html.replace(/<script type="importmap">[\s\S]*?<\/script>/g,'');
  html=html.replace(/<script type="module" src="[^"]+"><\/script>/g,'');
  html=html.replace(/<span class="phase-label">[\s\S]*?<\/span>/g,'');
  html=html.replace(/<aside id="qa-tools"[\s\S]*?<\/aside>/g,'');
  html=html.replace(/<p class="roster-cache-note">[\s\S]*?<\/p>/g,'');
  html=html.replace(/<p id="demo-note"[^>]*>[\s\S]*?<\/p>/g,'');
  html=html.replace(/<output id="(?:diagnostics|performance-result)"[^>]*>[\s\S]*?<\/output>/g,'');
  html=html.replace(/<pre id="diagnostics"[^>]*>[\s\S]*?<\/pre>/g,'');
  html=html.replace(/<a [^>]*href="tests\/[^>]*>[\s\S]*?<\/a>/g,'');
  html=html.replace(/<button [^>]*id="measure-performance"[^>]*>[\s\S]*?<\/button>/g,'');
  html=html.replaceAll('V3 cloud hero','hero').replaceAll('V3 cloud','cloud');
  html=html.replace(/(?:Style C|MOBILE PLAYTEST|V3 Test|FULL-BODY SPRITE PROTOTYPE)/g,'Action-Chibi');
  html=html.replace(/<script src="[^\"]*motion-core.js[^\"]*"><\/script>/g,'');
  html=html.replace('</head>',`<style>#pause-primary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#pause-primary button{min-height:48px;margin:0;width:100%}@media(max-width:480px){#pause-primary{grid-template-columns:1fr}}#tab-body,#panel-body{display:none!important}</style></head>`);
  return html.replace('</body>',`<script src="../assets/animation/motion-core.js"></script><script type="module" src="${script}"></script></body>`);
}
async function build(){
  if(out===root||!path.relative(root,out)||out.includes('/.git'))throw Error('Unsafe output directory');
  fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});copyPublic();
  const result=await esbuild.build({absWorkingDir:root,entryPoints:{game:'royale/release-src/game-entry.mjs',coop:'royale/release-src/coop-entry.mjs',cloud:'royale-v3-staging/app.mjs','json-worker':'royale/local-coop/json-worker.mjs'},outdir:path.join(out,'royale/release'),outExtension:{'.js':'.mjs'},chunkNames:'shared-[hash]',bundle:true,splitting:true,format:'esm',platform:'browser',target:['es2022'],minifySyntax:true,minifyWhitespace:false,legalComments:'none',drop:['console','debugger'],metafile:true,plugins:[runtimePlugin]});
  let home=read('royale-v3-staging/index.html');
  home=home.replace(/<script type="importmap">[\s\S]*?<\/script>/g,'').replace(/<script type="module" src="[^"]+"><\/script>/g,'');
  home=home.replace('Hero Showdown Royale V3 Test','Hero Showdown Royale').replace('V3 isolated test — original saves remain untouched.','');
  home=home.replace(/<small>\s*<\/small>/g,'').replace(/<button id="local-coop"/,'<button id="local-coop"');
  home=home.replace(/location.href='[^']*local-coop[^']*'/,"location.href='./local-coop/'");
  home=home.replace('</section>',`<button type="button" onclick="location.href='./gameplay/'">HEROES ON THIS BROWSER</button></section>`);
  home=home.replace('</body>','<script type="module" src="./release/cloud.mjs"></script></body>');
  home=home.replace(/<p>V3[^<]*<\/p>/g,'');
  write('royale/index.html',home);
  write('royale/gameplay/index.html',shell(read('royale-v3-staging/gameplay/index.html'),'../','./release/game.mjs'));
  let coopHTML=shell(read('royale-v3-staging/local-coop/index.html'),'./','../release/coop.mjs');
  // Co-op base remains /royale/local-coop/, one level deeper than the solo base.
  coopHTML=coopHTML.replace('src="../assets/animation/motion-core.js"','src="../../assets/animation/motion-core.js"');
  write('royale/local-coop/index.html',coopHTML);
  write('royale-v3-staging/index.html','<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hero Showdown Royale</title><meta http-equiv="refresh" content="0;url=../royale/"><a href="../royale/">Open Hero Showdown Royale</a>');
  let index=read('index.html').replace('href="./royale-v3-staging/"','href="./royale/"').replace('Open Hero Showdown Royale V3 in a new browser tab','Open Hero Showdown Royale in a new browser tab');write('index.html',index);
  write('.nojekyll','');
  const sha=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const {COLLECTION}=await import('../royale/fashion/catalog.mjs');
  const costumes={count:COLLECTION.length,ids:COLLECTION.map(o=>o.id),price:700};
  const manifest={version:1,productionReady:require('./release-build/readiness.json').productionReady,sourceCommit:sha,sourceTreeDirty:!!cp.execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'}).trim(),sourceHashes,entrypoints:['royale/index.html','royale/gameplay/index.html','royale/local-coop/index.html'],bundles:Object.fromEntries(Object.entries(result.metafile.outputs).map(([p])=>{const rel=path.relative(out,path.resolve(root,p));return [rel,hash(fs.readFileSync(path.join(out,rel)))];})),saveContract:{endpoint:'royale-v3-staging',profileKey:'healthia.royale.profiles.v2',cloudPrefix:'royale-v3-play:',databaseMigration:false},developerTools:false,modes:{singlePlayer:true,localCoop:true,onlineMultiplayer:false}};
  manifest.costumes=costumes;
  write('royale/release-manifest.json',JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({out,modules:Object.keys(sourceHashes).length,bundles:Object.keys(manifest.bundles).length,sourceCommit:sha}));
}
module.exports={runtimePlugin,sourceHashes,build};
if(require.main===module)build().catch(e=>{console.error(e);process.exitCode=1;});
