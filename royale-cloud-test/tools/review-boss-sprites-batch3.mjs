// Native raster evidence and exported rig poses. This is not a browser FPS test.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {BossArt} from '../boss-art.mjs';
import {BOSS_SPRITE_DATA as DATA} from '../boss-sprites.mjs';
import {makeBoss,arenaSurfaces} from '../bosses.mjs';
import {attackFor} from '../boss-data.mjs';
const require=createRequire(import.meta.url);
let canvas;try{canvas=require('@napi-rs/canvas');}catch{canvas=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));}
const {createCanvas:rawCanvas,loadImage}=canvas,root=fileURLToPath(new URL('../../',import.meta.url));
const out=root+'royale/qa/boss-sprites/batch3/';mkdirSync(out,{recursive:true});
// Native Skia snapshots mutable canvas textures on draw. Decode each finished
// mask once as an immutable image before exporting; browser runtime is unchanged.
const rasterCanvas=rawCanvas,textureCanvas=rawCanvas;
const artFactory=()=>new BossArt({loadImages:true,spriteImageLoader:u=>loadImage(fileURLToPath(u)),spriteCanvasFactory:s=>rasterCanvas(s,s),scorpionImageLoader:p=>loadImage(root+p),scorpionCanvasFactory:textureCanvas});
async function prepareArt(art,region){
 await art.prepare(region);
 const t=art.regions.get(region)?.textures;
 if(t&&!t.nativeImmutable){
  const entries=[t.body,...t.legs,t.plate,...t.claws,...t.forearms,...t.jaws];
  for(const entry of entries)entry.canvas=await loadImage(entry.canvas.toBuffer('image/png'));
  t.nativeImmutable=true;
 }
}

export const profileFor=region=>DATA.bosses[region];
export async function samplePose(region,state,column=0,sharedArt=null){
 const profile=profileFor(region),b=makeBoss(region,arenaSurfaces()[0]),art=sharedArt||artFactory();
 await prepareArt(art,region);if(!art.ready)throw Error(`Artwork load failed: ${region}`);
 b.x=b.prevX=profile.anchor[0];b.y=b.prevY=profile.anchor[1];b.face=1;
 let time=1+column*.16;
 if(region===4){
  const frames=Math.round(time*60),start=b.x-(state==='walk'?frames*48/60:0);b.x=b.prevX=start;
  for(let i=0;i<frames;i++){b.prevX=b.x;if(state==='walk')b.x+=48/60;art.step(b,i/60,1/60);}
 }else if(state==='idle')time=column*.5;
 if(state==='walk'&&region!==4){b.prevX=b.x-.8;time=column/6+.001;}
 else if(state==='hit'){
  b.hp-=100;b.flash=.12-column*.031;
  if(region===4)for(let i=0;i<8;i++)art.step(b,time-(8-i)/60,1/60);
 }else if(state==='defeat'){
  b.state='dead';b.age=column*.25;
 }else if(!['idle','walk'].includes(state)){
  b.attack=attackFor(b,state);b.attack.targetX=b.x+150;
  b.state=['windup','windup','active','recover'][column];
  b.age=column===1?b.attack.warning*.7:column===2&&region===4?b.attack.duration*.65:column===3?b.attack.recovery*.25:0;
 }
 art.step(b,time,1/60);return {art,b,time:time+.06};
}
const measuredFrames=Number(process.env.BOSS_REVIEW_FRAMES||600);
const metrics=[];
for(const region of [7]){
 const profile=profileFor(region),sharedArt=artFactory(),frame=rasterCanvas(profile.cell||DATA.cell,profile.cell||DATA.cell),c=frame.getContext('2d'),sheet=rasterCanvas(2048,2880),ctx=sheet.getContext('2d');ctx.fillStyle='#132735';ctx.fillRect(0,0,sheet.width,sheet.height);
 for(const [row,state] of profile.states.entries())for(let column=0;column<4;column++){
  const {art,b,time}=await samplePose(region,state,column,sharedArt);c.clearRect(0,0,frame.width,frame.height);art.draw(c,b,{time});
  const pix=c.getImageData(0,0,frame.width,frame.height).data;let count=0,bounds=[frame.width,frame.height,0,0];
  for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){const a=pix[(y*frame.width+x)*4+3];if(a>16){count++;bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x);bounds[3]=Math.max(bounds[3],y);}}
  if(count<1000)throw Error(`Blank ${region}/${state}/${column}`);

  ctx.save();ctx.translate(column*512,row*320);ctx.fillStyle=(row+column)%2?'#19353f':'#20414a';ctx.fillRect(2,2,508,316);ctx.fillStyle='#e3f0df';ctx.font='16px sans-serif';ctx.fillText(`${profile.name} · ${state} · ${column+1}`,12,24);
  ctx.strokeStyle='#92ad8877';ctx.beginPath();ctx.moveTo(6,280);ctx.lineTo(506,280);ctx.stroke();
  const anchor=profile.anchor||DATA.anchor;const zoom=.88;ctx.drawImage(frame,256-anchor[0]*zoom,280-anchor[1]*zoom,frame.width*zoom,frame.height*zoom);ctx.restore();
 }
 writeFileSync(out+`regional-${region}-contact-sheet.png`,sheet.toBuffer('image/png'));sheet.width=sheet.height=1;frame.width=frame.height=1;
 for(const [name,width,height] of [['desktop',1280,720],['mobile-sized',390,844]]){
  const c=rasterCanvas(width,height),g=c.getContext('2d'),art=artFactory(),b=makeBoss(region,arenaSurfaces()[0]);await prepareArt(art,region);b.x=b.prevX=900;b.face=-1;b.phase=3;
  const scale=Math.min(width/1280,height/720),offset=(height-720*scale)/2;
  const draw=t=>{if(process.memoryUsage().rss>1500000000)throw Error('Native review exceeded its 1.5 GB memory ceiling');g.resetTransform();g.fillStyle='#142e3c';g.fillRect(0,0,width,height);g.save();g.translate(0,offset);g.scale(scale,scale);g.fillStyle='#557568';g.fillRect(0,600,1280,120);art.step(b,t,1/60);art.draw(g,b,{time:t});g.restore();};
  for(let i=0;i<60;i++)draw(i/60);const times=[];for(let i=0;i<measuredFrames;i++){if(process.memoryUsage().rss>1500000000)throw Error('Native review exceeded its 1.5 GB memory ceiling');const start=performance.now();draw((i+60)/60);times.push(performance.now()-start);}times.sort((a,b)=>a-b);
  metrics.push({region,name,width,height,frames:measuredFrames,mean_ms:times.reduce((a,b)=>a+b)/times.length,p95_ms:times[Math.floor(times.length*.95)],scope:'Native headless boss-renderer cost, not browser FPS or device testing'});
  writeFileSync(out+`regional-${region}-${name}.png`,c.toBuffer('image/png'));c.width=c.height=1;
 }
 console.log(`${profile.name}: all 36 poses rendered, desktop and phone-shaped evidence saved; RSS ${Math.round(process.memoryUsage().rss/1048576)} MiB`);
}
writeFileSync(out+'raster-performance.json',JSON.stringify(metrics,null,2)+'\n');
