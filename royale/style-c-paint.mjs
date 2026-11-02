export const INK='#131a2a',TAU=Math.PI*2;
const tones=new Map();
export function tone(color,factor){const key=color+':'+factor;if(tones.has(key))return tones.get(key);
 const out='#'+[1,3,5].map(i=>Math.round(Math.max(0,Math.min(255,parseInt(color.slice(i,i+2),16)*factor))).toString(16).padStart(2,'0')).join('');
 if(tones.size>=192)tones.delete(tones.keys().next().value);tones.set(key,out);return out;}
export function poly(c,points,fill,stroke=INK,width=.9){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
export function curve(c,points,fill,stroke=INK,width=.9){c.beginPath();c.moveTo(...points[0]);for(let i=1;i<points.length;i++){const p=points[i];if(p.length===6)c.bezierCurveTo(...p);else if(p.length===4)c.quadraticCurveTo(...p);else c.lineTo(...p);}c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
export function line(c,points,color,width=1){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
export function oval(c,x,y,rx,ry,fill,stroke=null,width=.9){c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
export function emblem(c,x,y,kind,color,size=1){c.save();c.translate(x,y);c.scale(size,size);
 if(kind==='star'||kind==='sun'){const points=[];for(let i=0;i<(kind==='sun'?16:10);i++){const a=i*TAU/(kind==='sun'?16:10)-Math.PI/2,r=i%2?3.3:7.5;points.push([Math.cos(a)*r,Math.sin(a)*r]);}poly(c,points,color,INK,.8);if(kind==='sun')oval(c,0,0,3.3,3.3,color,INK,.6);}
 else if(kind==='bolt')poly(c,[[1,-8],[-6,1],[-1,1],[-3,8],[7,-3],[2,-3],[4,-8]],color);
 else if(kind==='shield')curve(c,[[-6,-6],[0,-8,6,-6],[6,3,0,8],[-6,3,-6,-6]],color);
 else if(kind==='leaf'){curve(c,[[-4,7],[-10,-7,7,-8],[10,5,-4,7]],color);line(c,[[-4,7],[5,-5]],INK,.7);}
 else for(let j=-1;j<=1;j++){c.beginPath();c.moveTo(-7,j*3);c.bezierCurveTo(-2,j*3-5,2,j*3+5,7,j*3);c.strokeStyle=color;c.lineWidth=1.5;c.stroke();}
 line(c,[[-1,-4],[1,-5]],'#fff5c9',.8);c.restore();}
