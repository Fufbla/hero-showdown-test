import {hairDefinition} from './hair-catalog.mjs';
const state=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function hairMotion(owner,h,time,style,dt=1/60){
 const d=hairDefinition(style),length=d?.length??20,soft=d?.texture==='curl'||d?.texture==='coil';
 const target=clamp(-(h.vx||0)/95+(h.vy||0)/250+(h.stun?-2:0)+(h.attack?Math.sin(h.attack.age*15)*1.8:0),-7,7);
 let s=owner&&state.get(owner);if(!s){s={wind:target,face:h.face,time};if(owner)state.set(owner,s);}
 if(s.face!==h.face){s.wind=-s.wind;s.face=h.face;}
 const delta=clamp(time-s.time,0,.05);s.time=time;s.wind+=(target-s.wind)*(1-Math.exp(-delta*9));
 return {wind:length?s.wind*Math.min(1,length/20):0,bounce:Math.sin(time*(soft?5:3.1))*((soft?.65:.25)+Math.min(1,Math.abs(h.vx||0)/300))*(length?1:.25)};
}
export function drawDetailedHair(c,l,back=false,time=0,layer='front'){
 const d=hairDefinition(l.hair);if(!d)return false;
 const ink='#121923',color=l.hairColor,m=l.hairMotion||{wind:0,bounce:0},v=d.volume;
 const tone=(n)=>'#'+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(color.slice(i,i+2),16)*n)).toString(16).padStart(2,'0')).join('');
 const grad=c.createLinearGradient(-17,-23,18,20);grad.addColorStop(0,ink);grad.addColorStop(.28,tone(1.7));grad.addColorStop(.48,color);grad.addColorStop(1,ink);
 const ellipse=(x,y,rx,ry,fill=grad)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);const shade=c.createRadialGradient(x-rx*.3,y-ry*.4,.1,x,y,Math.max(rx,ry));shade.addColorStop(0,tone(1.7));shade.addColorStop(.5,color);shade.addColorStop(1,tone(.5));c.fillStyle=fill===grad?shade:fill;c.fill();c.strokeStyle=ink;c.lineWidth=.45;c.stroke();};
 const stroke=(pts,width,color)=>{c.beginPath();c.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)c.lineTo(...pts[i]);c.lineWidth=width;c.strokeStyle=color;c.lineCap='round';c.lineJoin='round';c.stroke();};
 const lock=(x,y,length,index,width=2.6)=>{
  const pts=[];for(let k=0;k<=10;k++){const f=k/10,phase=time*3-index*.7-k*.18;pts.push([x+m.wind*f*f+Math.sin(phase)*(d.texture==='wave'?2:d.texture==='curl'?3:.35)*f,y+length*f+m.bounce*f]);}
  for(let k=1;k<pts.length;k++){const taper=1-k/pts.length*.65;stroke([pts[k-1],pts[k]],width*taper+.7,ink);stroke([pts[k-1],pts[k]],width*taper,grad);}stroke(pts.map(([x,y])=>[x-.4,y]),.35,'#ffffff35');
  if(['braid','twist','loc'].includes(d.texture))for(let k=1;k<pts.length;k++){const [px,py]=pts[k],a=d.texture==='braid'?(k%2?1:-1):1;stroke([[px-width*.35,py-a*.6],[px+width*.35,py+a*.6]],.55,d.texture==='loc'?'#0a0e1555':'#c9b7a45a');}
  if(d.texture==='curl')for(let k=1;k<pts.length;k+=2){const [px,py]=pts[k];c.beginPath();c.arc(px,py,width*.65,.2,5.4);c.strokeStyle='#ffffff35';c.lineWidth=.6;c.stroke();}
 };
 const puff=(x,y,size)=>{ellipse(x,y,size,size*.9);for(let i=0;i<24;i++){const a=i*2.4,r=Math.sqrt(i/24)*size;ellipse(x+Math.cos(a)*r,y+Math.sin(a)*r,1.9,1.6,i%3?grad:color);}};
 c.save();
 if(layer==='rear'){
  if(['loose','bob','half'].includes(d.shape)&&d.length>8)for(let i=0;i<9;i++)lock(-13+i*3.25,-10,d.length+(d.shape==='bob'?Math.sin(i)*2:0),i,d.texture==='straight'?4:3.4);
  if(d.shape.includes('tail')){const y=d.shape==='high-tail'?-17:1;ellipse(-11,y,3,2,l.trim||'#d8bf80');for(let i=0;i<4;i++)lock(-13-i*1.8,y,d.length-i*2,i,3.6);}
  c.restore();return true;
 }
 // Fitted scalp cap: every silhouette is rooted at the temples and crown.
 ellipse(0,-12,12.8,6.5);
 if(['round','fade','taper'].includes(d.shape)){
  const rx=d.shape==='taper'?10:13*v,ry=d.shape==='fade'?7*v:10*v;
  for(let i=0;i<36;i++){const a=i*2.4,r=Math.sqrt(i/36);ellipse(Math.cos(a)*rx*r,-13+Math.sin(a)*ry*r,1.8*v,1.6*v);}
 }else if(d.shape==='buzz'){for(let i=0;i<25;i++){const x=Math.sin(i*5)*11,y=-10-Math.abs(Math.cos(i*3))*8;stroke([[x,y],[x+.4,y-.6]],.5,'#ffffff38');}}
 else if(d.shape==='flat'){c.fillStyle=grad;c.fillRect(-11,-28,22,19);for(let i=0;i<110;i++){const x=-10+(i%11)*2,y=-27+Math.floor(i/11)*1.7;ellipse(x+Math.sin(i*3)*.4,y,1.3,1.2);} }
 else if(d.shape==='knots'){for(let i=0;i<5;i++)puff(-12+i*6,-11-Math.sin(i/4*Math.PI)*13,3.4);}
 else if(d.shape==='double'){puff(-14,-16,7*v);puff(14,-16,7*v);}
 else if(d.shape==='bun'||d.shape==='half'){puff(0,-21,7*v);if(d.texture==='loc')for(let i=0;i<6;i++)lock(-7+i*2.7,-25,11,i,2.5);}
 else if(d.shape==='crown'){for(let i=0;i<12;i++){const a=Math.PI+i/11*Math.PI;ellipse(Math.cos(a)*12,-7+Math.sin(a)*14,2.5,3);}}
 else if(d.shape==='spikes'){for(let i=0;i<9;i++){const x=-12+i*3;stroke([[x,-10],[x+2,-19-Math.sin(i/8*Math.PI)*8],[x+3,-10]],2.8,grad);}}
 else if(d.shape==='sweep'||d.shape==='crop'){for(let i=0;i<12;i++){c.beginPath();c.moveTo(-11+i*2,-7);c.quadraticCurveTo(-15+i*1.7+d.part*6,-15-8*v,8+d.part*4,-16);c.strokeStyle=i%3?grad:'#ffffff45';c.lineWidth=i%3?2:.5;c.stroke();}}
 else {
  for(let i=0;i<9;i++){const x=-12+i*3,side=i<2||i>6;c.beginPath();c.moveTo(x,-8);c.quadraticCurveTo(x+d.part*4,-20,0+d.part*4,-18);c.strokeStyle=i%2?grad:'#ffffff30';c.lineWidth=d.shape==='rows'?1.7:1;c.stroke();if(side&&d.length>8&&!back)lock(x,-8,Math.min(d.length,27),i,d.texture==='straight'?2.8:2.5);}
 }
 if(back&&d.length>8&&['loose','bob','half'].includes(d.shape))for(let i=0;i<8;i++)lock(-11+i*3,-12,d.length,i,3.2);
 c.restore();return true;
}
