'use strict';
// Presentation only. No fighter state or combat timing is changed by this module.
(() => {
  const DURATION=25, clamp01=n=>Math.max(0,Math.min(1,n));
  const ease=n=>1-Math.pow(1-clamp01(n),3);
  const root=document.createElement('section');
  root.id='healthia-opening';root.setAttribute('aria-label','Healthia opening cinematic');
  root.innerHTML='<canvas width="1280" height="720" aria-label="Healthia heroes defend Buckroe Beach"></canvas><div class="intro-controls"><button type="button" class="intro-audio">ENABLE SOUND</button><button type="button" class="intro-skip">SKIP INTRO <span>ESC / A / START</span></button></div>';
  const style=document.createElement('style');
  style.textContent=`#healthia-opening{position:fixed;inset:0;z-index:10000;background:#03070b;display:flex;align-items:center;justify-content:center;touch-action:manipulation}#healthia-opening canvas{display:block;width:min(100vw,177.7778vh);height:auto;max-height:100vh;aspect-ratio:16/9}#healthia-opening .intro-controls{position:absolute;bottom:max(18px,env(safe-area-inset-bottom));left:max(18px,env(safe-area-inset-left));right:max(18px,env(safe-area-inset-right));display:flex;justify-content:space-between;gap:12px}#healthia-opening button{border:1px solid #d1e4cf66;background:#06151bd9;color:#e9f6df;border-radius:4px;padding:12px 17px;font:800 12px Arial;letter-spacing:1.5px;cursor:pointer;min-height:44px}#healthia-opening button:focus-visible{outline:3px solid #d6ff89;outline-offset:4px}#healthia-opening button span{font-size:10px;color:#94a6ad;margin-left:8px}@media(max-width:600px){#healthia-opening button span{display:none}#healthia-opening button{font-size:10px;padding:10px}}`;
  document.head.append(style);document.body.append(root);
  const c=root.querySelector('canvas'),g=c.getContext('2d'),audioButton=root.querySelector('.intro-audio'),skipButton=root.querySelector('.intro-skip');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const previousFocus=document.activeElement;
  const shell=document.querySelector('.shell'),wasInert=shell?.inert;
  if(shell)shell.inert=true;
  let started=false,done=false,elapsed=0,lastStamp=0,exitAge=-1,padWasDown=false;
  let sound=null,beat=-1,lastCue=-1;
  const intro={active:true,start(){if(started||done)return;started=true;elapsed=0;lastStamp=0;},skip(){leave();},dismiss(){finish();}};
  window.HealthiaIntro=intro;
  function label(s,x,y,size=20,color='#f0f5df',align='left'){
    g.font=`900 ${size}px Arial, sans-serif`;g.textAlign=align;g.fillStyle=color;g.fillText(s,x,y);
  }
  function panelLabel(kicker,title){
    label(kicker,82,117,15,'#c2e59d');g.fillStyle='#d5fb91';g.fillRect(82,134,47,3);
    label(title,80,188,40); 
  }
  function frameSprite(im,def,pose,x,feet,height,face=1){
    const f=def.frames[pose];if(!f||!im?.width)return;
    const s=height/def.referenceHeight;
    g.save();g.translate(x,feet);g.scale(face*s,s);g.drawImage(im,...f.rect,-f.anchor[0],-f.anchor[1],f.rect[2],f.rect[3]);g.restore();
  }
  function crop(im,r,x,feet,height,face=1){
    if(!im?.width)return;const w=height*r[2]/r[3];
    g.save();g.translate(x,feet);g.scale(face,1);g.drawImage(im,...r,-w/2,-height,w,height);g.restore();
  }
  function villain(i,x,feet,h,time=0,face=1){
    g.save();g.translate(0,reduced?0:Math.sin(time*2+i)*3);
    switch(i){
      case 0:crop(atlas,[620*atlas.width/1255,630*atlas.height/1255,635*atlas.width/1255,625*atlas.height/1255],x,feet,h,face);break;
      case 1:frameSprite(dogMotionSheet,dogMotionFrames,4,x,feet,h,face);break;
      case 2:frameSprite(sonicMotionSheet,sonicMotionFrames,4,x,feet,h,face);break;
      case 3:frameSprite(bearMotionSheet,bearMotionFrames,4,x+100*face,feet,h*.72,face);frameSprite(trainerMotionSheet,trainerMotionFrames,4,x-155*face,feet,h*.85,face);break;
      case 4:crop(styroAtlas,styroRects[0],x,feet,h,face);break;
      case 5:crop(wasteAtlas,wasteRects[0],x,feet,h,face);break;
      case 6:crop(atomImage,[0,0,atomImage.width,atomImage.height],x,feet,h,face);break;
      case 7:frameSprite(spreeSheet,spreeFrames,0,x,feet,h,face);break;
    }g.restore();
  }
  function heroSprite(i,x,feet,height,pose,time,face=1){
    // An extra plain-green cape layer provides soft cloth follow-through behind the existing art.
    g.save();g.translate(x,feet);g.scale(face,1);
    const wave=reduced?0:Math.sin(time*5+i)*15;
    g.fillStyle='#145845';g.beginPath();g.moveTo(-20,-height*.79);g.bezierCurveTo(-90,-height*.72,-100+wave,-height*.35,-150+wave,-height*.18);g.quadraticCurveTo(-60,-height*.1,-12,-height*.37);g.closePath();g.fill();g.restore();
    frameSprite(animationSheets[i],atlasDefinitions[i],pose,x,feet,height,face);
  }
  function beach(time,dark=.45){
    const z=reduced?1:1.03+Math.min(time,25)*.0018;
    g.save();g.translate(640,360);g.scale(z,z);g.drawImage(venueImages[0],-640-(reduced?0:Math.sin(time*.15)*15),-360,1280,720);g.restore();
    g.fillStyle=`rgba(3,12,24,${dark})`;g.fillRect(0,0,1280,720);
    const grad=g.createLinearGradient(0,0,0,720);grad.addColorStop(0,'#07101de6');grad.addColorStop(.5,'#0b223900');grad.addColorStop(1,'#02090de8');g.fillStyle=grad;g.fillRect(0,0,1280,720);
  }
  function clouds(time,amount=1){
    g.save();g.globalAlpha=amount;
    for(let i=0;i<12;i++){
      const x=((i*151+(reduced?0:time*22))%1580)-150,y=90+Math.sin(i*3.1)*55;
      const q=g.createRadialGradient(x,y,8,x,y,190);q.addColorStop(0,'#121b26ee');q.addColorStop(.6,'#182333b0');q.addColorStop(1,'#0d152000');g.fillStyle=q;g.fillRect(x-190,y-190,380,380);
    }g.restore();
  }
  function motes(time,color='#c5e8a3',count=36){
    g.save();g.fillStyle=color;
    for(let i=0;i<count;i++){const x=(i*117.31+time*(8+i%5))%1280,y=720-((i*67.7+time*(13+i%7))%720);g.globalAlpha=.12+(i%4)*.08;g.fillRect(x,y,1+i%3,1+i%3);}g.restore();
  }
  function rays(time,x=640,y=380){
    g.save();g.translate(x,y);g.strokeStyle='#e5ffbd55';g.lineWidth=2;
    for(let i=0;i<22;i++){const a=i*Math.PI*2/22+(reduced?0:time*.015),r=240+(i%3)*24;g.beginPath();g.moveTo(Math.cos(a)*r,Math.sin(a)*r);g.lineTo(Math.cos(a)*1000,Math.sin(a)*1000);g.stroke();}g.restore();
  }
  function slash(q){
    if(reduced||q<0||q>1)return;g.save();g.translate(-500+q*2100,0);g.transform(1,0,-.35,1,0,0);g.fillStyle='#d8fb9b';g.fillRect(0,0,70,720);g.fillStyle='#041019';g.fillRect(78,0,200,720);g.restore();
  }
  function vignette(){
    const v=g.createRadialGradient(640,340,190,640,340,760);v.addColorStop(0,'#0000');v.addColorStop(1,'#000b');g.fillStyle=v;g.fillRect(0,0,1280,720);
    g.fillStyle='#03080d';g.fillRect(0,0,1280,46);g.fillRect(0,674,1280,46);
  }
  function render(time){
    g.clearRect(0,0,1280,720);g.fillStyle='#03070b';g.fillRect(0,0,1280,720);
    if(!started){label('JAMES CLAN COMICS',640,340,19,'#d4edc0','center');label('PREPARING THE SHOWDOWN',640,380,12,'#809697','center');return;}
    if(time<2){
      g.globalAlpha=clamp01(time/.8)*clamp01((2-time)/.6);label('JAMES CLAN COMICS',640,346,24,'#d4edc0','center');label('PRESENTS',640,383,12,'#829a9c','center');g.globalAlpha=1;
    }else if(time<5){
      const q=(time-2)/3;beach(time,.2+q*.32);clouds(time,ease(q));motes(time,'#78949c');
      panelLabel('HAMPTON ROADS, VIRGINIA','BUCKROE BEACH');
      label('A shadow falls over our home.',82,620,22);
    }else if(time<7.8){
      const q=(time-5)/2.8;beach(time,.64);clouds(time,1);
      g.save();g.globalAlpha=ease(q*2);villain(0,770,690+(1-ease(q))*180,500+q*100,time);g.restore();
      panelLabel('THE AIR TURNS AGAINST US','POLLUTION RISES');clouds(time+14,.4);
    }else if(time<12){
      const local=time-7.8,group=Math.min(3,Math.floor(local/1.05)),q=(local%1.05)/1.05;
      const groups=[[4,5],[2,3],[6,1],[7,0]],names=[['DR. STYRO','WASTELANDER'],['SONIC TUSK','VENOMIS & THORNBEAR'],['ATOMDUST','STYRODOG'],['LIGHTENING SPREE','AIR POLLUTION MONSTER']];
      for(let side=0;side<2;side++){
        g.save();g.beginPath();g.rect(side*640,46,640,628);g.clip();
        const grad=g.createLinearGradient(0,60,1280,650);grad.addColorStop(0,group===3?'#233b64':'#172c35');grad.addColorStop(1,'#331a2a');g.fillStyle=grad;g.fillRect(side*640,46,640,628);
        const x=side*640+320+(reduced?0:(side?-1:1)*(1-ease(q*3))*95);
        rays(time,x,380);villain(groups[group][side],x,605,430+q*22,time,side?-1:1);
        g.fillStyle='#041019dd';g.fillRect(side*640,574,640,100);label(names[group][side],side*640+320,624,side&&group===1?24:28,'#f0f5df','center');g.restore();
      }
      g.strokeStyle='#d8fb9b';g.lineWidth=5;g.beginPath();g.moveTo(680,46);g.lineTo(600,674);g.stroke();slash(q*5);
    }else if(time<17.7){
      const local=time-12,i=Math.min(2,Math.floor(local/1.9)),q=(local%1.9)/1.9;
      beach(time,.48);rays(time,800,370);motes(time);
      const names=['SUPER SUMMY','SUPER SADIE','SUPER VEE'],tags=['THE WORLD IS WORTH FIGHTING FOR.','STAND STRONG. STRIKE BACK.','SMALL HERO. FEARLESS HEART.'];
      panelLabel('HEALTHIA HEROES',names[i]);label(tags[i],82,236,18,'#c2e59d');
      const entry=ease(q*3),x=850+(1-entry)*450;
      heroSprite(i,x,645, i===0?470:435,q<.17?1+Math.floor(q*30)%6:15,time);
      g.strokeStyle='#d4ff9d';g.lineWidth=3;g.beginPath();g.ellipse(x,647,170,12,0,0,Math.PI*2);g.stroke();slash(q*7);
    }else if(time<21.3){
      const local=time-17.7,i=Math.min(2,Math.floor(local/1.2)),q=(local%1.2)/1.2;
      beach(time,.62);rays(time,650,355);
      const lunge=ease(q/.45),impact=Math.max(0,1-Math.abs(q-.48)*13);
      g.save();if(!reduced){g.translate(640,360);g.scale(1+q*.06,1+q*.06);g.translate(-640,-360);}
      villain([5,4,2][i],910+impact*20,640,430,time);
      heroSprite(i,360+lunge*210,640,i===0?425:395,q<.2?7:q<.65?9:15,time);
      g.restore();
      g.save();g.globalAlpha=impact;g.translate(730,380);g.strokeStyle='#e6ffae';g.lineWidth=9;for(let j=0;j<12;j++){const a=j*Math.PI/6;g.beginPath();g.moveTo(Math.cos(a)*28,Math.sin(a)*28);g.lineTo(Math.cos(a)*130,Math.sin(a)*130);g.stroke();}g.restore();
      label(['PROTECT.','UNITE.','FIGHT BACK.'][i],80,130,55,'#e3ffb1');slash(q*6);
    }else{
      const q=clamp01((time-21.3)/1.2);beach(time,.48);rays(time,640,300);motes(time,'#dcffae',60);
      const light=g.createRadialGradient(640,420,10,640,420,550);light.addColorStop(0,'#c8f7a54a');light.addColorStop(1,'#72af7d00');g.fillStyle=light;g.fillRect(0,46,1280,628);
      heroSprite(1,420-(1-ease(q))*120,660,345,15,time,1);heroSprite(2,870+(1-ease(q))*120,660,335,15,time,-1);heroSprite(0,660,660,390,15,time,1);
      g.save();g.globalAlpha=ease(q);g.translate(640,0);const scale=reduced?1:1+(1-ease(q))*.3;g.scale(scale,scale);
      g.shadowColor='#05131b';g.shadowBlur=20;label('HEALTHIA',0,134,24,'#e1ffb4','center');label('HERO SHOWDOWN',0,211,70,'#f4f2dd','center');g.shadowBlur=0;
      g.fillStyle='#dcff9f';g.fillRect(-120,230,240,3);label('OUR HOME. OUR FIGHT.',0,263,16,'#c3dcbe','center');g.restore();
    }
    vignette();
    // Film fades, with no rapid full-screen flashes.
    const boundaries=[2,5,7.8,12,17.7,21.3];let fade=0;
    for(const b of boundaries)fade=Math.max(fade,Math.max(0,1-Math.abs(time-b)/.13));
    if(fade){g.fillStyle=`rgba(3,7,11,${fade*.75})`;g.fillRect(0,0,1280,720);}
  }
  function makeSound(){
    const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;
    const ac=new A(),mix=ac.createGain(),compress=ac.createDynamicsCompressor();mix.gain.value=.22;mix.connect(compress);compress.connect(ac.destination);
    const noise=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    const sources=new Set();
    function tone(f,dur,volume=.12,type='sine'){
      if(ac.state!=='running')return;const o=ac.createOscillator(),v=ac.createGain();o.type=type;o.frequency.value=f;v.gain.setValueAtTime(.0001,ac.currentTime);v.gain.exponentialRampToValueAtTime(volume,ac.currentTime+.025);v.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+dur);o.connect(v);v.connect(mix);o.start();o.stop(ac.currentTime+dur+.05);sources.add(o);o.onended=()=>{sources.delete(o);o.disconnect();v.disconnect();};
    }
    function rush(dur=.7,volume=.15,cutoff=700){
      if(ac.state!=='running')return;const n=ac.createBufferSource(),v=ac.createGain(),f=ac.createBiquadFilter();n.buffer=noise;n.loop=true;f.type='lowpass';f.frequency.value=cutoff;v.gain.setValueAtTime(.0001,ac.currentTime);v.gain.linearRampToValueAtTime(volume,ac.currentTime+.08);v.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+dur);n.connect(f);f.connect(v);v.connect(mix);n.start();n.stop(ac.currentTime+dur+.05);sources.add(n);n.onended=()=>{sources.delete(n);n.disconnect();f.disconnect();v.disconnect();};
    }
    return {ac,tone,rush,stop(){mix.gain.setTargetAtTime(0,ac.currentTime,.04);for(const s of sources){try{s.stop(ac.currentTime+.2);}catch(_){}}setTimeout(()=>ac.close().catch(()=>{}),250);}};
  }
  async function enableAudio(){
    if(done)return;
    try{if(!sound)sound=makeSound();if(!sound){audioButton.textContent='SOUND UNAVAILABLE';return;}
      await sound.ac.resume();audioButton.textContent=sound.ac.state==='running'?'SOUND ON':'ENABLE SOUND';
      if(sound.ac.state==='running'){sound.rush(1.7,.15,260);sound.tone(43.65,1.8,.22);}
    }catch(_){audioButton.textContent='ENABLE SOUND';}
  }
  function score(){
    if(!sound||sound.ac.state!=='running')return;
    const b=Math.floor(elapsed/.43);if(b!==beat){beat=b;
      const roots=[65.406,51.913,58.27,48.999],f=roots[Math.floor(b/8)%4];
      sound.tone(f,.8,.17);if(b%2===0){sound.tone(f*2,1.4,.055,'triangle');sound.tone(f*2.9966,1.3,.04);}
      if(elapsed>7.8){sound.tone(b%2?90:48,.16,.24);if(b%2)sound.rush(.13,.10,1600);}
      if(elapsed>12)sound.tone(f*[4,5.993,4.7568,8][b%4],.32,.055);
    }
    const cues=[.3,2.1,5.1,7.8,8.85,9.9,10.95,12,13.9,15.8,18.25,19.45,20.65,21.3];
    const cue=cues.reduce((v,x,i)=>elapsed>=x?i:v,-1);
    if(cue!==lastCue){lastCue=cue;sound.rush(cue<3?1.4:.38,cue<3?.3:.16,cue<3?180:950);sound.tone(cue<3?36:65,.7,.22);}
  }
  function leave(){if(done||exitAge>=0)return;exitAge=0;if(sound)sound.stop();sound=null;}
  function finish(){
    if(done)return;done=true;intro.active=false;if(sound)sound.stop();sound=null;
    document.removeEventListener('keydown',key,true);document.removeEventListener('keyup',stopKey,true);document.removeEventListener('visibilitychange',visibility);
    root.remove();style.remove();if(shell)shell.inert=wasInert;
    clearInput();last=0;
    // Suppress a held skip button until the game's next poll sees it released.
    gamepadPrev={jump:true,pause:true,special:true,back:true};
    const target=document.getElementById('begin')||overlay.querySelector('button')||previousFocus;target?.focus({preventScroll:true});
  }
  function stopKey(e){if(intro.active){e.preventDefault();e.stopImmediatePropagation();}}
  function key(e){
    if(!intro.active)return;
    if(e.code==='Tab'){e.preventDefault();(document.activeElement===skipButton?audioButton:skipButton).focus();e.stopImmediatePropagation();return;}
    e.preventDefault();e.stopImmediatePropagation();
    if(e.repeat)return;
    if(e.code==='Escape'||e.code==='Space'||e.code==='Enter'){
      if(document.activeElement===audioButton&&e.code!=='Escape')enableAudio();else leave();
    }else if(e.code==='KeyM')enableAudio();
  }
  function visibility(){lastStamp=0;if(sound){if(document.hidden)sound.ac.suspend().catch(()=>{});else sound.ac.resume().catch(()=>{});}}
  document.addEventListener('keydown',key,true);document.addEventListener('keyup',stopKey,true);document.addEventListener('visibilitychange',visibility);
  root.addEventListener('pointerdown',e=>e.stopPropagation());root.addEventListener('click',e=>e.stopPropagation());
  audioButton.onclick=enableAudio;skipButton.onclick=leave;skipButton.focus({preventScroll:true});
  function tick(stamp){
    if(done)return;
    const dt=lastStamp&&!document.hidden?Math.max(0,(stamp-lastStamp)/1000):0;lastStamp=stamp;
    try{const pads=navigator.getGamepads?.()||[];let down=false;for(const p of pads)if(p)down=down||[0,8,9].some(i=>p.buttons[i]?.pressed);if(down&&!padWasDown)leave();padWasDown=down;}catch(_){}
    if(started&&exitAge<0){elapsed+=dt;score();if(elapsed>=DURATION)leave();}
    render(elapsed);
    if(exitAge>=0){exitAge+=dt;root.style.opacity=String(1-clamp01(exitAge/.45));if(exitAge>=.45){finish();return;}}
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
