// Armor statistics and save schemas stay shared; only presentation is adapted.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),stage=path.join(root,'royale-v3-staging');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const imports=s=>s.replace(/((?:from\s*|import\s*\()\s*['"])\.\//g,'$1../../royale/');
function replace(s,a,b){if(!s.includes(a))throw Error('Armor presentation baseline changed: '+a);return s.replace(a,b);}
let equipment=imports(read('royale/equipment.mjs'));
const start=equipment.indexOf('export function equipmentOutfit('),end=equipment.indexOf('export function rollEquipment(',start);
if(start<0||end<0)throw Error('Missing armor appearance boundary');
equipment="// Generated staging presentation; all catalog, equipment and bonus rules remain shared.\nimport {armorFreeAppearance} from './armor-appearance.mjs';\n"+equipment.slice(0,start)+`export function equipmentOutfit(inventory,fallback=STARTER_OUTFIT){
  return armorFreeAppearance(fallback);
}
`+equipment.slice(end);
write('royale-v3-staging/gameplay/equipment.mjs',equipment);

let eris=read('royale-v3-staging/gameplay/eris-ui.mjs');
eris="import {drawCosmeticPreview} from './armor-preview.mjs?v=armor-stats-1';\n"+eris;
eris=replace(eris,"drawHero(c,180,380,g.look,previewHero('idle',0),0,2.85,{view,outfit:equipmentOutfit(inventory,g.outfit)});canvas.setAttribute('aria-label',`${view} full-body costume preview of ${g.look.name}`);","drawCosmeticPreview(c,180,380,g,previewHero('idle',0),0,2.85,view);canvas.setAttribute('aria-label',`Current cosmetic appearance of ${g.look.name}; armor grants stats only`);");
eris=replace(eris,"Choose a complete matching outfit. Power Armor collections each have nine tiers.","Armor grants stat bonuses only and never changes your appearance. Equip a complete matching set. Power Armor collections each have nine tiers.");
eris=replace(eris,"Wear a complete matching outfit. Collect its body armor and boots, then equip them together.","Armor grants stat bonuses only and never changes your appearance. Collect matching body armor and boots, then equip them together. Choose clothing separately in the Clothing Store.");
eris=replace(eris,"Resale is 25% of original catalog value, rounded down. Legendary equipment can never be sold.","Armor grants stat bonuses only. Resale is 25% of original catalog value, rounded down. Legendary equipment can never be sold.");
eris=replace(eris,"'TRY IT ON'","'COMPARE BONUSES'");
eris=replace(eris," · Fixed colors${defs[0].rarity==='rare'?' · Constant white glow':''}."," · Stat bonuses only. Your cosmetic outfit stays selected.");
eris=replace(eris,' The chest includes the matching gauntlets.','');
eris=eris.replaceAll("'Remove outfit'","'Unequip armor'").replaceAll("'Wear matching outfit'","'Equip matching armor'").replaceAll('to wear this outfit.','to equip this armor set.').replaceAll('Open Owned to wear the matching set.','Open Owned to equip the matching armor set.');
write('royale-v3-staging/gameplay/eris-ui.mjs',eris);

let menu=read('royale-v3-staging/portals/journey-menu.mjs');
menu=replace(menu,'Health Roots stored separately.`','Health Roots stored separately. Armor grants stat bonuses only and never changes your appearance.`');
menu=replace(menu,'Your starter suit is always yours. Regular monsters may drop fixed-color costume equipment.','Your customized appearance is always yours. Regular monsters may drop armor that grants stat bonuses only.');
menu=replace(menu,"${def.rarity==='rare'?'Constant white glow.':'No glow.'}",'Stat bonuses only; your appearance stays the same.');
menu=menu.replaceAll(' · Matching outfit',' · Matching armor · Stat bonuses only');
write('royale-v3-staging/portals/journey-menu.mjs',menu);

let coop=read('royale/local-coop/app.mjs')
 .replace(/((?:from\s*|import\s*\()\s*['"])\.\.\//g,'$1../../royale/')
 .replace(/((?:from\s*|import\s*\()\s*['"])\.\//g,'$1../../royale/local-coop/')
 .replaceAll("new URL('./config.json',import.meta.url)","new URL('../../royale/local-coop/config.json',import.meta.url)");
coop=replace(coop,'equipment. Sales use your own coin balance.','equipment. Armor grants stat bonuses only and never changes your appearance. Sales use your own coin balance.');
coop=coop.replaceAll("'Matching outfits'","'Matching armor sets'").replaceAll("'Remove outfit'","'Unequip armor'").replaceAll("'Wear outfit'","'Equip armor'");
write('royale-v3-staging/gameplay/local-coop-app.mjs','// Generated staging equipment labels; co-op behavior is shared.\n'+coop);

// Preserve every existing portal, costume and versioned module alias. Cache-bust
// the changed adapters so a returning player cannot reuse a visible-armor module.
for(const [file,basePath] of [['index.html','/royale-v3-staging/'],['kingjames/index.html','/royale/'],['gameplay/index.html','/royale/'],['local-coop/index.html','/royale/local-coop/']]){
 const dest=path.join(stage,file);let html=fs.readFileSync(dest,'utf8');
 html=html.replace('>Costume Wardrobe<','>Armor Equipment<').replace('YOUR NEXT LOOK','YOUR COSMETIC APPEARANCE').replace('THE CENTRAL COSTUME SHOP','ARMOR EQUIPMENT').replace('Dress for your journey.','Choose your armor bonuses.').replace('Preview only. Your equipped items change when you choose Equip.','Armor provides stat bonuses only. Your selected cosmetic outfit stays the same.').replace('>Complete outfits<','>Matching armor sets<');
 html=html.replace(/<script type="importmap">([\s\S]*?)<\/script>/,(_,json)=>{
  const m=JSON.parse(json),base=new URL(basePath,'https://game.test');
  for(const [source,dest]of Object.entries({
   'equipment.mjs':'gameplay/equipment.mjs','hero-art.mjs':'gameplay/hero-art.mjs',
   'local-coop/app.mjs':'gameplay/local-coop-app.mjs',
   'eris-ui.mjs':'gameplay/eris-ui.mjs','journey-menu.mjs':'portals/journey-menu.mjs'
  })){
   const sourcePath='/royale/'+source,targetPath='/royale-v3-staging/'+dest;
   const rel=path.posix.relative(basePath,targetPath),target=(rel.startsWith('.')?rel:'./'+rel)+'?v=armor-stats-1';
   for(const [key,value]of Object.entries(m.imports)){
    const k=new URL(key,base).pathname,v=new URL(value,base).pathname;
    if(k===sourcePath||v===sourcePath||v===targetPath){
     m.imports[key]=target;
     if(v===sourcePath)m.imports[value]=target;
    }
   }
   const key=path.posix.relative(basePath,sourcePath);m.imports[key.startsWith('.')?key:'./'+key]=target;
  }
  for(const [key,value]of Object.entries(m.imports))if(new URL(value,base).pathname.endsWith('/kingjames/app.mjs'))m.imports[key]=value.replace(/\?v=[^&]+/,'?v=armor-stats-1');
  return '<script type="importmap">'+JSON.stringify(m)+'</script>';
 });
 fs.writeFileSync(dest,html);
}
console.log('Built staging-only armor presentation: equipment bonuses retained, armor artwork disabled.');
