// Open headpieces preserve the custom face and hairstyle. All geometry follows
// the existing articulated hero rig; these are costume motifs, never boss replacements.
const line=(c,pts,color,w=2)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.stroke();};
const poly=(c,pts,color)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();c.strokeStyle='#18383e';c.lineWidth=1;c.stroke();};
const disc=(c,x,y,r,color)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();c.strokeStyle='#233a3d';c.lineWidth=1;c.stroke();};
export function drawMergeCostume(c,p,pieces,back,steel){
 const [x,y]=p.head,[sx,sy]=p.shoulder,[hx,hy]=p.hip,d=p.d;
 for(const part of ['helmet','chest','boots']){const item=pieces[part],id=item?.mergeId;if(!id)continue;const accent=steel?'#e7e9db':item.accent,color=steel?'#9daeb4':item.color;
  if(part==='helmet'){
   for(const s of[-1,1]){
    if(id==='lightning')poly(c,[[x+s*12,y-4],[x+s*14,y-21],[x+s*22,y-10]],s===1?'#c6b1df':'#b3d5c1');
    else if(id==='styrodog'||id==='sonic')line(c,[[x+s*12,y-7],[x+s*20,y-16],[x+s*17,y-27]],id==='sonic'?'#e9d4a4':color,4);
    else if(id==='styro'||id==='venomis'){disc(c,x+s*15,y-9,4,accent);line(c,[[x+s*13,y-10],[x+s*8,y-14]],accent,2);}
    else if(id==='atomdust'){poly(c,[[x+s*12,y-6],[x+s*19,y-12],[x+s*16,y-24],[x+s*12,y-15]],accent);}
    else {disc(c,x+s*15,y-6,5,color);line(c,[[x+s*14,y-12],[x+s*19,y-16]],accent,3);}
   }
  }
  if(part==='chest'){
   // Fixed colored armor seams and specular edging, following the same body rig.
   line(c,[[sx-d.shoulder+3,sy+3],[sx,sy+8],[sx+d.shoulder-3,sy+3]],'#ffffff55',1.2);
   for(const side of[-1,1])line(c,[[sx+side*d.shoulder*.68,sy+13],[hx+side*d.hip*.7,hy-4]],accent,1.5);
   for(const s of[-1,1]){
    const px=sx+s*d.shoulder;
    if(id==='lightning')poly(c,[[px-s*5,sy+2],[px+s*7,sy-10],[px+s*10,sy+9]],s===1?'#d7b5b0':'#b1ccde');
    else if(id==='sonic'){disc(c,px,sy+2,7,color);disc(c,px,sy+2,4,accent);disc(c,px,sy+2,2,color);}
    else if(id==='styrodog'){for(let i=0;i<3;i++)disc(c,px+s*(i-1)*4,sy+i%2*4,4,color);}
    else if(id==='styro'||id==='venomis'){poly(c,[[px,sy],[sx+s*4,sy+12],[hx+s*d.hip,hy+7],[px+s*5,hy+5]],color);if(!back){line(c,[[sx+s*7,sy+13],[sx+s*7,sy+23]],id==='venomis'?'#5dcc8c':accent,4);}}
    else if(id==='wastelander'){disc(c,px,sy+2,7,'#34433f');disc(c,px,sy+2,3,accent);line(c,[[px+s*5,sy],[px+s*8,sy-13]],color,5);}
    else if(id==='atomdust')poly(c,[[px-4,sy-2],[px+4,sy-2],[px+4,sy+22],[px-4,sy+22]],accent);
    else line(c,[[px,sy],[px+s*6,sy+8],[px-s*3,sy+15]],accent,4);
   }
  }
  if(part==='boots')for(const leg of p.legs){const [kx,ky]=leg[1],[fx,fy]=leg[2];line(c,[[kx,ky+2],[fx,fy-5]],accent,2);if(id==='styrodog')for(let i=0;i<3;i++)line(c,[[fx+i*3-3,fy],[fx+i*3,fy+4]],'#343539',2);else if(id==='atomdust'||id==='lightning')poly(c,[[kx-4,ky+2],[kx,ky-4],[kx+4,ky+2],[kx,ky+9]],accent);}
 }
}
