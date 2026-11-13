// Overlay only /royale-v3-staging onto a previously verified Pages artifact.
// Every file outside this path is hashed before and after and must be unchanged.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const esbuild=require('./release-build/node_modules/esbuild');
const releaseTransform=require('./release-build/transform.cjs'),uiTransform=require('./staging-ui-transform.cjs'),fashionMap=require('./release-build/fashion-map.cjs');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(root,'_site')),dest=path.join(out,'royale-v3-staging');
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function protectedHashes(dir=out){const entries={};for(const e of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,e.name),rel=path.relative(out,full);if(rel==='royale-v3-staging')continue;if(e.isDirectory())Object.assign(entries,protectedHashes(full));else entries[rel]=hash(fs.readFileSync(full));}return entries;}
function write(rel,text){const file=path.join(dest,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);}
async function build(){
 if(!fs.existsSync(path.join(out,'royale/release-manifest.json')))throw Error('A verified production artifact is required; production is never rebuilt by this tool.');
 const before=protectedHashes(),production=JSON.parse(fs.readFileSync(path.join(out,'royale/release-manifest.json'),'utf8'));
 const map=JSON.parse(read('royale-v3-staging/kingjames/index.html').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,mappings=new Map();
 for(const [from,to]of Object.entries(map)){if(from.includes('?'))continue;mappings.set(new URL(from,'https://build.test/royale/').pathname.slice(1),new URL(to,'https://build.test/royale/').pathname.slice(1));}
 mappings.delete('royale/app.mjs');mappings.set('royale/renderer.mjs','royale-v3-staging/kingjames/renderer.mjs');mappings.set('royale/hero-art.mjs','royale/release-src/presentation.mjs');
 const sources={};
 const plugin={name:'staging-interface',setup(build){
  build.onResolve({filter:/^[./]/},args=>{let rel=path.relative(root,path.resolve(args.resolveDir||root,args.path.split('?')[0])).replaceAll(path.sep,'/');if(rel.startsWith('../'))throw Error('Import escapes project');if(!/[?&](?:costume-base|fashion-base|bossFallback)=1/.test(args.path)){rel=mappings.get(rel)||rel;rel=fashionMap[rel]||rel;}return {path:path.join(root,rel)};});
  build.onLoad({filter:/\.m?js$/},args=>{const rel=path.relative(root,args.path).replaceAll(path.sep,'/'),source=fs.readFileSync(args.path,'utf8');sources[rel]=hash(source);let contents=uiTransform(rel,releaseTransform(rel,source));contents=contents.replaceAll('import.meta.url',`new URL(${JSON.stringify('../../'+rel)},import.meta.url).href`);return {contents,loader:'js',resolveDir:path.dirname(args.path)};});
 }};
 fs.mkdirSync(dest,{recursive:true});
 const result=await esbuild.build({absWorkingDir:root,entryPoints:{game:'royale-v3-staging/interface/game-entry.mjs',cloud:'royale-v3-staging/app.mjs',coop:'royale/release-src/coop-entry.mjs'},outdir:path.join(dest,'release'),outExtension:{'.js':'.mjs'},chunkNames:'shared-[hash]',bundle:true,splitting:true,format:'esm',platform:'browser',target:['es2022'],minifySyntax:true,legalComments:'none',metafile:true,plugins:[plugin]});
 const sha=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 function shell(html,script){return html.replace(/<script type="importmap">[\s\S]*?<\/script>/g,'').replace(/<script type="module" src="[^"]+"><\/script>/g,'').replace(/<script src="[^\"]*motion-core.js[^\"]*"><\/script>/g,'').replace(/<aside id="qa-tools"[\s\S]*?<\/aside>/g,'').replace(/<p class="roster-cache-note">[\s\S]*?<\/p>/g,'').replace(/<a [^>]*href="tests\/[^>]*>[\s\S]*?<\/a>/g,'').replace(/<span class="phase-label">[\s\S]*?<\/span>/g,'').replace(/<link rel="stylesheet" href="multiplayer\/menu.css">/,'').replace('</head>','<link rel="stylesheet" href="../royale-v3-staging/interface.css?v='+sha+'"><style>#tab-body,#panel-body{display:none!important}</style></head>').replace('</body>','<script src="../assets/animation/motion-core.js"></script><script type="module" src="../royale-v3-staging/release/'+script+'?v='+sha+'"></script></body>');}
 write('gameplay/index.html',shell(read('royale-v3-staging/gameplay/index.html'),'game.mjs'));
 let home=read('royale-v3-staging/index.html').replace(/<script type="importmap">[\s\S]*?<\/script>/g,'').replace(/<script type="module" src="[^"]+"><\/script>/g,'').replace(/<p>Cloud save: automatic every eight seconds during gameplay<\/p>/g,'').replace('</head>','<style>html:has(.staging-session),body.staging-session{width:100%;height:100%;height:100dvh;max-width:none;margin:0;padding:0;overflow:hidden}.staging-session>h1,.staging-session>p,.staging-session>small,.staging-session #refresh{display:none!important}.staging-session #roster{position:fixed;inset:0;border:0;margin:0;padding:0;border-radius:0}.staging-session #game-frame{width:100%;height:100%;height:100dvh}</style></head>').replace('</body>','<script type="module" src="./release/cloud.mjs?v='+sha+'"></script></body>');
 write('index.html',home);write('interface.css',read('royale-v3-staging/interface/interface.css'));
 write('responsive-review.html',read('royale-v3-staging/interface/responsive-review.html'));
 // Co-op keeps its verified menus and data contract. No online services are enabled.
 let coop=shell(read('royale-v3-staging/local-coop/index.html'),'coop.mjs').replace(/<base href="[^"]+">/,'<base href="../../royale/local-coop/">').replaceAll('../royale-v3-staging/','../../royale-v3-staging/').replace('src="../assets/animation/','src="../../assets/animation/');
 write('local-coop/index.html',coop);
 const after=protectedHashes();if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Production artifact changed; refusing staging publish.');
 write('interface-manifest.json',JSON.stringify({sourceCommit:sha,productionCommit:production.sourceCommit,productionFilesUnchanged:Object.keys(before).length,costumeCount:28,onlineMultiplayer:false,sources,bundles:Object.keys(result.metafile.outputs).map(p=>path.relative(out,path.resolve(root,p)))},null,2)+'\n');
 console.log(JSON.stringify({staging:dest,productionFilesUnchanged:Object.keys(before).length,productionCommit:production.sourceCommit,modules:Object.keys(sources).length}));
}
module.exports={build,protectedHashes};if(require.main===module)build().catch(e=>{console.error(e);process.exitCode=1;});
