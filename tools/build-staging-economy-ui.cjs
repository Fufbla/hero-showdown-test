const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const marker='// Staging economy UI v1.\n';
function edit(file,fn){const p=path.join(root,file),s=fs.readFileSync(p,'utf8');if(!s.startsWith(marker))fs.writeFileSync(p,marker+fn(s).replaceAll('./runtime.mjs?v=portals-1','./runtime.mjs?v=economy-1'));}
function replace(s,a,b){if(!s.includes(a))throw Error('Economy UI anchor changed: '+a.slice(0,80));return s.replace(a,b);}
edit('royale-v3-staging/portals/world-art.mjs',s=>{
 s="import {regionPortals} from '../gameplay/portal-layout.mjs?v=phase-portals-1';\n"+s;
 s=replace(s,"  for(const camp of g.camps){const x=camp.x+90;if(x<camera-160||x>camera+width+160)continue;drawPortal(c,x,camp.y,g.regionId,g.time,'REGION PORTAL · FREE',g);}","");
 const start=s.indexOf('  for(const [x,label,locked]'),end=s.indexOf('\n}',start);
 if(start<0||end<0)throw Error('Missing world portal rendering boundary');
 return s.slice(0,start)+`  for(const p of regionPortals(g.regionId)){
    if(p.x<camera-240||p.x>camera+width+240)continue;
    const label=p.destination?.hub?'Tree of Eris · Free':p.role==='boss'?region.boss+' Arena':p.label;
    drawPortal(c,p.x,p.y,g.regionId,g.time,label,g,p.role==='boss'?'boss':p.role==='fast-travel'?'world':'regular');
  }`+s.slice(end);
});
edit('royale-v3-staging/portals/journey-menu.mjs',s=>{
 s="import {travelQuote} from '../gameplay/portal-layout.mjs?v=phase-portals-1';\n"+s;
 const start=s.indexOf("  map(source="),end=s.indexOf('  cancelTravel()',start);
 s=s.slice(0,start)+`  map(source=this.source||'map'){
    this.source=source;
    const g=this.getGame(),list=$('region-cards');list.replaceChildren();worldPortalPreview(list);if(source==='portal')pulsePortal();
    $('map-note').hidden=false;$('map-note').textContent='Fast travel is paid on every trip, including returns. Choose one of the seven phases. Fast travel always arrives at the beginning. Each phase has four portals: entrance and fast travel at the start, boss entrance and exit at the end.';
    for(const region of WORLD_REGIONS){
      const current=region.id===g.regionId,card=el('article',undefined,'region-card');card.style.setProperty('--region-color',region.sky[0]);card.dataset.region=region.id;if(current)card.setAttribute('aria-current','location');
      const art=el('div',undefined,\`region-art \${region.theme}\`);art.append(el('span',String(region.id).padStart(2,'0'),'region-number'),el('b',['','≋','♧','▥','◇','❧','✧','✦'][region.id]));card.append(art);
      const body=el('div',undefined,'region-copy');body.append(el('h3',region.name),el('small',\`LV \${region.levels.join('–')}\`));
      const board=0;
      const destination={region:region.id,board},quote=travelQuote(g,destination),here=current&&!g.arenaScene&&g.board===board;
        const button=el('button',here?'Current location':quote?\`\${region.name} · \${quote.cost.toLocaleString()} Coins\`:'Locked','secondary');
        button.disabled=here||!quote||!g.canTravel();button.dataset.travel=region.id;button.dataset.board=board;
        button.onclick=()=>this.confirmTravel(destination);body.append(button);
      card.append(body);list.append(card);
    }
  }
`+s.slice(end);
 s=replace(s,"const g=this.getGame(),revision=g.economy.revision,origin=document.activeElement,d=el('dialog'","const g=this.getGame(),quote=travelQuote(g,destination);if(!quote){this.say('This destination is unavailable.');return;}const cost=quote.cost,price=cost.toLocaleString(),revision=g.economy.revision,origin=document.activeElement,d=el('dialog'");
 s=s.replace("'Fast Travel — 100 Coins'","`Fast Travel — ${price} Coins`")
 .replaceAll('g.hero.coins<100','g.hero.coins<cost')
 .replace("'Not enough coins! Fast travel requires 100 coins. Use regular portals to travel for free.'","`Not enough coins! This trip costs ${price} coins. Entrance and exit portals remain free.`")
 .replace("'Teleport directly to this destination for 100 coins?'","`Teleport to this destination for ${price} coins? Return trips are charged separately.`")
 .replace("'Travel — 100 Coins'","`Travel — ${price} Coins`")
 .replace("'Fast travel complete · 100 coins paid.'","`Fast travel complete · ${price} coins paid.`")
 .replace('Regular monsters may drop armor that grants stat bonuses only.','Monsters award coins only. Buy armor at the Tree of Eris; Legendary bosses retain their unique equipment.');
 return s;
});
edit('royale-v3-staging/portals/boss-ui.mjs',s=>{
 const start=s.indexOf("  contents.append(chestPresentation()"),end=s.indexOf("  owned.append(",start);
 return s.slice(0,start)+"  contents.append(chestPresentation(),node('h3','Inside this chest'),node('p',`${chest.coins.toLocaleString()} coins`));\n"+s.slice(end);
});
edit('royale-v3-staging/portals/runtime.mjs',s=>s.replaceAll('REGION PORTAL · FREE','FAST TRAVEL · PAID').replace('World Portal — fast travel costs 100 coins','World Portal — destination price shown before travel'));
edit('royale-v3-staging/gameplay/local-coop-app.mjs',s=>{
 s="import {travelQuote} from './portal-layout.mjs?v=phase-portals-1';\n"+s;
 s=replace(s,"   for(const [id,def] of Object.entries(LEGENDARY))content.append(button(def.name,()=>act(i,'enterLegendary',[id]),g.hero.level!==99||!g.canTravel()));",`   for(const [id,def] of Object.entries(LEGENDARY))content.append(button(def.name+' · 3,500 Coins per hero',()=>{p.legendaryTravel={id,revisions:Object.fromEntries([...session.active].map(n=>[n,session.games[n].economy.revision]))};renderPanel(i);},g.hero.level!==99||!g.canTravel()));
   if(p.legendaryTravel){const choice=p.legendaryTravel;content.append(el('h4','Shared arena travel — 3,500 Coins per hero'),el('p','Every active hero pays 3,500 coins after successful entry. Both heroes must meet the arena requirements. Return visits also cost coins.'),button('Confirm paid arena travel',()=>{delete p.legendaryTravel;void act(i,'enterLegendary',[choice.id,choice.revisions]);},[...session.active].some(n=>session.games[n].hero.coins<3500)),button('Cancel',()=>{delete p.legendaryTravel;renderPanel(i);}));}`);
 s=replace(s,"  if(method==='fastTravel')players[i].travelPending=true;", "  if(method==='enterLegendary'){for(const n of session.active)players[n].travelPending=true;renderPanels();updateHUD();await Promise.all([...session.active].map(n=>saveOne(n)));return true;}\n  if(method==='fastTravel')players[i].travelPending=true;");
 const start=s.indexOf("  if(p.tab==='travel'){"),end=s.indexOf("  if(p.tab==='merge'){",start);
 return s.slice(0,start)+`  if(p.tab==='travel'){
   content.append(el('p',session.active.size>1?'Individual fast travel is unavailable while sharing one screen. Use entrance and exit portals together for free.':'Every fast-travel trip is paid. Return trips are charged separately.'));
   if(g.treeVisit)content.append(button('Leave Tree to travel',()=>act(i,'leaveTree')));
   for(const region of WORLD_REGIONS){const quote=travelQuote(g,{region:region.id,board:0});const b=button(\`\${region.name} · \${quote?quote.cost.toLocaleString()+' Coins':'Locked'}\`,()=>{p.travelChoice={region:region.id,board:0,revision:g.economy.revision};renderPanel(i);},!quote||!g.canTravel()||session.active.size>1||region.id===g.regionId&&g.board===0);b.className='region-button';content.append(b);}
   if(p.travelChoice){const q=p.travelChoice,quote=travelQuote(g,q);if(quote){const cost=quote.cost,price=cost.toLocaleString();content.append(el('h4',\`Fast Travel — \${price} Coins\`),el('p',g.hero.coins<cost?\`Not enough coins! This trip costs \${price} coins.\`:\`Teleport to this destination for \${price} coins?\`),button(\`Travel — \${price} Coins\`,()=>{delete p.travelChoice;void act(i,'fastTravel',[{region:q.region,board:q.board},q.revision]);},g.hero.coins<cost||session.active.size>1),button('Cancel',()=>{delete p.travelChoice;renderPanel(i);}));}}
  }
`+s.slice(end);
});
