// Deterministic comic scenery. Painting never writes to world/collision objects.
const TAU=Math.PI*2;
const line=(c,p,color,w=2)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.stroke();};
const poly=(c,p,color)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();};
const oval=(c,x,y,rx,ry,color)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill();};
const box=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
const noise=(n)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};

export function surfaceMaterial(s,region=1){
 if(!s)return 'dirt';
 if(s.kind==='wood'||s.kind==='metal'||s.kind==='sand'||s.kind==='grass')return s.kind;
 if(s.kind==='rock'||s.kind==='cave'||s.kind==='energy')return 'stone';
 if(s.kind==='factory'||s.kind==='final')return 'concrete';
 if(s.kind==='forest')return s.oneWay?'grass':'dirt';
 if(s.kind==='mutant')return 'dirt';
 return region===1?'sand':'stone';
}

export function paintLandscape(c,theme,near,night){
 const opacity=near?.75:.38;c.save();c.globalAlpha=opacity;
 for(let tileIndex=-1;tileIndex<9;tileIndex++){
  const i=(tileIndex%8+8)%8,x=tileIndex*192+35,y=near?590:510;
  if(theme==='coast'){
   if(!near){const h=35+noise(i)*60;box(c,x,y-h,58,h,'#668b91');poly(c,[[x-4,y-h],[x+30,y-h-25],[x+62,y-h]],'#bda987');for(let j=0;j<3;j++)box(c,x+8+j*16,y-h+12,8,12,night?'#ffdd9e':'#cde4d1');}
   else {line(c,[[x-45,y-40],[x+147,y-40]],'#82634d',13);for(let j=0;j<4;j++){const xx=x+j*45;line(c,[[xx,y-43],[xx-5,y+60]],'#5b5847',7);line(c,[[xx,y-70],[xx,y-40]],'#9e8e68',3);}line(c,[[x-40,y-66],[x+145,y-66]],'#c1b18b',3);}
  }else if(theme==='forest'||theme==='mutant'){
   const m=theme==='mutant',h=120+noise(i)*90;
   line(c,[[x,y],[x+10,y-h],[x-25,y-h-80]],m?'#74566f':'#4b5341',14);
   for(let j=0;j<6;j++)line(c,[[x+3,y-h*j/7],[x+10+Math.sin(j)*30,y-h*j/7-40]],'#b3a27b55',2);
   for(let j=0;j<5;j++)line(c,[[x,y-20],[x+(j-2)*18,y+10],[x+(j-2)*35,y+17]],m?'#684861':'#575841',5);
   if(i%2===0){poly(c,[[x-50,y],[x-40,y-23],[x-4,y-37],[x+32,y-14],[x+45,y]],'#587771');oval(c,x-10,y-25,22,7,m?'#a29b77':'#8d9b64');}
   for(let j=0;j<5;j++){const xx=x+j*20;line(c,[[xx,y],[xx-14,y-40],[xx-5,y-55]],m?'#b2819b':'#668360',2);oval(c,xx-14,y-35,13,4,m?'#96ae69':'#90a36c');}
   if(m&&i%3===0){line(c,[[x+45,y],[x+53,y-55]],'#a88ba2',5);oval(c,x+53,y-55,25,10,'#9e719e');for(let j=0;j<4;j++)oval(c,x+38+j*9,y-58,2,2,'#d4cc87');}
  }else if(theme==='factory'||theme==='final'){
   const ruined=theme==='final';line(c,[[x,y],[x,y-95],[x+110,y-95],[x+110,y-20]],'#8d8882',11);line(c,[[x-2,y],[x-2,y-97],[x+110,y-97]],'#c5b6a0',3);
   for(let j=0;j<4;j++){const xx=x+20+j*28;line(c,[[xx,y-104],[xx,y-85]],'#4c5861',2);box(c,xx,y-45,18,40,'#6e7877');}
   oval(c,x+90,y-42,30,30,'#303e49');oval(c,x+90,y-42,24,24,'#8c8372');for(let j=0;j<8;j++){const a=j*TAU/8;line(c,[[x+90,y-42],[x+90+Math.cos(a)*23,y-42+Math.sin(a)*23]],'#384952',4);}
   if(ruined){poly(c,[[x-50,y],[x-20,y-38],[x+15,y-15],[x+45,y-55],[x+65,y]],'#79737b');line(c,[[x-15,y-25],[x-8,y-70],[x+12,y-80]],'#404956',4);line(c,[[x+38,y-36],[x+44,y-75]],'#b48b76',3);}
  }else if(theme==='cave'){
   for(let j=0;j<4;j++){const xx=x+j*32,h=45+noise(i*7+j)*95;poly(c,[[xx-16,y],[xx-4,y-h],[xx+7,y-h-15],[xx+24,y]],'#53677c');poly(c,[[xx-4,y-h],[xx+7,y-h-15],[xx+24,y],[xx+4,y-10]],'#95a9ae');line(c,[[xx+4,y-h],[xx+8,y-15]],'#d5d2b7',1);}
   line(c,[[x-40,100],[x+20,145],[x+50,240]],'#92a0aa55',3);line(c,[[x-30,260],[x-8,300],[x+45,320]],'#c7bbd229',2);
  }else{
   const yy=y-100-noise(i)*150;poly(c,[[x-50,yy],[x+32,yy-15],[x+70,yy+25],[x+20,yy+70],[x-20,yy+45]],'#414969');poly(c,[[x-50,yy],[x+32,yy-15],[x+70,yy+25],[x+5,yy+18]],'#6e6e98');line(c,[[x-25,yy+6],[x,yy+24],[x+15,yy+52]],'#b7a0dd',3);
   for(let j=0;j<3;j++){const xx=x+j*15;poly(c,[[xx,yy],[xx-4,yy-50-j*15],[xx+6,yy-66-j*15],[xx+14,yy]],'#9b83cb');line(c,[[xx+6,yy-58-j*15],[xx+8,yy-5]],'#ded4ee',2);}
  }
 }
 c.restore();
}

export function paintTerrain(c,s,region){
 const mat=surfaceMaterial(s,region.id),w=s.w,depth=s.oneWay?68:Math.min(s.h,320),grass=mat==='grass'||s.kind==='forest',soil=grass||mat==='dirt'||mat==='sand';
 c.save();c.beginPath();c.moveTo(3,12);c.lineTo(w+3,12);
 if(s.oneWay){for(let x=w;x>=0;x-=18)c.lineTo(x+3,12+depth*(.6+.4*Math.sin(Math.PI*x/w))+noise(x)*7);}else{c.lineTo(w+3,12+depth);c.lineTo(3,12+depth);}c.closePath();c.clip();
 const grad=c.createLinearGradient(0,12,0,12+depth);grad.addColorStop(0,'#101c2900');grad.addColorStop(1,'#101c297a');c.fillStyle=grad;c.fillRect(3,12,w,depth);
 if(soil){
  for(let y=28;y<depth+12;y+=24){const points=[];for(let x=3;x<w+3;x+=12)points.push([x,y+noise(x+y)*9]);line(c,points,mat==='sand'?'#ecd09d55':'#d0ab7b38',2);}
  for(let i=0;i<w*depth/180;i++){const x=3+noise(i*3+5)*w,y=18+noise(i*3+7)*(depth-5),r=1+noise(i)*3;oval(c,x,y,r,r*.5,i%3?'#2031384d':'#eed8ac50');}
  if(grass||s.kind==='mutant')for(let x=22;x<w;x+=73){line(c,[[x,13],[x+9,31],[x+2,48],[x+18,64]],'#ad927064',3);line(c,[[x+8,30],[x-14,40]],'#a48c6955',2);}
 }else if(mat==='stone'||mat==='concrete'){
  for(let x=0;x<w;x+=46){const y=22+noise(x)*25;line(c,[[x+4,13],[x+17,y],[x+10,y+16],[x+31,y+29]],'#14283770',2);line(c,[[x+17,y],[x+37,y-4]],'#d7d3bd55',1);}
  for(let i=0;i<w*depth/260;i++){const x=noise(i*3)*w,y=17+noise(i*3+1)*depth;poly(c,[[x,y],[x+7,y-3],[x+12,y+3],[x+2,y+6]],'#e3d7c22c');}
  if(s.kind==='energy')for(let x=14;x<w;x+=90){line(c,[[x,18],[x+22,34],[x+16,51]],'#b7a3dd99',3);}
 }else if(mat==='metal'){
  for(let x=8;x<w;x+=28){line(c,[[x,16],[x+10,22]],'#d2d5c666',2);box(c,x+11,26,9,4,'#c4864c88');oval(c,x+4,22,2,2,'#172b38');}
 }else if(mat==='wood'){
  for(let x=6;x<w;x+=30){line(c,[[x+4,23],[x+17,25],[x+23,21]],'#d2ad7977',1);oval(c,x+18,30,4,2,'#362c2870');}
 }
 c.restore();
 if(grass){for(let x=4;x<w-5;x+=7){const h=4+noise(x)*8;poly(c,[[x,13],[x-2,12-h],[x+3,11-h/2],[x+7,12-h*1.2],[x+6,13]],x%2?'#709552':'#9db66c');}}
 if(mat==='sand')for(let x=4;x<w;x+=16)line(c,[[x,15],[x+8,14],[x+12,16]],'#fff0bd80',1);
}

export function animateLandscape(c,region,w,h,cx,cy,time){
 c.save();const theme=region.theme;
 for(let i=0;i<12;i++){
  const x=((i*157-cx*.23+time*(theme==='forest'?9:3))%(w+80)+w+80)%(w+80)-40,y=90+(i*79)%430-cy*.14;
  if(theme==='factory'||theme==='final'){c.globalAlpha=.08;for(let j=0;j<3;j++)oval(c,x+Math.sin(time*.5+i)*12,y-j*18-(time*13%65),12+j*5,10+j*4,'#d7d8c2');}
  else if(theme==='cave'){c.globalAlpha=.35;const yy=(y+time*(35+i)%370);line(c,[[x,yy],[x,yy+7]],'#d8e3e4',1);}
  else if(theme==='forest'||theme==='mutant'){c.globalAlpha=.25;c.save();c.translate(x,y+Math.sin(time+i)*15);c.rotate(time*.3+i);oval(c,0,0,4,1.5,theme==='mutant'?'#d7b3cc':'#cbd98c');c.restore();}
  else if(theme==='energy'){c.globalAlpha=.18+.1*Math.sin(time+i);oval(c,x,y+Math.sin(time+i)*9,2,2,'#dbb4f7');}
  else if(i<3){line(c,[[x-7,y],[x,y-3-Math.sin(time*3+i)*2],[x+7,y]],'#385d6d66',1);}
 }
 c.restore();
}
