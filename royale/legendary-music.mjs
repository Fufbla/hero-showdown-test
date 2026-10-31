// Original synthesized battle motifs. No copyrighted recordings or shared audio changed.
export const LEGENDARY_MUSIC=Object.freeze({
 lightning:{tempo:148,notes:[0,7,12,10,7,3,10,12],root:185,wave:'sawtooth',style:'electric arpeggio'},
 air:{tempo:82,notes:[0,3,7,10,7,5,3,-2],root:138.59,wave:'sine',style:'slow atmospheric pulse'},
 styrodog:{tempo:160,notes:[0,0,3,0,5,3,0,-2],root:110,wave:'square',style:'driving percussion bass'},
 sonic:{tempo:112,notes:[0,7,5,10,12,7,3,5],root:146.83,wave:'triangle',style:'syncopated resonant echoes'},
 styro:{tempo:124,notes:[0,1,7,6,3,10,6,1],root:164.81,wave:'square',style:'mechanical laboratory sequence'},
 wastelander:{tempo:94,notes:[0,-5,0,3,0,-2,-5,-7],root:98,wave:'triangle',style:'heavy industrial rhythm'},
 venomis:{tempo:108,notes:[0,3,6,7,10,7,6,3],root:196,wave:'sine',style:'coiling chromatic melody'},
 atomdust:{tempo:136,notes:[0,7,12,19,17,12,10,7],root:130.81,wave:'sawtooth',style:'layered atomic ostinato'},
});
export class LegendaryMusic{
 constructor(){this.id=null;this.next=0;this.beat=0;this.nodes=new Set();}
 stop(){for(const n of this.nodes){try{n.stop();}catch{}}this.nodes.clear();this.id=null;}
 update(context,id,playing){if(!context||!playing||!LEGENDARY_MUSIC[id]){if(this.id)this.stop();return;}
  if(id!==this.id){this.stop();this.id=id;this.beat=0;this.next=context.currentTime;}
  const t=LEGENDARY_MUSIC[id],step=60/t.tempo/2;if(this.next<context.currentTime-.1)this.next=context.currentTime;
  while(this.next<context.currentTime+.15){const beat=this.beat++,time=this.next;this.next+=step;const note=t.notes[beat%t.notes.length],o=context.createOscillator(),gain=context.createGain();o.type=t.wave;o.frequency.setValueAtTime(t.root*2**(note/12),time);gain.gain.setValueAtTime(.0001,time);gain.gain.linearRampToValueAtTime(.008,time+.015);gain.gain.exponentialRampToValueAtTime(.0001,time+step*.9);o.connect(gain);gain.connect(context.destination);o.start(time);o.stop(time+step);this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();gain.disconnect();};
   if(beat%4===0){const bass=context.createOscillator(),bg=context.createGain();bass.type='sine';bass.frequency.setValueAtTime(t.root/2,time);bass.frequency.exponentialRampToValueAtTime(t.root/4,time+.15);bg.gain.setValueAtTime(.012,time);bg.gain.exponentialRampToValueAtTime(.0001,time+.25);bass.connect(bg);bg.connect(context.destination);bass.start(time);bass.stop(time+.28);this.nodes.add(bass);bass.onended=()=>{this.nodes.delete(bass);bass.disconnect();bg.disconnect();};}
  }
 }
}
