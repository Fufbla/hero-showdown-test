const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),stage=path.join(root,'royale-v3-staging'),out=path.join(stage,'portals');fs.mkdirSync(out,{recursive:true});
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const imports=s=>s.replace(/((?:from\s*|import\s*\()\s*['"])\.\//g,'$1../../royale/');
function replace(s,a,b){if(!s.includes(a))throw Error('Portal adapter source changed: '+a);return s.replace(a,b);}
let world=imports(read('royale/world-art.mjs'));
world=replace(world,"from '../../royale/portal-art.mjs'","from './runtime.mjs?v=portals-1'");
world=replace(world,'drawPortal(c,x,camp.y,g.regionId,g.time);',"drawPortal(c,x,camp.y,g.regionId,g.time,'REGION PORTAL · FREE',g);");
world=replace(world,"drawPortal(c,x,600,g.regionId,g.time,label.replace('E · ',''));","drawPortal(c,x,600,g.regionId,g.time,label.replace('E · ',''),g,x===GATES.arena?'boss':'regular');");
world=world.replace('camera-100||x>camera+width+100','camera-160||x>camera+width+160');
fs.writeFileSync(path.join(out,'world-art.mjs'),world);
let boss=imports(read('royale/boss-ui.mjs'));
boss="import {drawPortal} from './runtime.mjs?v=portals-1';\n"+boss;
boss=replace(boss,"c.strokeStyle='#e8d296';c.lineWidth=4;c.strokeRect(120,480,100,120);","drawPortal(c,ARENA.left,ARENA.floor,g.regionId,g.time,g.arenaScene.cleared?'RETURN TO REGION':'RETREAT · WALK LEFT',g,g.arenaScene.cleared?'return':'regular');");
boss=boss.replace("205,490","205,410").replace("210,510","210,426");
fs.writeFileSync(path.join(out,'boss-ui.mjs'),boss);
let menu="import {worldPortalPreview,pulsePortal} from './runtime.mjs?v=portals-1';\n"+imports(read('royale/journey-menu.mjs'));
menu=replace(menu,"const g=this.getGame(),list=$('region-cards');list.replaceChildren();","const g=this.getGame(),list=$('region-cards');list.replaceChildren();if(source!=='portal')worldPortalPreview(list);else pulsePortal();");
fs.writeFileSync(path.join(out,'journey-menu.mjs'),menu);
for(const [file,basePath] of [['index.html','/royale-v3-staging/'],['kingjames/index.html','/royale/'],['gameplay/index.html','/royale/'],['local-coop/index.html','/royale/local-coop/']]){
 const dest=path.join(stage,file);let html=fs.readFileSync(dest,'utf8');if(file==='index.html')html=html.replace('./app.mjs?v=steel-speed-1','./app.mjs?v=portals-1');
 html=html.replace(/<script type="importmap">([\s\S]*?)<\/script>/,(_,json)=>{const m=JSON.parse(json),base=new URL(basePath,'https://game.test');for(const f of ['world-art.mjs','boss-ui.mjs','journey-menu.mjs']){const source='/royale/'+f,relative=path.posix.relative(basePath,'/royale-v3-staging/portals/'+f),target=(relative.startsWith('.')?relative:'./'+relative)+'?v=portals-1';for(const [key,value]of Object.entries(m.imports)){if(new URL(key,base).pathname===source||new URL(value,base).pathname===source)m.imports[key]=target;}const key=path.posix.relative(basePath,source);m.imports[key.startsWith('.')?key:'./'+key]=target;}return '<script type="importmap">'+JSON.stringify(m)+'</script>';});fs.writeFileSync(dest,html);
}
console.log('Built staging-only approved portal artwork adapters.');
