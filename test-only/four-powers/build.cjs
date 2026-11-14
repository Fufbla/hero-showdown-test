const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[2]||path.join(root,'_four-powers'));
const esbuild=require('../../tools/release-build/node_modules/esbuild'),release=require('../../tools/release-build/transform.cjs'),ui=require('../../tools/staging-ui-transform.cjs'),test=require('./transform.cjs'),fashion=require('../../tools/release-build/fashion-map.cjs');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const imports=JSON.parse(read('royale-v3-staging/kingjames/index.html').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
const map=new Map(Object.entries(imports).filter(([key])=>!key.includes('?')).map(([a,b])=>[new URL(a,'https://build/royale/').pathname.slice(1),new URL(b,'https://build/royale/').pathname.slice(1)]));
map.delete('royale/app.mjs');map.set('royale/renderer.mjs','royale-v3-staging/kingjames/renderer.mjs');map.set('royale/hero-art.mjs','royale/release-src/presentation.mjs');
const overrides={'royale-v3-staging/gameplay/powers.mjs':'test-only/four-powers/powers.mjs','royale/powers.mjs':'test-only/four-powers/powers.mjs','royale/power-art.mjs':'test-only/four-powers/art.mjs','royale/local-coop/cloud.mjs':'test-only/four-powers/profile.mjs'};
const plugin={name:'four-powers-isolated',setup(build){
 build.onResolve({filter:/^[./]/},args=>{
  let rel=path.relative(root,path.resolve(args.resolveDir||root,args.path.split('?')[0])).replaceAll(path.sep,'/');
  if(rel.startsWith('../'))throw Error('Import escapes checkout');
  if(!/[?&](costume-base|fashion-base|bossFallback|four-base)=1/.test(args.path)){rel=map.get(rel)||rel;rel=fashion[rel]||rel;rel=overrides[rel]||rel;}
  return {path:path.join(root,rel),suffix:args.path.includes('four-base=1')?'?four-base=1':''};
 });
 build.onLoad({filter:/\.m?js$/},args=>{
  const rel=path.relative(root,args.path).replaceAll(path.sep,'/');
  let contents=read(rel);if(!args.suffix)contents=test(rel,ui(rel,release(rel,contents),{production:true}));
  const url=rel.startsWith('test-only/four-powers/')?'../'+rel.slice('test-only/four-powers/'.length):'../../'+rel;
  contents=contents.replaceAll('import.meta.url',`new URL(${JSON.stringify(url)},import.meta.url).href`);
  return {contents,loader:'js',resolveDir:path.dirname(args.path)};
 });
}};
function shell(file,base,entry){
 let s=read(file).replace(/<base href="[^"]*">/,`<base href="${base}">`).replace(/<script type="importmap">[\s\S]*?<\/script>/g,'').replace(/<script type="module" src="[^"]*"><\/script>/g,'');
 s=s.replace(/<aside id="qa-tools"[\s\S]*?<\/aside>/g,'').replace(/<span class="phase-label">[\s\S]*?<\/span>/g,'');
 s=s.replace(/<a [^>]*href="tests\/[^>]*>[\s\S]*?<\/a>/g,'').replace(/<p[^>]*>⚠️[\s\S]*?<\/p>/g,'');
 s=s.replace('href="../index.html" aria-label="Return to Hero Showdown"','href="../four-powers-test/" aria-label="Return to Four Powers Test"');
 s=s.replace('</head>','<link rel="stylesheet" href="../four-powers-test/review.css"></head>');
 if(entry==='coop')s=s.replace('../four-powers-test/review.css','../../four-powers-test/review.css');
 return s.replace('</body>',`<script type="module" src="${entry==='coop'?'../../':'../'}four-powers-test/release/${entry}.mjs"></script></body>`);
}
(async()=>{
 if(out===root||out===__dirname)throw Error('Unsafe build path');fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
 const result=await esbuild.build({absWorkingDir:root,entryPoints:{game:'test-only/four-powers/game-entry.mjs',coop:'test-only/four-powers/coop-entry.mjs',gallery:'test-only/four-powers/gallery.mjs'},outdir:path.join(out,'release'),outExtension:{'.js':'.mjs'},bundle:true,splitting:true,format:'esm',target:['es2022'],metafile:true,plugins:[plugin]});
 for(const [dest,src] of [['index.html','index.html'],['review.css','review.css'],['gallery.html','gallery.html'],['responsive.html','responsive.html']])fs.copyFileSync(path.join(__dirname,src),path.join(out,dest));
 fs.cpSync(path.join(__dirname,'assets'),path.join(out,'assets'),{recursive:true});
 for(const [name,html]of [['gameplay',shell('royale-v3-staging/gameplay/index.html','../../royale/','game')],['local-coop',shell('royale-v3-staging/local-coop/index.html','../../royale/local-coop/','coop')]]){fs.mkdirSync(path.join(out,name),{recursive:true});fs.writeFileSync(path.join(out,name,'index.html'),html);}
 fs.writeFileSync(path.join(out,'release-manifest.json'),JSON.stringify({sourceCommit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),testAccount:'0000000000',production:false,cloudWrites:false,storagePrefix:'royale-four-powers-0000000000-v1:',modules:Object.keys(result.metafile.inputs)},null,2));
 console.log(JSON.stringify({out,modules:Object.keys(result.metafile.inputs).length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
