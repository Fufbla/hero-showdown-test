import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {steelBodyFrame,STEEL_BODY_SPRITE,drawSteelBodyOverlay} from '../v2-sprites/steel-body-overlay.mjs';
test('steel body effect has eight transparent animation cels',()=>{
 assert.equal(STEEL_BODY_SPRITE.frames,8);
 assert.equal(STEEL_BODY_SPRITE.cell,192);
 assert.equal(steelBodyFrame(0),0);
 assert.equal(steelBodyFrame(.13),1);
 assert.equal(steelBodyFrame(.3),2);
 assert.ok(steelBodyFrame(1.1)>=2&&steelBodyFrame(1.1)<8);
});
test('steel body leaves regular hero state unchanged',async()=>{
 const renderer=await readFile(new URL('../renderer.mjs',import.meta.url),'utf8');
 const approved=await readFile(new URL('../v2-sprites/approved-motion.mjs',import.meta.url),'utf8');
 const preview=await readFile(new URL('../v2-sprites/power-preview.mjs',import.meta.url),'utf8');
 assert.ok(renderer.includes('if(steelMode)drawSteelSilhouette('), 'steel transforms into the faceless chrome body');
 assert.ok(renderer.includes('const generated=!steelMode&&('), 'do not paint original full-body hero beneath steel');
 assert.ok(!renderer.includes('drawSteelBodyOverlay(c,game,pos)'), 'old glowing-outline poster must not be composited');
 assert.doesNotMatch(approved,/if\(active\.steel\|\|hero\.steel\)return idx\.steel/);
 assert.doesNotMatch(preview,/if\(flags\.steel\)\{/);
 assert.equal(drawSteelBodyOverlay(null,{hero:{steel:true},powers:{active:{steel:{age:0}}}},{x:1,y:1}),false);
});
