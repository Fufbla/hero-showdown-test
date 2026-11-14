import {drawStyleCHair} from '../../royale/style-c-hair.mjs';
import {STYLE_C_FACE_ANCHORS} from '../../royale/style-c-face.mjs';
import {tone} from '../../royale/style-c-paint.mjs';

// Creator back view only. Reuse the customized head outline and existing rear
// hairstyle artwork; never paint eyes or a mouth on the back of the head.
export function rearHead(head,look,factory){
 const key=[look.presentation,look.age,look.skin,look.hair,look.hairColor,look.face,look.jaw].join('|');
 head.starterRearCache??=new Map();if(head.starterRearCache.has(key))return head.starterRearCache.get(key);
 const face=head.facePlate({...look,facialHair:'none'}),pad=look.presentation==='female'?64:0,plate=factory(256+pad*2,256+pad*2),c=plate.getContext('2d');
 c.drawImage(face.image,pad,pad);c.globalCompositeOperation='source-in';
 const [x,y,w,h]=face.bounds,g=c.createLinearGradient(x+pad,y+pad,x+w+pad,y+h+pad);
 g.addColorStop(0,tone(look.skin,1.12));g.addColorStop(1,tone(look.skin,.78));c.fillStyle=g;c.fillRect(0,0,plate.width,plate.height);c.globalCompositeOperation='source-over';
 const factor=194/STYLE_C_FACE_ANCHORS[look.presentation].size[1];
 c.save();if(face.fit)c.setTransform(face.fit[0],0,0,face.fit[1],face.fit[2]+pad,face.fit[3]+pad);
 c.save();c.translate(128,200-48*factor);c.scale(2.55*factor,2.55*factor);
 drawStyleCHair(c,look,{wind:0,bounce:0},0,'rear','back');drawStyleCHair(c,look,{wind:0,bounce:0},0,'front','back');c.restore();
 c.restore();
 const result={image:plate,origin:pad?face.origin.map(n=>n+pad):face.origin};head.starterRearCache.set(key,result);
 while(head.starterRearCache.size>24)head.starterRearCache.delete(head.starterRearCache.keys().next().value);
 return result;
}
