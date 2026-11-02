// Local canvas textures preserve the comic linework without new shared assets.
const TAU=Math.PI*2,INK='#1b3542';
function shape(c,p,fill,stroke=null,w=2){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
function line(c,p,color,w=2){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.stroke();}
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill();}
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
const TILE=1536;
const palette={coast:['#458e97','#32797a'],forest:['#326c66','#254e51'],factory:['#5a6c7a','#394e5c'],cave:['#566580','#35465e'],mutant:['#71617d','#494b62'],energy:['#535a89','#363c69'],final:['#6d596d','#484657']};
function tree(c,x,y,h,color,mutant=false){
 const width=h*.055;
 line(c,[[x-35,y],[x,y-h*.45],[x+7,y-h]],color,width*2);line(c,[[x,y-h*.5],[x-55,y-h*.73],[x-83,y-h*.9]],color,width*.7);line(c,[[x,y-h*.63],[x+65,y-h*.83]],color,width);
 line(c,[[x-35,y],[x+2,y-h*.5],[x+10,y-h]],'#e1d4aa20',width*.28);
 for(let j=0;j<5;j++){const px=x-90+j*43,py=y-h-10+Math.sin(j*1.7)*27;oval(c,px,py,67,42,color);oval(c,px-7,py-14,42,24,mutant?'#c591ad29':'#b7c98830');}
 for(let j=0;j<5;j++)line(c,[[x-12,y-25],[x+(j-2)*23,y+7]],color,width*.45);
}
function backdrop(theme,night,near){
 const canvas=document.createElement('canvas');canvas.width=TILE;canvas.height=900;const c=canvas.getContext('2d'),colors=palette[theme],base=night?(near?'#253448':'#37445c'):colors[near?1:0];
 for(let i=-1;i<10;i++){
  const x=i*192+70,h=150+(i+15)%4*55,y=610;
  if(theme==='coast'){
   if(!near){shape(c,[[x-100,y],[x-50,y-80],[x+20,y-h*.6],[x+73,y-60],[x+120,y]],base);shape(c,[[x+20,y-h*.6],[x+40,y-55],[x+73,y-60]],'#d8cfb52b');}
   else if(i%3===1){shape(c,[[x-68,y],[x-44,y-60],[x+65,y-64],[x+100,y]],base);tree(c,x+8,y-55,h*.45,base);}
  }else if(theme==='forest'||theme==='mutant'){
   tree(c,x,y,h+(near?80:150),base,theme==='mutant');if(near){shape(c,[[x-100,y],[x-60,y-70],[x+20,y-50],[x+65,y]],base);line(c,[[x-50,y-75],[x-10,y-160],[x+26,y-120]],base,9);}
  }else if(theme==='factory'||theme==='final'){
   const ruin=theme==='final';shape(c,[[x-65,y],[x-65,y-h],[x-20,y-h-(ruin?35:0)],[x+5,y-h+(ruin?25:0)],[x+70,y-h],[x+70,y]],base);
   rect(c,x-40,y-h-75,24,76,base);line(c,[[x-35,y-h-70],[x-35,y-h-5]],'#e3c7a321',4);
   for(let row=0;row<Math.floor(h/45);row++)for(let col=0;col<3;col++)rect(c,x-46+col*34,y-h+20+row*40,16,19,night?'#b9b47855':'#c8d0b444');
   if(near){line(c,[[x-83,y-110],[x+80,y-110]],'#a7a59b50',7);line(c,[[x-80,y-100],[x+75,y-20]],base,9);oval(c,x+50,y-45,28,28,'#1b35414d');for(let k=0;k<6;k++){const a=k*TAU/6;line(c,[[x+50,y-45],[x+50+Math.cos(a)*23,y-45+Math.sin(a)*23]],'#95a39b40',3);}}
  }else if(theme==='cave'){
   shape(c,[[x-95,0],[x+85,0],[x+30,h+75],[x-12,90]],base);shape(c,[[x-100,y+50],[x-25,y-h],[x+70,y-50],[x+100,y+50]],base);
   if(near)for(let j=0;j<3;j++){const xx=x+j*20;shape(c,[[xx,y-5],[xx-8,y-65-j*15],[xx+8,y-85-j*15],[xx+18,y-15]],'#a8c9aa65');line(c,[[xx+8,y-75-j*15],[xx+8,y-15]],'#e2efba70');}
  }else{
   const y2=210+(i+9)%3*125;shape(c,[[x-53,y2],[x+50,y2-16],[x+25,y2+48],[x-10,y2+92]],base);shape(c,[[x-25,y2-4],[x-15,y2-110],[x+15,y2-138],[x+20,y2-12]],'#879fc570');line(c,[[x+2,y2-125],[x+5,y2+38]],'#b0e6eb70',2);
  }
 }
 return canvas;
}
export class EnvironmentArt{
 constructor(){this.scenes=new Map();this.terrain=new Map();}
 scene(region,night){const key=`${region.id}:${night}`;if(!this.scenes.has(key)){this.scenes.set(key,[backdrop(region.theme,night,false),backdrop(region.theme,night,true)]);while(this.scenes.size>2)this.scenes.delete(this.scenes.keys().next().value);}return this.scenes.get(key);}
 sky(c,region,width,height,cameraX,cameraY,time,night){
  const gradient=c.createLinearGradient(0,0,0,height);gradient.addColorStop(0,night?'#122239':region.sky[0]);gradient.addColorStop(.65,night?'#3a4c63':region.sky[1]);gradient.addColorStop(1,night?'#526474':region.sky[1]);c.fillStyle=gradient;c.fillRect(0,0,width,height);
  if(region.theme!=='cave'){
   const sx=width*.78-cameraX*.018,sy=115-cameraY*.08;oval(c,sx,sy,night?30:52,night?30:52,night?'#f5efcc':'#fff0bc');oval(c,sx,sy,night?42:76,night?42:76,'#fff1bd16');
   if(night)for(let i=0;i<22;i++)oval(c,((i*177-cameraX*.04)%(width+100)+width+100)%(width+100),35+i*71%240,1,1,'#f9f3d0');
   else for(let i=-1;i<width/300+1;i++){const x=i*300-cameraX*.07%300;oval(c,x,80+i%3*35-cameraY*.05,75,13,'#fff4db4d');oval(c,x+20,66+i%3*35-cameraY*.05,42,20,'#fff4db4d');}
  }
  if(region.id===1){const seaY=355-cameraY*.26;const sea=c.createLinearGradient(0,seaY,0,height);sea.addColorStop(0,'#338d9f');sea.addColorStop(1,'#9ed2b2');c.fillStyle=sea;c.fillRect(0,seaY,width,height-seaY);for(let row=0;row<9;row++){const y=seaY+row*30;for(let x=-130;x<width+140;x+=165){const xx=x-cameraX*.12%165+Math.sin(time*.6+row)*13;line(c,[[xx,y],[xx+35,y-2],[xx+76,y]],'#e0f2d54a',1.5);}}}
  const layers=this.scene(region,night);for(let n=0;n<2;n++){const factor=n?.32:.12,offset=(cameraX*factor)%TILE,dy=-cameraY*factor;for(let x=-offset-TILE;x<width;x+=TILE)c.drawImage(layers[n],x,dy);}
  if(region.id!==1){const haze=c.createLinearGradient(0,height*.65,0,height);haze.addColorStop(0,'#d9ddb000');haze.addColorStop(1,night?'#b7d2a414':'#d6d6aa2b');c.fillStyle=haze;c.fillRect(0,height*.65,width,height*.35);}
 }
 surface(c,s,region){
  const key=`${region.id}:${s.kind}:${s.w}:${s.h}:${!!s.oneWay}`;let tile=this.terrain.get(key);
  if(!tile){
   tile=document.createElement('canvas');tile.width=s.w+8;tile.height=s.oneWay?104:s.h+20;const t=tile.getContext('2d'),wood=s.kind==='wood',metal=s.kind==='metal',top=12,w=s.w;
   if(wood||metal){
    rect(t,3,top,w,s.h,metal?'#465968':'#72533d');rect(t,3,top,w,8,metal?'#c5bf9e':'#e7bd7f');line(t,[[4,top],[w+2,top]],INK,2);
    for(let x=8;x<w;x+=30){line(t,[[x,top+9],[x,top+s.h-2]],metal?'#263c48':'#493d32',2);oval(t,x+7,top+5,1.4,1.4,INK);if(!metal)line(t,[[x+4,top+14],[x+20,top+17]],'#b5915c',1);}
    line(t,[[14,top+s.h],[w-10,top+70]],metal?'#77858a':'#a98e64',6);line(t,[[w-10,top+s.h],[14,top+70]],metal?'#77858a':'#a98e64',6);
   }else{
    const fill=region.id===1?(s.kind==='rock'?'#6d9691':'#ad9569'):region.ground,edge=region.id===1?'#f1d79c':region.edge;
    if(s.oneWay){shape(t,[[3,top],[w+3,top],[w-5,top+26],[w-42,top+48],[w*.59,top+63],[29,top+48],[7,top+28]],fill,INK,2);shape(t,[[w*.6,top+20],[w-6,top+22],[w-42,top+48],[w*.59,top+63]],'#10263845');}
    else{rect(t,3,top,w,s.h,fill);rect(t,3,top+s.h*.55,w,s.h*.45,'#1535401b');}
    rect(t,3,top,w,9,edge);line(t,[[3,top],[w+3,top]],INK,2);line(t,[[5,top+9],[w+1,top+9]],'#fff0ca80',2);
    for(let x=17;x<w;x+=33){const y=top+23+(x*13%19);line(t,[[x,y],[x+12,y-3],[x+21,y+3]],'#10283830',1.4);line(t,[[x+4,y-6],[x+11,y-6]],'#ffffff20',1);}
    if(s.oneWay&&['coast','forest','mutant'].includes(region.theme))for(let x=10;x<w-5;x+=22)shape(t,[[x-4,top],[x-7,top-6],[x,top-3],[x+4,top-11],[x+7,top]],region.accent);
    if(s.oneWay&&region.theme==='energy'){line(t,[[5,top+2],[w,top+2]],'#a9edf0',3);for(const x of[26,w-27])shape(t,[[x,top+25],[x+8,top+37],[x,top+52],[x-7,top+37]],'#aac5ea');}
   }
   this.terrain.set(key,tile);while(this.terrain.size>48)this.terrain.delete(this.terrain.keys().next().value);
  }
  c.drawImage(tile,s.x-3,s.y-12);
  if(s.tier){c.save();line(c,[[s.x+18,s.y],[s.x+18,s.y-26]],'#283f47',2);shape(c,[[s.x+18,s.y-26],[s.x+45,s.y-26],[s.x+40,s.y-11],[s.x+18,s.y-11]],region.edge,INK,1);c.fillStyle=INK;c.textAlign='center';c.font='bold 10px system-ui';c.fillText(`${s.tier}`,s.x+29,s.y-15);c.restore();}
 }
}
