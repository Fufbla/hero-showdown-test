import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {V2GeneratedSprites,V2_SPRITE_VERSION,V2_SPRITE_ATLASES,V2_SPRITE_SCENES,chooseV2Frame} from '../v2-sprites/runtime.mjs';
import {V2_TEST_CODE,isV2TestCode} from '../v2-test-hero.mjs';
const root=new URL('../v2-sprites/',import.meta.url);

test('all three actual generated WebP atlases have transparent WebP metadata and registered cell grids',async()=>{
 assert.equal(V2_SPRITE_VERSION,'generated-atlas-v1');
 for(const [name,meta] of Object.entries(V2_SPRITE_ATLASES)){
  const b=await readFile(new URL(meta.file,root));
  assert.ok(b.byteLength>20000,name+' source file is missing or empty');
  assert.equal(b.toString('ascii',0,4),'RIFF',name+' RIFF signature');
  assert.equal(b.toString('ascii',8,12),'WEBP',name+' WebP signature');
  assert.equal(b.toString('ascii',12,16),'VP8X',name+' requires transparent VP8X support');
  const width=b.readUIntLE(24,3)+1,height=b.readUIntLE(27,3)+1;
  assert.equal(width,meta.cols*meta.cell,name+' width not aligned');
  assert.equal(height,meta.rows*meta.cell,name+' height not aligned');
  assert.ok((b[20]&0x10)!==0,'Alpha channel required: '+name);
 }
 assert.equal(Object.keys(V2_SPRITE_SCENES).length,8);
});
test('hero state selects idle, run, jump, double jump in both horizontal directions',()=>{
 const base={face:1,grounded:true,vx:0,vy:0,cycle:0,jumps:0,jumpAge:0};
 assert.equal(chooseV2Frame(base,0).scene,'idleRight');
 assert.equal(chooseV2Frame({...base,face:-1},0).scene,'idleLeft');
 assert.equal(chooseV2Frame({...base,vx:220},.5).scene,'runRight');
 assert.equal(chooseV2Frame({...base,face:-1,vx:-300},.5).scene,'runLeft');
 assert.equal(chooseV2Frame({...base,grounded:false,vy:-100,jumps:1,jumpAge:.15},.5).scene,'jumpRight');
 assert.equal(chooseV2Frame({...base,grounded:false,vy:-100,jumps:2,jumpAge:.15},.5).scene,'doubleRight');
 assert.equal(chooseV2Frame({...base,grounded:false,face:-1,vy:240,jumps:2,jumpAge:.35},.5).scene,'doubleLeft');
 assert.equal(chooseV2Frame({...base,flying:true},0).scene,'jumpRight');
 assert.equal(chooseV2Frame({...base,attack:{kind:'punch',age:0.07}},0),null,'existing combat animation remains available');
 assert.equal(chooseV2Frame({...base,castAge:.06},0),null,'existing power casting artwork remains available');
});
test('loader verifies every asset before drawing and falls back safely if decoding fails',async()=>{
 const loaded=[];
 const atlas=new V2GeneratedSprites({loader:async file=>{
  const pair=Object.entries(V2_SPRITE_ATLASES).find(([,meta])=>meta.file===file);
  loaded.push(file);
  return {width:pair[1].cols*pair[1].cell,height:pair[1].rows*pair[1].cell};
 }});
 assert.equal(atlas.draw({},0,0,{},0),false);
 assert.equal(await atlas.preload(),true);
 assert.equal(loaded.length,3);
 const ops=[],ctx={save(){ops.push('save')},restore(){ops.push('restore')},drawImage(...args){ops.push(args)},set imageSmoothingEnabled(v){},set imageSmoothingQuality(v){}};
 assert.equal(atlas.draw(ctx,300,550,{face:-1,grounded:true,vx:-185},.3),true);
 const drawn=ops.find(x=>Array.isArray(x));
 assert.ok(drawn&&drawn.length===9,'must use cropped atlas frame not show an entire storyboard poster');
 assert.equal(drawn[4],160);
 assert.equal(drawn[5],160);
 assert.equal(ops[0],'save');assert.equal(ops.at(-1),'restore');
 const broken=new V2GeneratedSprites({loader:async()=>{throw Error('broken atlas')}});
 assert.equal(await broken.preload(),false);
 assert.equal(broken.draw(ctx,0,0,{},0),false);
});
test('sprite test route is limited to the isolated public 0000000000 code',async()=>{
 assert.equal(V2_TEST_CODE,'0000000000');
 assert.ok(isV2TestCode('0000000000'));
 assert.ok(!isV2TestCode('1234567890'));
 const app=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 const renderer=await readFile(new URL('../renderer.mjs',import.meta.url),'utf8');
 assert.ok(app.includes('if(v2TestHero){\n renderer.v2SpriteTest=true;'));
 assert.ok(app.includes("button.id='v2-sprite-toggle'"),'compare button available only to test hero');
 assert.ok(renderer.includes('this.v2SpriteTest&&v2GeneratedSprites.draw('));
 assert.ok(renderer.includes("drawHero(c,pos.x,pos.y"),'existing game renderer remains as fallback');
});
