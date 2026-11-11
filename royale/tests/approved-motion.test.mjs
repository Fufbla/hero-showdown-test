import test from 'node:test';
import assert from 'node:assert/strict';
import {APPROVED_MOTION_ATLAS,APPROVED_POSES,APPROVED_MOTION_VERSION,ApprovedMotionSprites,selectApprovedPose} from '../v2-sprites/approved-motion.mjs';
test('approved source layout is fixed 24 registered transparent art frames',()=>{
 assert.equal(APPROVED_MOTION_VERSION,'approved-style-c-24-v2-ground-speed');
 assert.equal(APPROVED_POSES.length,24);
 assert.equal(new Set(APPROVED_POSES).size,24);
 assert.deepEqual([APPROVED_MOTION_ATLAS.cols,APPROVED_MOTION_ATLAS.rows,APPROVED_MOTION_ATLAS.cell],[6,4,256]);
});
test('approved poses are chosen only from the isolated hero state without mutations',()=>{
 const right={face:1,grounded:true,vx:0,castAge:100,dodgeAge:100,stun:0,attack:null};
 const original=JSON.stringify(right);
 assert.equal(selectApprovedPose(right),0);
 assert.equal(selectApprovedPose({...right,face:-1}),1);
 assert.equal(selectApprovedPose({...right,vx:220}),null,'actual multi-frame running stays on original renderer');
 assert.equal(selectApprovedPose({...right,grounded:false,jumps:1}),4);
 assert.equal(selectApprovedPose({...right,face:-1,grounded:false,jumps:1}),5);
 assert.equal(selectApprovedPose({...right,grounded:false,jumps:2}),6);
 assert.equal(selectApprovedPose({...right,face:-1,grounded:false,jumps:2}),7);
 assert.equal(selectApprovedPose({...right,attack:{kind:'punch',power:'strength',age:.03}}),8);
 assert.equal(selectApprovedPose({...right,attack:{kind:'punch',power:'strength',age:.24}}),9);
 assert.equal(selectApprovedPose({...right,face:-1,attack:{kind:'punch',power:'strength',age:.2}}),21);
 assert.equal(selectApprovedPose({...right,attack:{kind:'kick',power:'superKick',age:.02}}),10);
 assert.equal(selectApprovedPose({...right,attack:{kind:'kick',power:'superKick',age:.25}}),11);
 assert.equal(selectApprovedPose({...right,face:-1,attack:{kind:'kick',power:'superKick',age:.25}}),22);
 assert.equal(selectApprovedPose({...right,castAge:.05}),12);
 assert.equal(selectApprovedPose({...right,castAge:.17}),13);
 assert.equal(selectApprovedPose({...right,face:-1,castAge:.2}),23);
 assert.equal(selectApprovedPose({...right,steel:true}),14);
 assert.equal(selectApprovedPose(right,{powers:{active:{roots:{age:1}}}}),15);
 assert.equal(selectApprovedPose(right,{powers:{active:{whirlwind:{age:1}}}}),16);
 assert.equal(selectApprovedPose({...right,dodgeAge:.1}),17);
 assert.equal(selectApprovedPose({...right,flying:true}),18);
 assert.equal(selectApprovedPose({...right,vx:280},{powers:{speed:3}}),19);
 assert.equal(selectApprovedPose(right,{legendary:{active:'venomis'},mergeShots:[{}]}),20);
 assert.equal(selectApprovedPose({...right,dead:true}),null);
 assert.equal(JSON.stringify(right),original);
});
test('missing or incorrectly sized binary sprite atlas never disrupts existing gameplay',async()=>{
 const noAtlas=new ApprovedMotionSprites({loader:async()=>{throw Error('missing artwork')}});
 assert.equal(await noAtlas.preload(),false);
 assert.equal(noAtlas.draw({},0,0,{face:1}),false);
 const wrong=new ApprovedMotionSprites({loader:async()=>({width:600,height:100})});
 assert.equal(await wrong.preload(),false);
 const good=new ApprovedMotionSprites({loader:async()=>({width:1536,height:1024})});
 assert.equal(await good.preload(),true);
 const args=[],ctx={save(){},restore(){},drawImage(...x){args.push(x)},set imageSmoothingEnabled(x){},set imageSmoothingQuality(x){}};
 assert.equal(good.draw(ctx,100,200,{face:1},{}),true);
 assert.equal(args.length,1);assert.deepEqual(args[0].slice(1,5),[0,0,256,256]);
 assert.equal(good.draw(ctx,100,200,{face:1,vx:100},{}),false,'moving run falls back to existing loop');
});

test('ground effect artwork uses visible ground anchor and speed mirrors only toward the left',async()=>{
 const previousDocument=globalThis.document;
 const cell=APPROVED_MOTION_ATLAS.cell;
 const pixels=new Uint8ClampedArray(cell*cell*4);
 pixels[(214*cell+100)*4+3]=255; // A painted foot/root endpoint at pixel 214.
 try{
  globalThis.document={createElement:()=>({getContext:()=>({
   clearRect(){},drawImage(){},getImageData(){return {data:pixels};}
  })})};
  const art=new ApprovedMotionSprites({loader:async()=>({width:1536,height:1024})});
  assert.equal(await art.preload(),true);
  const calls=[];
  const ctx={save(){},restore(){},drawImage(...a){calls.push(['draw',...a]);},
   translate(...a){calls.push(['translate',...a]);},scale(...a){calls.push(['scale',...a]);},
   set imageSmoothingEnabled(x){},set imageSmoothingQuality(x){}};
  const hero={face:1,grounded:true,vx:0,castAge:100,dodgeAge:100,stun:0,attack:null};
  for(const id of ['roots','whirlwind']){
   calls.length=0;
   assert.equal(art.draw(ctx,100,200,hero,{powers:{active:{[id]:{age:1}}}}),true);
   const args=calls.find(a=>a[0]==='draw').slice(1);
   assert.equal(args[6]+args[8]*215/256,200,'painted FX reaches the platform surface');
  }
  calls.length=0;
  assert.equal(art.draw(ctx,100,200,{...hero,face:-1,vx:-290},{powers:{speed:.6}}),true);
  assert.ok(calls.some(c=>c[0]==='scale'&&c[1]===-1),'leftward speed pose is mirrored');
  calls.length=0;
  assert.equal(art.draw(ctx,100,200,{...hero,face:1,vx:290},{powers:{speed:.6}}),true);
  assert.equal(calls.some(c=>c[0]==='scale'),false,'rightward speed is not mirrored');
  assert.equal(selectApprovedPose({...hero,vx:290},{powers:{active:{roots:{age:1}},speed:.6}}),19,
    'running must not be frozen in the roots pose');
  assert.equal(selectApprovedPose({...hero,grounded:false,jumps:1},{powers:{active:{whirlwind:{age:1}}}}),4,
    'jumping must not render an airborne ground-power poster');
 }finally{
  if(previousDocument===undefined)delete globalThis.document;
  else globalThis.document=previousDocument;
 }
});
