// Staging import-map adapter. Production gameplay and rendering stay untouched.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),stage=path.join(root,'royale-v3-staging'),dir=path.join(stage,'gameplay');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function replace(s,a,b){if(!s.includes(a))throw Error('Power adapter baseline changed: '+a.slice(0,80));return s.replace(a,b);}
const imports=s=>s.replace(/((?:from\s*|import\s*\()\s*['"])\.\//g,'$1../../royale/');
fs.mkdirSync(dir,{recursive:true});
let p=imports(read('royale/powers.mjs'));
p="// Generated staging policy; balance values retained from royale/powers.mjs.\nimport {retireMovementPower} from '../power-policy.mjs';\n"+p;
p=replace(p,"'roots','agility','speed'","'roots','speed'");
p=p.replace(/^  agility:.*\n/m,'').replace(',agility:equipment.agilityLevels','').replace(/^    case 'agility':.*\n/m,'');
p=replace(p,'  const levels=Object.fromEntries(POWER_IDS.map',`  if(strict&&(!raw||!raw.levels))return null;
  raw=retireMovementPower(raw,heroLevel,{allowOverBudget});if(!raw)return null;
  const levels=Object.fromEntries(POWER_IDS.map`);
p=replace(p,'return {levels,equipped,points:','return {movementPolicy:raw.movementPolicy,levels,equipped,points:');
p=replace(p,'h.agile=!!this.active.agility;','h.agile=false;');
p=p.replace(/^    if\(this.active.agility.*\n/m,'');
p=replace(p,'return {levels:{...this.data.levels},equipped:','delete recovery.speed;\n    return {movementPolicy:{...this.data.movementPolicy},levels:{...this.data.levels},equipped:');
fs.writeFileSync(path.join(dir,'powers.mjs'),p);
let eris=imports(read('royale/eris-ui.mjs'));
eris=eris.replace(/^import \{AGILITY_SUITS, matchingAgilityBonus\}.*\n/m,'').replace(/^  if\(category==='agility'\).*\n/m,'').replaceAll(',AGILITY_SUITS','').replace(",agility:'Agility'",'');
const start=eris.indexOf('    }else if(defs[0].agilityLevels){'),end=eris.indexOf('    }else if(defs[0].speedLevels){',start);
if(start<0||end<0)throw Error('Missing retired equipment description');
eris=eris.slice(0,start)+eris.slice(end);
fs.writeFileSync(path.join(dir,'eris-ui.mjs'),'// Generated staging menu; inventory catalog and statistics are preserved.\n'+eris);
let validation=imports(read('royale/cloud-validation.mjs'));
validation="import {migratePowerSnapshot} from '../power-policy.mjs';\n"+validation;
validation=replace(validation,' const state=decodeSave(JSON.stringify(raw));',' raw=migratePowerSnapshot(raw);\n const state=decodeSave(JSON.stringify(raw));');
fs.writeFileSync(path.join(dir,'cloud-validation.mjs'),validation);
// Import maps do not apply inside Workers. Validate on the staging module graph,
// then retain the existing worker for serialization only.
let serialize=read('royale/local-coop/serialize.mjs').replace("from '../core.mjs'","from '../../royale/core.mjs'");
serialize=replace(serialize,' if(typeof Worker'," if(validate&&!decodeSave(JSON.stringify(value.snapshot)))return Promise.reject(Error('Checkpoint validation failed; previous cloud save retained.'));\n if(typeof Worker");
serialize=replace(serialize,"new URL('./json-worker.mjs',import.meta.url)","new URL('../../royale/local-coop/json-worker.mjs',import.meta.url)");
serialize=replace(serialize,'worker.postMessage({id,value,validate})','worker.postMessage({id,value,validate:false})');
fs.writeFileSync(path.join(dir,'serialize.mjs'),serialize);

function mappedHTML(html,originalDirectory){
 const base=new URL(originalDirectory,'https://build.invalid/');
 html=html.replace('Practice all nine powers','Practice powers').replace(/<option value="agility">[^<]*<\/option>/g,'');
 return html.replace(/<script type="importmap">([\s\S]*?)<\/script>/,(_,raw)=>{
  const m=JSON.parse(raw);
  for(const file of ['powers.mjs','eris-ui.mjs','cloud-validation.mjs','local-coop/serialize.mjs']){
   const original=new URL('/royale/'+file,base).href;
   const relative=path.posix.relative(originalDirectory,'/royale-v3-staging/gameplay/'+path.posix.basename(file));
   // Import-map addresses must be URL-like; bare "gameplay/..." is blocked by browsers.
   const target=(relative.startsWith('.')?relative:'./'+relative)+'?v=steel-speed-1';
   const targetURL=new URL(target,base).href.split('?')[0];
   for(const [key,value]of Object.entries(m.imports)){
    const valueURL=new URL(value,base).href.split('?')[0];
    if(new URL(key,base).href.split('?')[0]===original){
     m.imports[key]=target;
     // Preserve versioned shared imports, without accumulating staging self-aliases.
     if(valueURL===original)m.imports[value]=target;
    }else if(valueURL===targetURL)m.imports[key]=target;
   }
   const key=path.posix.relative(originalDirectory,'/royale/'+file);
   m.imports[key.startsWith('.')?key:'./'+key]=target;
  }
  return '<script type="importmap">'+JSON.stringify(m)+'</script>';
 });
}
// Base URLs preserve original asset paths and every existing input/controller.
let html=read('royale/index.html').replace('<head>','<head>\n<base href="../../royale/">');
fs.writeFileSync(path.join(dir,'index.html'),mappedHTML(html,'/royale/'));
fs.mkdirSync(path.join(stage,'local-coop'),{recursive:true});
html=read('royale/local-coop/index.html').replace('<head>','<head><base href="../../royale/local-coop/">');
fs.writeFileSync(path.join(stage,'local-coop/index.html'),mappedHTML(html,'/royale/local-coop/'));
const king=path.join(stage,'kingjames/index.html');fs.writeFileSync(king,mappedHTML(fs.readFileSync(king,'utf8'),'/royale/'));
const parent=path.join(stage,'index.html');
html=fs.readFileSync(parent,'utf8').replace("location.href='../royale/local-coop/'","location.href='./local-coop/'").replaceAll('kingjames-fullbody-2','steel-speed-1');
fs.writeFileSync(parent,mappedHTML(html,'/royale-v3-staging/'));
console.log('Built staging-only power policy for solo, online, KingJames and local co-op.');
