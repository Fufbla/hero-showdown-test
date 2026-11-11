// Presets are choices, never indices in a save. Existing hex values remain exact.
const depths=['Very pale','Light','Light medium','Medium','Tan','Brown','Deep brown','Very dark'];
const columns={
  Cool:['#f6e1df','#ead0cb','#d7b0aa','#c09088','#a87570','#87574f','#623c38','#372327'],
  Neutral:['#f6e4d5','#e9c9ad','#d7ac89','#c08d65','#a76e48','#855031','#603923','#35231b'],
  Warm:['#f8e4ce','#edc6a0','#dda776','#c98a55','#b57442','#91552e','#683a20','#3d2619'],
  Golden:['#f5e6c9','#e8cca0','#d9b47e','#c69a61','#ac7d44','#8b5f32','#664425','#3c2b1c'],
  Olive:['#ede4ce','#dcd0ac','#c7b28a','#b39b71','#97805a','#796143','#574731','#332c21'],
  'Reddish brown':['#f2ddd2','#e6c0ad','#d4a28a','#be8369','#a5664c','#844a35','#613527','#3b241e'],
};
export const SKIN_UNDERTONES=Object.keys(columns);
export const NATURAL_SKIN_TONES=Object.freeze(depths.flatMap((depth,i)=>SKIN_UNDERTONES.map(undertone=>Object.freeze({color:columns[undertone][i],name:depth+' · '+undertone,depth,undertone}))));
export const GENERAL_COLORS=['#ffffff','#181b25','#767c86','#e03443','#ff943b','#f2d144','#34a66b','#32b9bf','#3c72d9','#8554cf','#dc71b1','#835139'];
export const rgbOf=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
export function hexToHSV(hex){
  const [r,g,b]=rgbOf(hex).map(v=>v/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  let h=!d?0:max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;
  return {h:(h*60+360)%360,s:max?d/max*100:0,v:max*100};
}
export function hsvToHex({h,s,v}){
  h=((Number(h)%360)+360)%360;s=Math.max(0,Math.min(100,Number(s)))/100;v=Math.max(0,Math.min(100,Number(v)))/100;
  const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;
  const triplet=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return '#'+triplet.map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('');
}
