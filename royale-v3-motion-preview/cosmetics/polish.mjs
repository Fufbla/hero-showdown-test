// Phase D: painterly garment finish. The approved atlas pixels remain unchanged.
// Shadows are local to attachment seams; no screen-wide filters or glows.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>a&&b?Math.hypot(b[0]-a[0],b[1]-a[1]):0;

export const POLISH_VERSION='garment-seam-polish-v1';

// A one-source-pixel overlap keeps the two parts of an elbow/knee bend from
// opening a transparent seam as the animation rotates each piece differently.
export function joinOverlap(layer){
 const [,,w,h]=layer.rect;
 return clamp(Math.min(w,h)*.014,.85,1.8);
}
export function jointClipShift(layer,cut){
 return (cut==='upper'?1:-1)*joinOverlap(layer);
}

// Shadow on the CHARACTER behind the cloth, not a black border painted
// around the garment. Cast only at real contact points.
export function contactGeometry(layer,anchors,at,fit,piece={}){
 const part=layer.part;
 const shoulderSpan=dist(anchors.shoulderNear,anchors.shoulderFar)||32;
 const hipSpan=dist(anchors.hipNear,anchors.hipFar)||17;
 if(part==='headwear'){
  return {x:anchors.head[0],y:anchors.head[1]-6,rx:shoulderSpan*.42,ry:3.6,alpha:.17};
 }
 if(part==='torso'){
  return {x:anchors.neck[0],y:anchors.neck[1]+2,rx:shoulderSpan*.26,ry:3.5,alpha:.095};
 }
 if(part.startsWith('foot')){
  return {x:at[0],y:at[1]+1,rx:Math.max(5,hipSpan*.44)*fit.width,ry:2.6,alpha:.12};
 }
 // The front pant cuff makes a shallow shadow where it meets the waist.
 if(part.startsWith('thigh')&&piece.category==='bottom'){
  return {x:at[0],y:at[1]+1,rx:Math.max(5,hipSpan*.30),ry:2.1,alpha:.07};
 }
 return null;
}

export function drawContactShadow(ctx,layer,anchors,at,fit,piece){
 if(typeof ctx.createRadialGradient!=='function'||typeof ctx.arc!=='function'||typeof ctx.fill!=='function')return;
 const shape=contactGeometry(layer,anchors,at,fit,piece);
 if(!shape)return;
 const {x,y,rx,ry,alpha}=shape;
 if(![x,y,rx,ry,alpha].every(Number.isFinite)||rx<=0||ry<=0)return;
 ctx.save();
 ctx.translate(x,y);
 ctx.scale(rx,ry);
 const g=ctx.createRadialGradient(0,0,.08,0,0,1);
 g.addColorStop(0,'rgba(8,11,22,'+alpha+')');
 g.addColorStop(.58,'rgba(8,11,22,'+(alpha*.58).toFixed(3)+')');
 g.addColorStop(1,'rgba(8,11,22,0)');
 ctx.fillStyle=g;
 ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();
 ctx.restore();
}

// Source drawings already contain their own shading. Gentle view-dependent
// values help the outfit match the body's far-side and rear lighting.
export function garmentLight(view,pass,layer){
 if(layer.part==='accessory'&&layer.attach==='head')return 1;
 const far=pass==='farArm'||pass==='farLeg';
 const viewShade=view==='back'?.965:view==='left'||view==='right'?.985:1;
 return clamp(viewShade*(far?.945:1),.9,1);
}
export function withGarmentLight(ctx,view,pass,layer,draw){
 if(typeof ctx.filter!=='string')return draw();
 const light=garmentLight(view,pass,layer);
 if(light>=.999)return draw();
 ctx.save();
 ctx.filter='brightness('+light.toFixed(3)+')';
 try{return draw();}
 finally{ctx.restore();}
}
