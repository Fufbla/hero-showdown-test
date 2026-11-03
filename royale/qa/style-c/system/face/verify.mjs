// Run with Node from a checkout that provides the project's native canvas test dependency.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {prepareStyleCFace,drawStyleCFace,styleCFaceStatus} from '../../../../style-c-face.mjs';
import {styleCDefault} from '../../../../style-c-defaults.mjs';

const {createCanvas,loadImage} = createRequire(import.meta.url)('@napi-rs/canvas');
assert.equal(await prepareStyleCFace({canvasFactory:createCanvas,imageLoader:url=>loadImage(fileURLToPath(url))}), true);

function render(look, mode='head', blink=0) {
  const c=createCanvas(180,180).getContext('2d');
  drawStyleCFace(c,look,{center:[90,105],mode,blink});
  return c.getImageData(0,0,180,180).data;
}
const variants=[
  {eyeShape:'round',brows:'soft'}, {eyeShape:'wide',brows:'straight'}, {eyes:'#478fcc'},
  {nose:'broad',mouth:'smile'}, {nose:'small',mouth:'full'}, {face:'round',jaw:1.15,age:'teen'},
  {face:'angular',jaw:.85,age:'older'}, {facialHair:'stubble'}, {facialHair:'beard'},
  {skin:'#744431'}, {skin:'#e3a67b'},
];
let assertions=0;
for (const sex of ['male','female']) {
  const look=styleCDefault(sex), original=render(look);
  for (const patch of variants) {
    const image=render({...look,...patch});
    let differences=0,opaque=0;
    for(let i=0;i<image.length;i+=4) {
      const colorDifference=[0,1,2,3].reduce((v,k)=>v+Math.abs(image[i+k]-original[i+k]),0);
      if(colorDifference>20)differences++;
      if(image[i+3]>128)opaque++;
    }
    assert.ok(differences>15,sex+' visible change '+JSON.stringify(patch));
    assert.ok(opaque>7200,sex+' head surface survives edit');
    assertions+=2;
  }
  const iris=render({...look,eyes:'#1eddea'},'features');
  let changed=0,top=180,bottom=0;
  for(let i=0;i<iris.length;i+=4) if(iris[i+3]>70) {
    const y=Math.floor(i/4/180); changed++; top=Math.min(top,y); bottom=Math.max(bottom,y);
  }
  assert.ok(changed>20&&changed<650,sex+' localized iris color');
  assert.ok(bottom-top<=21,sex+' independent iris material');
  assertions+=2;
  for(const blink of [0,.25,.5,.75,1,0]){
    const pixels=render(look,'features',blink);
    let active=0,min=180,max=0;
    for(let i=3;i<pixels.length;i+=4)if(pixels[i]>40){
      const y=Math.floor((i-3)/4/180);
      active++; min=Math.min(min,y); max=Math.max(max,y);
    }
    assert.ok(blink?active>100&&max-min<42:active===0,sex+' eye closure '+blink);
    assertions++;
  }
}
assert.ok(styleCFaceStatus().entries<=styleCFaceStatus().limit);
console.log(assertions+' registered face/closure checks passed; cache bounded.');
