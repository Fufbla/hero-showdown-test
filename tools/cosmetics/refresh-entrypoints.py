"""Refresh existing import-map aliases and add wardrobe module cache keys."""
from pathlib import Path
import hashlib,json,os,re
root=Path(__file__).resolve().parents[2]
changed=set(os.popen('git diff --name-only HEAD').read().splitlines())
changed.update(str(p.relative_to(root)) for p in (root/'royale/cosmetics').glob('*.mjs'))
changed.update(['royale/local-coop/tests/browser-harness.mjs','royale/local-coop/tests/browser-clothing.mjs'])
for rel in ['royale/index.html','royale/local-coop/index.html','royale-v3-staging/index.html']:
 p=root/rel;text=p.read_text();match=re.search(r'<script type="importmap">(.*?)</script>',text,re.S)
 data=json.loads(match[1]) if match else {'imports':{}}
 for path in sorted(changed):
  if not path.endswith('.mjs') or not (root/path).is_file():continue
  key=os.path.relpath(root/path,p.parent)
  if not key.startswith('.'):key='./'+key
  data['imports'][key]=key
 for key,value in list(data['imports'].items()):
  clean=value.split('?')[0];target=(p.parent/clean).resolve()
  if target.is_file():data['imports'][key]=clean+'?v='+hashlib.sha256(target.read_bytes()).hexdigest()[:12]
 replacement='<script type="importmap">'+json.dumps(data,separators=(',',':'))+'</script>'
 text=text[:match.start()]+replacement+text[match.end():] if match else text.replace('<script type="module"',replacement+'<script type="module"',1)
 def stamp(m):
  prefix,link,quote=m.groups();clean=link.split('?')[0];target=(p.parent/clean).resolve()
  return prefix+clean+'?v='+hashlib.sha256(target.read_bytes()).hexdigest()[:12]+quote if target.is_file() and target.suffix in ('.mjs','.css') else m[0]
 text=re.sub(r'((?:src|href)=")([^"?#]+(?:\?[^"#]*)?)(")',stamp,text)
 p.write_text(text)
 print(rel)
