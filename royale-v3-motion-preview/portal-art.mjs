const palettes=[null,['#58d8ff','#557d91','#e5dbb8'],['#84eb9e','#594f35','#b2d68d'],['#ffc66a','#53616a','#a7b5bd'],['#87ffdc','#56527b','#c1b2df'],['#d7f279','#684c6e','#d5a8cf'],['#c091ff','#403c70','#c6b8ef'],['#aaff75','#4f5d4b','#d5bd82']];
export function drawPortal(c,x,y,region,time,label='WORLD PORTAL'){
 const [energy,stone,edge]=palettes[region]||palettes[1],pulse=.88+.12*Math.sin(time*1.4);c.save();c.translate(x,y);
 c.fillStyle='#102330a0';c.beginPath();c.ellipse(0,0,48,9,0,0,Math.PI*2);c.fill();
 const light=c.createRadialGradient(0,-54,5,0,-54,55);light.addColorStop(0,energy+'aa');light.addColorStop(1,energy+'00');c.fillStyle=light;c.globalAlpha=pulse;c.fillRect(-56,-112,112,112);c.globalAlpha=1;
 // A reflected pool ties the dimensional energy to the portal's fixed footing.
 c.fillStyle=energy+'28';c.beginPath();c.ellipse(0,-1,37+2*pulse,5,0,0,Math.PI*2);c.fill();
 c.beginPath();c.ellipse(0,-49,25,43,0,0,Math.PI*2);const inner=c.createLinearGradient(-25,-95,25,0);inner.addColorStop(0,'#142332');inner.addColorStop(.5,energy+'a0');inner.addColorStop(1,'#17253b');c.fillStyle=inner;c.fill();
 c.save();c.clip();c.strokeStyle=energy;c.lineWidth=1.4;for(let i=0;i<6;i++){c.beginPath();c.ellipse(Math.sin(time*.6+i)*5,-49,8+i*4,10+i*8,time*.25+i*.3,0,Math.PI*2);c.globalAlpha=.18+i*.06;c.stroke();}c.restore();
 for(const side of [-1,1]){
  c.strokeStyle='#101d2b';c.lineWidth=15;c.beginPath();c.moveTo(side*32,-3);c.bezierCurveTo(side*34,-55,side*38,-87,side*4,-102);c.stroke();c.strokeStyle=stone;c.lineWidth=11;c.stroke();
  c.strokeStyle=edge;c.lineWidth=2;c.beginPath();c.moveTo(side*29,-10);c.quadraticCurveTo(side*27,-75,side*5,-97);c.stroke();
  for(let i=0;i<5;i++){const yy=-13-i*17,xx=side*(31-(i===4?6:0));c.fillStyle=edge;c.save();c.translate(xx,yy);c.rotate(side*.2);c.fillRect(-5,-2,10,3);c.restore();}
  if([2,5].includes(region)){c.strokeStyle=region===2?'#779b50':'#bd84be';c.lineWidth=3;c.beginPath();c.moveTo(side*44,0);c.bezierCurveTo(side*12,-20,side*51,-54,side*20,-93);c.stroke();for(let i=0;i<4;i++){c.fillStyle=energy;c.beginPath();c.ellipse(side*(35+i%2*4),-20-i*19,7,3,side*.7,0,Math.PI*2);c.fill();}}
  if(region===3){for(let i=0;i<3;i++){c.fillStyle='#b9b8a2';c.fillRect(side*34-5,-21-i*27,10,9);c.fillStyle='#293e46';c.fillRect(side*34-2,-18-i*27,4,3);}}
  if([4,6,7].includes(region)){c.fillStyle=edge;c.strokeStyle='#152535';c.beginPath();c.moveTo(side*38,-4);c.lineTo(side*47,-35);c.lineTo(side*34,-24);c.closePath();c.fill();c.stroke();}
 }
 c.fillStyle=stone;c.strokeStyle='#142333';c.lineWidth=2;c.beginPath();c.roundRect(-43,-7,86,11,3);c.fill();c.stroke();c.fillStyle=edge;c.fillRect(-35,-5,70,2);
 for(let i=0;i<5;i++){const a=time*.4+i*1.256;c.fillStyle=energy;c.globalAlpha=.35+.3*(.5+.5*Math.sin(a));c.beginPath();c.arc(Math.cos(a)*43,-53+Math.sin(a)*48,1.3,0,Math.PI*2);c.fill();c.strokeStyle=energy;c.lineWidth=1;c.beginPath();c.ellipse(0,-53,43,48,0,a-.12,a);c.stroke();}c.globalAlpha=1;
 c.fillStyle='#102330ee';c.beginPath();c.roundRect(-77,9,154,19,5);c.fill();c.fillStyle='#f6ecd6';c.font='bold 10px system-ui';c.textAlign='center';c.fillText(label,0,22,146);c.restore();
}
