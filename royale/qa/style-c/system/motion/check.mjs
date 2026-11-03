// Run with node from any directory. Native canvas decodes the same RGBA plates
// and renders the same anchors as the browser; the function never mocks a pose.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
import {STYLE_C_MOTIONS, motionFrameSample, sampleStyleCMotion, drawStyleCMotionLimb, prepareStyleCMotion, styleCMotionStatus} from '../../../../style-c-motion.mjs';
import {sourcePose} from '../../../../style-c-source.mjs';
import {styleCDefault} from '../../../../style-c-defaults.mjs';
import {previewHero} from '../../../../hero-rig.mjs';
import {ATTACKS} from '../../../../core.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
assert.ok(await prepareStyleCMotion({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))}));
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const blank=()=>createCanvas(256,256).getContext('2d');
const counts={completeFrameSamples:0,paintedLimbs:0,contactSamples:0};
let maxBoneError=0,maxContactError=0;
for(const presentation of ['male','female']){
  const look=styleCDefault(presentation);
  const model=sourcePose(look,previewHero('idle',0),0).m;
  const palette={suit:look.suit,trim:look.trim};
  for(const [name,clip] of Object.entries(STYLE_C_MOTIONS)){
    for(let key=0;key<clip.frames.length;key++){
      const {hero,time,options}=motionFrameSample(name,key),before=JSON.stringify([look,hero]);
      const p=sampleStyleCMotion(model,look,hero,time,options);
      assert.equal(p.clip,name);assert.equal(p.frame,key);counts.completeFrameSamples++;
      for(const kind of ['arms','legs'])for(let side=0;side<2;side++){
        for(let i=0;i<2;i++){
          const expected=distance(model[kind][side][i],model[kind][side][i+1]),actual=distance(p[kind][side][i],p[kind][side][i+1]);
          maxBoneError=Math.max(maxBoneError,Math.abs(actual-expected));
        }
        const c=blank();c.translate(128,223);c.scale(.69,.69);c.translate(-model.origin[0],-model.origin[1]);
        assert.ok(drawStyleCMotionLimb(c,p,kind,side,look,palette));
        const rgba=c.getImageData(0,0,256,256).data;
        let opaque=0;for(let i=3;i<rgba.length;i+=4)if(rgba[i]>100)opaque++;
        assert.ok(opaque>90,name+' '+kind+' '+side+' must paint a visible complete limb');counts.paintedLimbs++;
      }
      assert.equal(JSON.stringify([look,hero]),before);
    }
  }
  for(const [build,width]of Object.entries({slender:.87,balanced:1,strong:1.12,full:1.22}))
  for(const height of [.88,1.12])for(const limbScale of [.85,1.15])for(const kind of ['punch','kick']){
    const l={...look,build,height,arms:limbScale,legs:limbScale};
    const fittedModel=sourcePose(l,previewHero('idle',0),0).m;
    for(let age=ATTACKS[kind].startup+.001;age<ATTACKS[kind].startup+ATTACKS[kind].active;age+=.012){
      const p=sampleStyleCMotion(fittedModel,l,{...previewHero('idle',0),attack:{kind,age,face:1}},0);
      const hit=p[kind==='punch'?'arms':'legs'][0][2],goal=kind==='punch'?[54,-54]:[56,-39];
      maxContactError=Math.max(maxContactError,distance([(hit[0]-fittedModel.origin[0])*.35*width,(hit[1]-fittedModel.origin[1])*.35*height],goal));
      counts.contactSamples++;
    }
  }
}
assert.ok(maxBoneError<.001);assert.ok(maxContactError<.03);
const results={passed:true,states:Object.fromEntries(Object.entries(STYLE_C_MOTIONS).map(([k,v])=>[k,v.frames.length])),...counts,maxBoneErrorSourcePixels:maxBoneError,maxContactErrorGamePixels:maxContactError,art:styleCMotionStatus()};
writeFileSync(new URL('checks.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results));
