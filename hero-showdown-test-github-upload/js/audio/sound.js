'use strict';
// Classic-script module: shares the original game bindings.

function audio(){if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ac=new A();master=ac.createGain();master.gain.value=muted?0:.16;const limiter=ac.createDynamicsCompressor();limiter.threshold.value=-6;limiter.knee.value=8;limiter.ratio.value=8;master.connect(limiter);limiter.connect(ac.destination);initScore();buildCombatBuffers();initAmbience();}if(ac.state!=='running')ac.resume().then(()=>{if(score)scoreTick();}).catch(()=>{});}

function duckMusic(){if(!score||!ac)return;const p=score.duck.gain,n=ac.currentTime;p.cancelScheduledValues(n);p.setValueAtTime(.64,n);p.setTargetAtTime(1,n+.035,.09);}

function tone(freq,dur=.1,type='sine',vol=.4,end){if(!ac||muted)return;duckMusic();const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,ac.currentTime);if(end)o.frequency.exponentialRampToValueAtTime(end,ac.currentTime+dur);g.gain.setValueAtTime(vol,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+dur);o.connect(g);g.connect(master);o.onended=()=>{o.disconnect();g.disconnect()};o.start();o.stop(ac.currentTime+dur)}

function combatSound(kind='punch',strength=1,material='body'){
 if(!ac||muted)return;if(!combatBuffers)buildCombatBuffers();if(combatVoiceCount>=18)return;
 const variants=combatBuffers[kind]||combatBuffers.punch,b=variants[Math.floor(Math.random()*variants.length)],s=ac.createBufferSource(),g=ac.createGain();s.buffer=b;s.playbackRate.value=.96+Math.random()*.08;g.gain.value=Math.min(1.5,strength)*(.92+Math.random()*.12);s.connect(g);g.connect(master);combatVoiceCount++;s.onended=()=>{combatVoiceCount--;s.disconnect();g.disconnect()};s.start();
 const strong=['heavy','kick','fall','ground'].includes(kind);if(score){const p=score.duck.gain,n=ac.currentTime;p.cancelScheduledValues(n);p.setValueAtTime(strong?.38:.7,n);p.setTargetAtTime(1,n+(strong?.07:.025),strong?.15:.07);}
 // Material detail stays soft and short, underneath the physical body hit.
 if(material!=='body'&&kind!=='whoosh'&&kind!=='block')combatSound(material,.25,'body');
}

function buildCombatBuffers(){combatBuffers={};let seed=9182;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1};
 const configs={punch:[.16,105,.9,26,.12],heavy:[.29,62,1.3,16,.17],kick:[.25,78,1.15,18,.11],block:[.14,125,.65,29,.025],fall:[.4,48,1.2,11,.08],ground:[.48,42,1.35,9,.12],whoosh:[.16,0,0,24,.2],wind:[.38,0,0,9,.23],foam:[.18,140,.3,24,.12],armor:[.16,155,.34,30,.045],vine:[.19,115,.4,26,.13],smoke:[.24,60,.32,17,.1]};
 for(const [kind,[dur,base,weight,decay,snap]] of Object.entries(configs)){combatBuffers[kind]=[];for(let variant=0;variant<3;variant++){const buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*dur),ac.sampleRate),d=buffer.getChannelData(0);let lo=0,mid=0,ph=0;const pitch=1+(variant-1)*.045;for(let i=0;i<d.length;i++){const t=i/ac.sampleRate,n=rnd();lo+=.035*(n-lo);mid+=.20*(n-mid);ph+=2*Math.PI*base*pitch*(1+.8*Math.exp(-t*65))/ac.sampleRate;
 const body=(Math.sin(ph)+.28*Math.sin(ph*1.73))*weight*Math.exp(-t*decay);
 const texture=(mid-lo)*snap*4*Math.exp(-t*(kind==='whoosh'||kind==='wind'?decay:55));
 const transient=(mid-lo)*snap*2*Math.exp(-t*190);
 const swell=kind==='whoosh'||kind==='wind'?Math.sin(Math.PI*Math.min(1,t/dur))**1.2:Math.min(1,t/.002);
 d[i]=Math.tanh((body+texture+transient)*1.1)*swell*Math.min(1,(dur-t)/.018)*.85;
 }combatBuffers[kind].push(buffer);}}
}

function noise(dur=.15,vol=.4){combatSound(dur>.25?'wind':'whoosh',vol*.8);}

function bossMaterial(){return ['smoke','foam','armor','vine','foam','armor','armor','armor'][opponent]||'body';}

function initScore(){const bus=ac.createGain(),duck=ac.createGain(),gate=ac.createGain();bus.gain.value=.78;bus.connect(duck);duck.connect(gate);gate.connect(master);const delay=ac.createDelay(1),feedback=ac.createGain(),wet=ac.createGain(),filter=ac.createBiquadFilter();delay.delayTime.value=60/145*.75;feedback.gain.value=.28;wet.gain.value=.16;filter.type='lowpass';filter.frequency.value=3200;delay.connect(filter);filter.connect(feedback);feedback.connect(delay);filter.connect(wet);wet.connect(bus);
score={bus,duck,gate,delay,samples:{},voices:new Set(),state:'',step:0,next:0,timer:null};
let seed=5137;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1};
for(const kind of ['kick','snare','hat','open','crash','tom']){const dur={kick:.45,snare:.24,hat:.055,open:.22,crash:1.2,tom:.35}[kind],b=ac.createBuffer(1,Math.ceil(ac.sampleRate*dur),ac.sampleRate),d=b.getChannelData(0);let ph=0,prev=0;for(let i=0;i<d.length;i++){const t=i/ac.sampleRate,n=random(),high=n-prev;prev=n;let v=0;if(kind==='kick'){ph+=Math.PI*2*(43+115*Math.exp(-t*38))/ac.sampleRate;v=Math.tanh(Math.sin(ph)*2.2)*Math.exp(-t*10)+high*.17*Math.exp(-t*110);}else if(kind==='snare'){v=high*.38*Math.exp(-t*22)+(Math.sin(2*Math.PI*180*t)+Math.sin(2*Math.PI*330*t))*.25*Math.exp(-t*30);v+=n*.17*Math.exp(-Math.max(0,t-.015)*30);}else if(kind==='tom'){ph+=Math.PI*2*(74+90*Math.exp(-t*18))/ac.sampleRate;v=Math.sin(ph)*Math.exp(-t*12);}else{v=high*.3*Math.exp(-t*(kind==='hat'?85:kind==='open'?20:4));}d[i]=v*Math.min(1,t/.001);}score.samples[kind]=b;}
score.timer=setInterval(scoreTick,25);scoreTick();}

function scoreTrack(source,nodes){score.voices.add(source);source.onended=()=>{score.voices.delete(source);for(const n of [source,...nodes])n.disconnect()};}

function scoreDrum(kind,at,vol=1){const s=ac.createBufferSource(),g=ac.createGain();s.buffer=score.samples[kind];g.gain.value=vol;s.connect(g);g.connect(score.bus);scoreTrack(s,[g]);s.start(at);}

function scoreNote(midi,at,dur,kind,vol=.15,pan=0){const freq=440*Math.pow(2,(midi-69)/12),g=ac.createGain(),f=ac.createBiquadFilter();f.type='lowpass';const sustain=kind==='strings',bass=kind==='bass',brass=kind==='brass',attack=sustain?.09:brass?.018:.008,release=sustain?.28:.09;
f.frequency.setValueAtTime(bass?1000:brass?900:kind==='lead'?5000:2700,at);f.frequency.exponentialRampToValueAtTime(bass?220:brass?2400:sustain?1800:900,at+Math.max(.04,dur*.7));f.Q.value=brass?1.2:.6;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(vol,at+attack);g.gain.setValueAtTime(vol*.72,at+Math.max(attack,dur*.65));g.gain.exponentialRampToValueAtTime(.0001,at+dur+release);f.connect(g);let out=g,panner=null;if(ac.createStereoPanner){panner=ac.createStereoPanner();panner.pan.value=pan;g.connect(panner);out=panner;}out.connect(score.bus);if(!bass)out.connect(score.delay);
const os=[];for(let i=0;i<2;i++){const o=ac.createOscillator();o.type=bass?(i?'triangle':'sine'):'sawtooth';o.frequency.value=freq*(bass&&i?2:1);o.detune.value=bass?0:(i?7:-7);o.connect(f);os.push(o);score.voices.add(o);o.onended=()=>{score.voices.delete(o);o.disconnect();if(os.every(v=>!score.voices.has(v))){f.disconnect();g.disconnect();if(panner)panner.disconnect()}};o.start(at);o.stop(at+dur+release+.02);}}

function stopScoreVoices(){if(!score)return;for(const v of score.voices){try{v.stop(ac.currentTime+.025)}catch(_){}}score.gate.gain.cancelScheduledValues(ac.currentTime);score.gate.gain.setTargetAtTime(0,ac.currentTime,.008);}

function scoreEnding(win,at){const beat=60/145;scoreDrum('crash',at,.5);if(win){[0,1,2,3].forEach((b,i)=>{const chord=[[62,66,69],[67,71,74],[69,73,76],[62,66,69,74]][i];chord.forEach((n,j)=>scoreNote(n,at+b*beat,i===3?1.65:.24,'brass',.13,(j-1)*.25));scoreNote([38,43,45,38][i],at+b*beat,i===3?1.8:.3,'bass',.35);scoreDrum('kick',at+b*beat,.7)});[74,78,81,86].forEach((n,i)=>scoreNote(n,at+i*beat, i===3?1.5:.32,'lead',.1));}else{[[50,53,57],[49,52,56],[38,45,50]].forEach((ch,i)=>{ch.forEach(n=>scoreNote(n,at+i*.48,i===2?1.8:.4,'strings',.13));scoreDrum('tom',at+i*.48,.65)});scoreNote(26,at+.96,1.8,'bass',.32);}}

function scoreTick(){updateAmbience();if(!score||!ac||ac.state!=='running')return;const state=muted||paused||document.hidden?'silent':mode==='fight'?(phase===3?'final':'battle'):mode==='select'||mode==='opponent'||mode==='venue'?'select':mode==='victory'?'victory':mode==='defeat'?'defeat':'silent';
if(state!==score.state){const old=score.state;score.state=state;if((old==='battle'&&state==='final')||(old==='final'&&state==='battle')){}else{stopScoreVoices();score.step=0;score.next=ac.currentTime+.055;score.gate.gain.setTargetAtTime(state==='silent'?0:1,ac.currentTime+.03,.025);if(state==='victory'||state==='defeat')scoreEnding(state==='victory',score.next);}}
if(!['battle','final','select'].includes(state))return;const stepDur=60/145/4;if(score.next<ac.currentTime-.1)score.next=ac.currentTime+.025;while(score.next<ac.currentTime+.13){scoreStep(score.step++,score.next,state);score.next+=stepDur;}}

function scoreStep(step,at,state){const beat=60/145,s=step%16,bar=Math.floor(step/16)%16,final=state==='final',calm=state==='select',chords=[[50,53,57,60],[46,50,53,57],[41,45,48,52],[48,52,55,58],[50,53,57,60],[46,50,53,57],[43,46,50,53],[45,49,52,55]],ch=chords[bar%8],root=ch[0]-12,section=Math.floor(bar/4),fill=bar%4===3;
// Half-time hip-hop backbeat with syncopation, then sixteenth-note final-phase hats.
if([0,6,10].includes(s)||(!calm&&s===14&&bar%2===1))scoreDrum('kick',at,calm?.56:1);
if(s===8)scoreDrum('snare',at,calm?.38:.8);
if((s%2===0&&!calm)||s===2||s===10||final)scoreDrum(s===14&&!calm?'open':'hat',at+(s%2?.009:0),(s%4===0?.24:.15)*(calm?.6:1));
if(!calm&&fill&&s>=12){scoreDrum(s%2?'snare':'tom',at,.22+(s-12)*.055);if(final&&s>=14)scoreDrum('snare',at+beat/8,.22);}
if(s===0&&bar%4===0&&!calm)scoreDrum('crash',at,.35);
if([0,3,6,10,12,14].includes(s)&&(!calm||[0,6,12].includes(s))){const n=root+(s===14?7:s===12&&bar%2?12:0);scoreNote(n,at,beat*(s===0?.7:.34),'bass',calm?.24:final?.48:.38);}
if(s===0){ch.forEach((n,i)=>scoreNote(n+12,at,beat*3.5,'strings',calm?.028:.038,(i-1.5)*.45));}
if(!calm&&(s===0||s===10)&&section!==1)ch.slice(0,3).forEach((n,i)=>scoreNote(n+12,at,beat*.4,'brass',final?.085:.06,(i-1)*.45));
// Original four-bar call-and-response hook, developed over 16 bars.
const hooks=[[[0,74,1.5],[3,77,.5],[4,81,1],[6,79,.5],[8,77,1],[10,74,1],[13,72,.5],[14,74,.5]],[[0,77,1.5],[4,74,1],[6,72,.5],[8,70,1.5],[12,72,.5],[14,74,.5]],[[0,81,1],[2,84,.5],[4,81,1],[7,79,.5],[8,77,1.5],[12,76,.5],[14,77,.5]],[[0,79,1.5],[4,76,1],[8,73,1],[11,76,.5],[12,81,1.5]]];
const phrase=hooks[bar%4];for(const [pos,n,len] of phrase){if(s===pos&&(!calm||pos%4===0)){const transpose=section===2?12:0;scoreNote(n+transpose,at,beat*len*.85,'lead',calm?.045:.085,bar%2?.15:-.15);}}
if(!calm&&(section===1||final)&&s%2===1){const n=ch[(s>>1)%4]+24;scoreNote(n,at,beat*.22,'pluck',.035, s%4===1?-.6:.6);}
if(final&&s===12)scoreNote(root-12,at,beat*.8,'bass',.16);
}

// Legacy frame hook retained; score scheduling runs on the audio clock.
function music(dt){}

function initAmbience(){
 if(ambience||!ac)return;
 const sr=22050,noiseBuffer=ac.createBuffer(2,sr*6,sr);let seed=83917;
 for(let ch=0;ch<2;ch++){const a=noiseBuffer.getChannelData(ch);let smooth=0;for(let i=0;i<a.length;i++){seed=(1664525*seed+1013904223)>>>0;const white=seed/2147483648-1;smooth=smooth*.72+white*.28;a[i]=smooth;}}
 const bus=ac.createGain();bus.gain.value=0;bus.connect(master);
 const makeLayer=(type,freq)=>{const src=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain();src.buffer=noiseBuffer;src.loop=true;filter.type=type;filter.frequency.value=freq;filter.Q.value=.45;gain.gain.value=0;src.connect(filter);filter.connect(gain);gain.connect(bus);src.start();return {src,filter,gain};};
 const surf=makeLayer('lowpass',850),spray=makeLayer('bandpass',2100);
 const gull=ac.createBuffer(1,Math.floor(sr*.8),sr),data=gull.getChannelData(0);let phase=0;
 for(let i=0;i<data.length;i++){const time=i/sr,p=(time<.35?time/.35:(time-.43)/.37);if(p<0||p>1)continue;const env=Math.pow(Math.sin(p*Math.PI),1.4);phase+=Math.PI*2*(1450+450*Math.sin(p*Math.PI*1.3)+35*Math.sin(time*71))/sr;data[i]=(Math.sin(phase)+.18*Math.sin(phase*2)+.04*Math.sin(phase*3))*env*.34;}
 ambience={bus,surf,spray,gull,last:-1,nextGull:ac.currentTime+12,voices:0};
}

function updateAmbience(){
 if(!ambience||!ac)return;
 const a=ambience,now=ac.currentTime,active=!muted&&!paused&&!document.hidden&&ac.state==='running'&&['fight','victory','defeat'].includes(mode);
 const state=active?venue:-1;
 if(a.state!==state){a.state=state;a.bus.gain.setTargetAtTime(active?.11:0,now,.12);a.last=-1;}
 if(now-a.last<.1)return;a.last=now;
 const scope=venue===2;a.surf.gain.gain.setTargetAtTime(scope?.15:.24+.12*(.5+.5*Math.sin(now*.58)),now,.14);
 a.spray.gain.gain.setTargetAtTime(scope?.32+.035*Math.sin(now*.93):.035,now,.14);
 if(active&&!scope&&now>=a.nextGull){
  a.nextGull=now+19+(Math.sin(now)*.5+.5)*13;
  const src=ac.createBufferSource(),gain=ac.createGain(),filter=ac.createBiquadFilter();src.buffer=a.gull;filter.type='lowpass';filter.frequency.value=2800;gain.gain.value=.13;src.connect(filter);filter.connect(gain);gain.connect(a.bus);a.voices++;
  src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();a.voices--;};src.start();
 }
}
