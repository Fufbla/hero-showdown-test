// Test-only reference renderer. Original art is shared read-only; every source
// module comes from the verified release, never from the rejected head rebuild.
import {mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
export const ORIGINAL_FACE_BASE='5defeb33c626d19755b26f030b5e7b840f6b4b77';
export async function originalFaceBaseline(setup,commit=ORIGINAL_FACE_BASE){
  const repo=fileURLToPath(new URL('../../',import.meta.url)),root=await mkdtemp(join(tmpdir(),'royale-original-face-'));
  await mkdir(join(root,'royale'));
  const files=execFileSync('git',['ls-tree','--name-only',commit+':royale'],{cwd:repo,encoding:'utf8'}).trim().split('\n').filter(p=>p.endsWith('.mjs'));
  for(const name of files)await writeFile(join(root,'royale',name),execFileSync('git',['show',commit+':royale/'+name],{cwd:repo,maxBuffer:8*1024*1024}));
  await symlink(join(repo,'royale/assets'),join(root,'royale/assets'),'dir');
  await symlink(join(repo,'assets'),join(root,'assets'),'dir');
  const modules=await Promise.all(['style-c-materials','style-c-hero','style-c-face','style-c-hair'].map(name=>import(pathToFileURL(join(root,'royale',name+'.mjs')))));
  if(!await modules[0].prepareStyleCMaterials(setup))throw Error('Reference artwork did not load');
  return {...modules[1],...modules[2],...modules[3],close:()=>rm(root,{recursive:true,force:true})};
}
