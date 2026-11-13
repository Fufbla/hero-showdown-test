// Decorative layers only. These coordinates never become platforms or hazards.
// Textured silhouettes are baked once; animation uses a bounded number of paths.
const TAU=Math.PI*2, TILE=1536;
const mod=(x,n)=>((x%n)+n)%n;
const tones={coast:['#86a7a4','#aab8a4','#d5d8b9'],forest:['#668b7c','#90aa86','#c6d3aa'],factory:['#7d8f94','#a5aaa0','#d7cbb4'],cave:['#343e58','#59617a','#a7a6af'],mutant:['#8d8398','#b1a1ac','#dbbfbc'],energy:['#62668e','#9395bb','#c4c6df'],final:['#977b87','#b4a0a1','#dbc0ad']};
export function paintHorizon(c,theme,night){
 const colors=tones[theme]||tones.coast;
 for(let layer=0;layer<3;layer++){
  c.beginPath();c.moveTo(0,360);
  for(let x=0;x<=768;x+=16){const y=185+layer*45+Math.sin(x/768*TAU+layer*2)*26+Math.cos(x/768*TAU*3+layer)*12;c.lineTo(x,y);}
  c.lineTo(768,360);c.closePath();c.fillStyle=night?['#283c53','#30485a','#3b5260'][layer]:colors[layer];c.globalAlpha=.46+layer*.12;c.fill();
  // Faceted lit ridge and shaded gullies, retained in the cached image.
  for(let x=12;x<768;x+=64){const y=185+layer*45+Math.sin(x/768*TAU+layer*2)*26+Math.cos(x/768*TAU*3+layer)*12;c.beginPath();c.moveTo(x,y);c.lineTo(x+26,y+19);c.lineTo(x+15,y+53);c.strokeStyle=night?'#c6d0e116':'#f0e9cc38';c.lineWidth=1;c.stroke();}
 }
 c.globalAlpha=1;
}
function twig(c,x,y,phase,mutant){
 const bend=Math.sin(phase)*5, lift=Math.cos(phase*.73)*1.5;
 c.strokeStyle=mutant?'#786274':'#426459';c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+11+bend*.3,y-25,x+29+bend,y-43+lift);c.stroke();
 for(let j=0;j<5;j++){const px=x+5+j*5+bend*j/5,py=y-9-j*7+lift*j/5;c.beginPath();c.ellipse(px+(j%2?7:-7),py,11,3.6,(j%2?-.45:.45)+bend*.016,0,TAU);c.fillStyle=mutant?(j%2?'#b59ca7':'#7b957b'):(j%2?'#94ae7c':'#527f69');c.fill();}
}
export function animateLivingWorld(c,region,width,height,cx,cy,time,night){
 const theme=region.theme,vegetation=['coast','forest','mutant'].includes(theme),floor=610-cy*.32;
 c.save();
 // Branch roots stay pinned to their scenery layer; only tips bend in wind.
 if(vegetation){
  const first=Math.floor(cx*.32/256)-1,last=Math.min(first+12,Math.ceil((cx*.32+width)/256));
  for(let i=first;i<=last;i++){
   const x=i*256+96-cx*.32,phase=time*.85+i*1.7;if(x < -80 || x > width+80)continue;
   twig(c,x,floor,phase,theme==='mutant');if(theme==='coast')twig(c,x+36,floor+3,phase+1.2,false);
   // A branch at canopy height gives the trees visible motion without moving trunks.
   if(theme!=='coast')twig(c,x+55,floor-225,phase*.8,theme==='mutant');
  }
 }
 // Streams are distant scenery, beneath the world/platform pass.
 if(theme==='forest'||theme==='cave'||theme==='mutant'){
  const base=height*.70-cy*.12;c.fillStyle=theme==='cave'?'#7ea29d21':'#a1c9b528';c.fillRect(0,base,width,23);
  c.strokeStyle=theme==='cave'?'#d5f1b35e':'#e5f0ce60';c.lineWidth=1;
  c.beginPath();for(let i=0;i<Math.min(16,Math.ceil(width/100)+2);i++){const x=mod(i*107+time*14-cx*.12,width+120)-60,y=base+6+(i%3)*6+Math.sin(time+i);c.moveTo(x,y);c.lineTo(x+24+(i%4)*4,y);}c.stroke();
 }
 // Faint shafts and dust preserve the illustrated lighting, without blur filters.
 if(!night&&(theme==='forest'||theme==='coast')){
  c.fillStyle='#fff4c4';c.globalAlpha=.035+.012*Math.sin(time*.24);
  for(let i=0;i<3;i++){const x=i*510+130-cx*.06%510;c.beginPath();c.moveTo(x,0);c.lineTo(x+26,0);c.lineTo(x+175,height);c.lineTo(x+86,height);c.closePath();c.fill();}
 }
 if(theme==='energy'||theme==='cave'){
  c.globalAlpha=.12+.055*Math.sin(time*.8);c.strokeStyle=theme==='energy'?'#c4c5f4':'#bce7b7';c.lineWidth=2;c.beginPath();
  for(let i=0;i<Math.min(8,Math.ceil(width/240)+1);i++){const x=i*240-mod(cx*.32,240)+50,y=510-cy*.32; c.moveTo(x,y);c.lineTo(x+5,y-20);c.lineTo(x+12,y-4);}c.stroke();
 }
 c.restore();
}
export const LIVING_WORLD_THEMES=Object.freeze(Object.keys(tones));

// Sparse animated blades are attached to real surface tops, never offset by parallax.
export function animateSurfaceFringe(c,s,region,time,camera,width){
 if(!['coast','forest','mutant'].includes(region.theme)||['wood','metal','rock'].includes(s.kind))return;
 const origin=s.x+12,first=origin+Math.max(0,Math.ceil((camera-18-origin)/90))*90,end=Math.min(s.x+s.w-10,camera+width+18);
 c.save();c.strokeStyle=region.accent;c.lineWidth=1.5;c.globalAlpha=.8;c.beginPath();
 for(let x=first,n=0;x<end&&n<16;x+=90,n++){const wind=Math.sin(time*1.3+x*.017)*3;for(let j=0;j<3;j++){c.moveTo(x+j*3,s.y+1);c.quadraticCurveTo(x+j*3+wind*.4,s.y-5,x+j*3+wind+(j-1)*4,s.y-8-j%2*5);}}c.stroke();c.restore();
}
