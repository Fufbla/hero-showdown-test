"""Package an isolated local review. Shared approved artwork is referenced,
not duplicated; no live game entry point or player save code is modified."""
from pathlib import Path
import shutil,json,hashlib,subprocess,re
root=Path(__file__).resolve().parents[1]
out=root/'royale-v3-hair-preview'
if out.exists():
    if not (out/'build.json').is_file():
        raise RuntimeError('Refusing to replace an unrecognized output directory')
    shutil.rmtree(out)
(out/'royale/tests').mkdir(parents=True,exist_ok=True)
(out/'build.json').write_text(json.dumps({'purpose':'Isolated hair review; build in progress'})+'\n')
def rewrite(text):
    text=text.replace("'../assets/","'../../assets/").replace('"../assets/','"../../assets/')
    text=text.replace("'./assets/","'../../royale/assets/").replace('"./assets/','"../../royale/assets/')
    text=text.replace("url('assets/","url('../../royale/assets/")
    text=text.replace('`../${profile.file}`','`../../${profile.file}`').replace('`../${path}`','`../../${path}`')
    for name in ['reference-v3/','buzz-reference-v2.png']:
        text=text.replace('../../royale/assets/hero/style-c-accurate/hair/'+name,'./assets/hero/style-c-accurate/hair/'+name)
    return text
for p in (root/'royale').iterdir():
    if p.is_file() and p.suffix in ('.mjs','.html','.css'):
        (out/'royale'/p.name).write_text(rewrite(p.read_text()))
for name in ['nine-hair-game.html','nine-hair-game.mjs','nine-hair-review.html','nine-hair-review.mjs','style-c-scenes.mjs']:
    shutil.copy2(root/'royale/tests'/name,out/'royale/tests'/name)
for rel in ['assets/hero/style-c-accurate/hair/reference-v3','qa/nine-hair-review']:
    shutil.copytree(root/'royale'/rel,out/'royale'/rel,dirs_exist_ok=True,ignore=shutil.ignore_patterns('screenshots'))
shutil.copy2(root/'royale/assets/hero/style-c-accurate/hair/buzz-reference-v2.png',out/'royale/assets/hero/style-c-accurate/hair/buzz-reference-v2.png')
(out/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=royale/tests/nine-hair-review.html"><title>Nine hairstyles · V3 preview</title><a href="royale/tests/nine-hair-review.html">Open the nine-hairstyle review and playable game</a></html>')
# Check the actual review/game module graph, including shared original assets.
seen=set()
def verify(path):
    path=path.resolve()
    if path in seen:return
    if not path.is_file() and path.is_relative_to(out):
        original=root/path.relative_to(out)
        if original.is_file():
            path.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(original,path)
    if not path.is_file():raise RuntimeError(f'Missing preview dependency: {path}')
    seen.add(path)
    if path.suffix!='.mjs':return
    for spec in re.findall(r"(?:from\s*|import\s*)['\"]([^'\"]+)['\"]",path.read_text()):
        if spec.startswith('.'):
            verify(path.parent/spec.split('?')[0])
for entry in ['app.mjs','tests/nine-hair-review.mjs','tests/nine-hair-game.mjs']:
    verify(out/'royale'/entry)
manifest={'source_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'source_dirty':bool(subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True).strip()),'purpose':'Isolated hair review; official game remains unchanged','verified_modules':len(seen),'files':{str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in out.rglob('*') if p.is_file() and p.name!='build.json'}}
(out/'build.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Packaged {len(manifest["files"])} files; {sum(p.stat().st_size for p in out.rglob("*") if p.is_file())/1048576:.1f} MiB. Shared artwork stays in its original location.')
