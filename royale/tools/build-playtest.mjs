// Copies the existing game verbatim; never bakes, resizes or regenerates artwork.
import {cp, mkdir, readdir, readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {BOSS_ART_DEPENDENCIES} from '../boss-art.mjs';

export const repositoryRoot=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
export async function playtestFiles(root=repositoryRoot){
  const files=new Set(['assets/animation/motion-core.js',...BOSS_ART_DEPENDENCIES]);
  const walk=async directory=>{
    for(const item of await readdir(path.join(root,directory),{withFileTypes:true})){
      const relative=directory+'/'+item.name;
      if(item.isDirectory()){
        if(!['source','sources','node_modules','evidence'].includes(item.name))await walk(relative);
      }else if(item.isFile())files.add(relative);
    }
  };
  for(const item of await readdir(path.join(root,'royale'),{withFileTypes:true}))
    if(item.isFile()&&/\.(mjs|css|html)$/.test(item.name))files.add('royale/'+item.name);
  await walk('royale/assets');await walk('royale/vendor');
  for(const item of await readdir(path.join(root,'royale/tests'),{withFileTypes:true}))
    if(item.isFile()&&/\.(mjs|html)$/.test(item.name)&&!item.name.endsWith('.test.mjs'))files.add('royale/tests/'+item.name);
  return [...files].sort();
}

export async function buildPlaytest(destination){
  if(!destination||!path.isAbsolute(destination))throw Error('Pass an absolute output directory: npm run build:playtest -- /absolute/path/to/build');
  const out=path.resolve(destination);
  if(out===repositoryRoot||out.startsWith(repositoryRoot+path.sep))throw Error('Keep the build outside the source repository.');
  await mkdir(out,{recursive:true});
  const names=await readdir(out);
  if(names.length&&!names.includes('build-manifest.json'))throw Error('Output must be empty or an existing verified playtest build.');
  const files=await playtestFiles(),records=[];
  for(const relative of files){
    const source=path.join(repositoryRoot,relative),target=path.join(out,relative);
    const bytes=await readFile(source);
    await mkdir(path.dirname(target),{recursive:true});await cp(source,target);
    const hash=createHash('sha256').update(bytes).digest('hex');
    if(createHash('sha256').update(await readFile(target)).digest('hex')!==hash)throw Error('Copy mismatch: '+relative);
    records.push({path:relative,bytes:bytes.length,sha256:hash});
  }
  const index='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=royale/"><title>Hero Showdown Royale</title><a href="royale/">Play Hero Showdown Royale</a></html>\n';
  await writeFile(path.join(out,'index.html'),index);
  await writeFile(path.join(out,'START-HERE.txt'),'HERO SHOWDOWN ROYALE — MOBILE TEST\n\nServe this folder with any static HTTP server. For example, install Python 3, open a terminal in this folder and run:\n  python3 -m http.server 8000\nThen open http://localhost:8000/royale/ .\nFor an iPhone on the same Wi-Fi, open http://YOUR-COMPUTER-IP:8000/royale/ . Keep the server running. Do not open index.html as a file: the game uses JavaScript modules.\n\nTurn the phone sideways. Create a hero or continue a saved hero. Drag the left stick farther to run; tap Jump twice for a double jump. Tap the power icon to use a power and its name to equip a learned power. Spend Power Points at Tree of Eris.\n\nUse Pause > Save Game after five seconds outside combat. Progress stays in the same browser and site address. This build does not offer cloud or cross-device saving.\n\nDesktop: arrows move, Shift runs, Space jumps, J punches, K kicks, Up opens nearby portals/rest/treasure, E picks up items, G cycles targets, 1/2/3 use powers, H uses a Health Root, P/Escape pauses.\n\nOptional disposable armor trials: /royale/armor-review.html . Trial heroes are separate from ordinary saved heroes.\n');
  const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:repositoryRoot,encoding:'utf8'}).trim();
  const dirty=!!execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:repositoryRoot,encoding:'utf8'}).trim();
  const manifest={sourceCommit:commit,sourceHasUncommittedChanges:dirty,createdAt:new Date().toISOString(),files:records};
  await writeFile(path.join(out,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return {output:out,files:records.length,bytes:records.reduce((n,r)=>n+r.bytes,0),sourceCommit:commit,sourceHasUncommittedChanges:dirty};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await buildPlaytest(process.argv[2])));
