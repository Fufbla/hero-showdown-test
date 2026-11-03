// Existing catalog equipment ornamentation, shared by both presentation views.
import {INK,poly,curve,line,oval} from './style-c-paint.mjs';
export function helmet(c,l,p,item,back,steel){
 if(!item)return;const col=steel?'#9aafbf':item.color,accent=steel?'#edf5f8':item.accent||'#d9b774',id=item.mergeId;
 c.save();c.translate(...p.head);c.rotate(p.headTilt);c.scale(p.d.head,p.d.head);
 if(!id){curve(c,[[-19,4],[-21,-14,-12,-23],[0,-28,12,-23],[21,-14,19,4],[14,9],[13,-8],[5,-13,0,-9],[-5,-13,-13,-8],[-14,9]],col,INK,1.2);line(c,[[-16,-12],[-8,-19],[0,-20],[8,-19],[16,-12]],accent,1.9);poly(c,[[-3,-22],[3,-22],[2,-12],[0,-9],[-2,-12]],accent,INK,.6);}
 else for(const s of[-1,1]){
  if(id==='lightning'||id==='atomdust')poly(c,[[s*16,-7],[s*18,-22],[s*25,-14],[s*21,-12],[s*22,-5]],accent,INK,.9);
  else if(id==='sonic'||id==='styrodog'){curve(c,[[s*16,-5],[s*24,-11,s*21,-24],[s*17,-19,s*16,-5]],col,INK,1.1);line(c,[[s*19,-9],[s*20,-17]],accent,1.2);}
  else{oval(c,s*17,-6,4,5,col,INK,1);oval(c,s*17,-6,2.3,3,accent);line(c,[[s*17,-10],[s*14,-17]],accent,1.7);}
 }
 c.restore();
}
export function mergeChest(c,p,item){
 const id=item?.mergeId;if(!id)return;const [x,y]=p.shoulder,accent=item.accent,col=item.color;
 for(const s of[-1,1]){const xx=x+s*p.d.shoulder;
  if(id==='lightning'||id==='atomdust')poly(c,[[xx-s*5,y],[xx+s*5,y-8],[xx+s*9,y+8],[xx,y+5]],accent,INK,.85);
  else if(id==='sonic'){oval(c,xx,y+2,6,5,col,INK,.8);oval(c,xx,y+2,3.6,3,accent,INK,.6);oval(c,xx,y+2,1.8,1.6,col);}
  else if(id==='styrodog')for(let i=0;i<3;i++)poly(c,[[xx-5+i*4,y],[xx-4+i*4,y-5],[xx-1+i*4,y+3]],accent,INK,.7);
  else if(id==='venomis')curve(c,[[xx-5,y],[xx+s*10,y-5],[xx+s*3,y+9],[xx-5,y]],accent,INK,.8);
  else if(id==='wastelander'){oval(c,xx,y+3,6,5,'#34433f',INK,.8);oval(c,xx,y+3,2.5,2.5,accent);}
  else line(c,[[xx,y-3],[xx+s*6,y+4],[xx,y+10]],accent,3);
 }
}
