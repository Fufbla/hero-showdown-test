// Illustration and animation only: this module never reads or writes rewards.
let atlas,loading;
export function prepareRewardChests(){
 if(atlas)return Promise.resolve(atlas);if(loading)return loading;
 if(typeof Image==='undefined')return Promise.resolve(null);
 loading=new Promise(resolve=>{const image=new Image();image.onload=()=>{atlas=image;resolve(image);};image.onerror=()=>resolve(null);image.src=new URL('./assets/reward-chests.png',import.meta.url).href;});return loading;
}
export const chestFrame=progress=>progress<=0?0:progress<.55?1:2;
export function drawRewardChest(c,x,y,{legendary=false,progress=0,width=112,time=0,image=atlas}={}){
 if(!image){void prepareRewardChests();return false;}
 const frame=chestFrame(progress),scale=width/420;
 c.save();c.translate(x,y);c.fillStyle='#061c2870';c.beginPath();c.ellipse(0,-3,width*.43,width*.075,0,0,Math.PI*2);c.fill();
 if(progress>0){const glow=c.createRadialGradient(0,-width*.5,1,0,-width*.5,width*.65);glow.addColorStop(0,legendary?'#d7b0f070':'#f9de8e70');glow.addColorStop(1,'#e9db9c00');c.fillStyle=glow;c.fillRect(-width,-width*1.4,width*2,width*1.5);}
 c.drawImage(image,frame*512,legendary?512:0,512,512,-256*scale,-460*scale,512*scale,512*scale);
 if(progress>0)for(let i=0;i<5;i++){const a=i*1.256+time*.4,dy=(time*.25+i*.2)%1;c.globalAlpha=(1-dy)*.7;c.fillStyle=legendary?'#e5c5ff':'#ffe9a6';c.fillRect(Math.cos(a)*width*.35,-width*(.4+dy*.6),2,3);}
 c.restore();return true;
}
export function chestPresentation(legendary=false){
 const canvas=document.createElement('canvas');canvas.width=320;canvas.height=230;canvas.className='reward-chest-art';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',legendary?'Opened Legendary reward chest':'Boss treasure chest opening');canvas.style.cssText='display:block;width:180px;max-width:100%;height:auto;margin:0 auto';
 void prepareRewardChests().then(()=>{const started=performance.now();function frame(now){if(!canvas.isConnected)return;const t=(now-started)/1000,c=canvas.getContext('2d');c.clearRect(0,0,320,230);drawRewardChest(c,160,218,{legendary,progress:Math.min(1,t/.9),width:205,time:t});if(t<1.2)requestAnimationFrame(frame);}requestAnimationFrame(frame);});return canvas;
}
