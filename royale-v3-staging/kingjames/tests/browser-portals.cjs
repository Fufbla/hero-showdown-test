const assert=require('node:assert/strict');
module.exports=async frame=>{
 const result=await frame.evaluate(async()=>{
 const url=p=>new URL('../royale-v3-staging/portals/'+p+'?v=portals-1',document.baseURI).href;
 const {portalReady,portalStatus,drawPortal}=await import(url('runtime.mjs'));
 if(!await portalReady)throw Error(JSON.stringify(portalStatus()));
 const {worldLandmarks}=await import(url('world-art.mjs')),{drawArena}=await import(url('boss-ui.mjs'));
 const {Game}=await import(new URL('./core.mjs',document.baseURI).href),{WORLD_REGIONS,regionCamps}=await import(new URL('./world.mjs',document.baseURI).href);
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=720;const c=canvas.getContext('2d'),visited=[];
 const fingerprint=()=>{const p=c.getImageData(0,0,960,720).data;let h=2166136261;for(let i=0;i<p.length;i+=17)h=Math.imul(h^p[i],16777619);return h>>>0;};
 const pixels=new Set();const start=performance.now();
 for(const r of WORLD_REGIONS){
  for(let board=0;board<3;board++){
   const g=new Game();g.loadRegion(r.id);const camp=regionCamps(r.id)[board];g.hero.x=camp.x+90;g.hero.y=600;g.hero.coins=150;
   const snapshot=g.save();c.clearRect(0,0,960,720);c.save();c.translate(-(camp.x-150),0);worldLandmarks(c,g,camp.x-150,960);c.restore();if(snapshot!==g.save())throw Error('Rendering mutated saved game');pixels.add(fingerprint());
   for(const side of [-1,1]){g.loadRegion(r.id);g.hero.x=camp.x+90+side*40;g.hero.y=600;g.combatTimer=0;const coins=g.hero.coins;if(!g.portalTravel(r.id===7?1:r.id+1)||g.hero.coins!==coins)throw Error('Free portal failed');}
   visited.push(r.id+':'+board);
  }
  const g=new Game();g.loadRegion(r.id);g.hero.x=5840;g.hero.grounded=true;
  c.clearRect(0,0,960,720);c.save();c.translate(-5500,0);worldLandmarks(c,g,5500,960);c.restore();
  if(!g.usePassage())throw Error('Boss entrance failed');drawArena(c,g);g.arenaScene.cleared=true;drawArena(c,g);if(!g.leaveBoss()||g.hero.x!==5840)throw Error('Return location changed');
 }
 for(const coins of [99,100,150]){const g=new Game();g.hero.coins=coins;const ok=g.fastTravel({region:2,board:1},g.economy.revision);if(ok!==(coins>=100)||g.hero.coins!==(coins>=100?coins-100:coins))throw Error('Fast travel charge changed');}
 c.clearRect(0,0,960,720);drawPortal(c,480,600,1,0,'REGION PORTAL');const before=fingerprint();await new Promise(r=>setTimeout(r,150));c.clearRect(0,0,960,720);drawPortal(c,480,600,1,0,'REGION PORTAL');if(before===fingerprint())throw Error('Vortex froze with simulation paused');
 return {visited:visited.length,uniqueBoards:pixels.size,status:portalStatus(),renderChecksMs:performance.now()-start};
 });
 assert.equal(result.visited,21);assert.ok(result.uniqueBoards>=7);assert.equal(result.status.ready,true);assert.ok(result.status.cache<=4);console.log('Portal browser checks',result);return result;
};
