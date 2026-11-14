// Reuse the existing artwork and runtime. Never build or deploy production.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const out=path.resolve(process.argv[2]||path.join(root,'dist'));
if(out===root||out===__dirname||root.startsWith(out+path.sep))throw Error('Unsafe package path');
fs.mkdirSync(out,{recursive:true});
const site=path.join(out,'hero-showdown-test');
fs.mkdirSync(site,{recursive:true});
const excluded=new Set(['node_modules','tests','test','qa','review','backend','backend-v3','release-src','character-test','generated']);
const publicFile=/\.(?:png|webp|jpg|jpeg|svg|gif|json|css|woff2?|mp3|ogg|wav)$/i;
let files=0,bytes=0;
function copy(rel){
 const src=path.join(root,rel),stat=fs.statSync(src);
 if(stat.isDirectory()){
  for(const entry of fs.readdirSync(src,{withFileTypes:true})){
   if(excluded.has(entry.name)||entry.name.startsWith('.'))continue;
   copy(path.posix.join(rel,entry.name));
  }
 }else if(publicFile.test(rel)||rel==='assets/animation/motion-core.js'){
  // A test build has no production login endpoints or cloud configuration.
  if(rel.endsWith('/config.json'))return;
  const dest=path.join(site,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest);files++;bytes+=stat.size;
 }
}
for(const rel of ['royale','royale-v3-staging','assets'])if(fs.existsSync(path.join(root,rel)))copy(rel);
cp.execFileSync(process.execPath,[path.join(__dirname,'build.cjs'),path.join(site,'four-powers-test')],{cwd:root,stdio:'inherit'});
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hero Showdown Royale · Four Powers Test</title><meta http-equiv="refresh" content="0;url=./hero-showdown-test/four-powers-test/"><a href="./hero-showdown-test/four-powers-test/">Open Four Powers Test</a>');
console.log(JSON.stringify({out,assetFiles:files,assetBytes:bytes}));
