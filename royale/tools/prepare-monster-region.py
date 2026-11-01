#!/usr/bin/env python3
"""Pack newly drawn regular 6x5 alpha sheets without synthesizing animation poses.
Source art is retained unchanged. One acquisition scale is used for all states.
"""
import argparse,hashlib,json,importlib.util
from pathlib import Path
import numpy as np
from PIL import Image,ImageOps
from scipy.ndimage import label,find_objects
ROOT=Path(__file__).resolve().parents[1]; ASSETS=ROOT/'assets/monsters'
STATES=('idle','move','attack','hit','defeat')
NAMES={'sprout':('Thorn Sprout',2,65),'mushroom':('Toxic Mushroom',2,62),'bark':('Bark Crawler',2,43),'scrap':('Scrap Crawler',3,46),'sludge':('Sludge Beast',3,62),'drone':('Rust Drone',3,52),'scorpion':('Cave Scorpion',4,74),'beetle':('Acid Beetle',4,46),'venomCrawler':('Venom Crawler',4,53),'thornBeast':('Thorn Beast',5,84),'stalker':('Mutant Stalker',5,96),'spitter':('Poison Spitter',5,61),'wisp':('Shadow Wisp',6,61),'phantom':('Energy Phantom',6,83),'sentinel':('Dark Sentinel',6,110),'apocalypse':('Apocalypse Mutant',7,100),'guardian':('Corrupted Guardian',7,105),'titan':('Pollution Titan',7,120)}
def package(kind):
 name,region,height=NAMES[kind];source=ASSETS/'animation-source'/f'{kind}.png';im=Image.open(source).convert('RGBA');a=np.asarray(im)
 assert a[:,:,3].min()==0 and a[:,:,3].max()>240,'True alpha source required'
 spec=importlib.util.spec_from_file_location('previous_packer',ROOT/'tools/prepare-monster-animation-frames.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 attack=ASSETS/'animation-source'/f'{kind}-attack.png'
 counts=[5,5,6,6,6] if kind=='drone' else [6]*5
 rows=module.parts(source,5,skip_rows=(2,) if attack.exists() else (),columns=counts)
 if attack.exists():rows[2]=sum(module.parts(attack,2,columns=3),[])
 if kind=='beetle':rows=[[ImageOps.mirror(pose) for pose in row] for row in rows]
 if kind=='scorpion':
  for row in range(5):
   for col in range(len(rows[row])):
    if row*6+col in list(range(12))+[16,17,18,20,21,22,23]:rows[row][col]=ImageOps.mirror(rows[row][col])
 poses=sum(rows,[]);states=[(state,i) for state,row in zip(STATES,rows) for i in range(len(row))]
 attack_start=sum(counts[:2]);attack_end=attack_start+counts[2]
 attack_ratio=poses[0].height/poses[attack_start].height if attack.exists() else 1
 # Fixed scale retains the collapse's lost height and avoids expanding it.
 scale=min(128/poses[0].height,180*128/height/max(p.width*(attack_ratio if attack_start<=i<attack_end else 1) for i,p in enumerate(poses)),140*128/height/max(p.height*(attack_ratio if attack_start<=i<attack_end else 1) for i,p in enumerate(poses)))
 out=ASSETS/'animations'/kind;out.mkdir(parents=True,exist_ok=True);atlas=Image.new('RGBA',(320*6,256*5));frames=[]
 for f,pose in enumerate(poses):
  state,idx=states[f];frame_scale=scale*(attack_ratio if state=='attack' else 1);ar=np.asarray(pose);alpha=ar[:,:,3];ys,xs=np.where(alpha>32);floor=ys.max()+1
  # Body center is kept at the simulation root; the render never moves feet.
  pivot=pose.width/2
  sized=pose.resize((round(pose.width*frame_scale),round(pose.height*frame_scale)),Image.Resampling.LANCZOS);x=round(160-pivot*frame_scale);y=round(240-floor*frame_scale)
  assert x>2 and x+sized.width<318 and y>2 and y+sized.height<254
  frame=Image.new('RGBA',(320,256));frame.alpha_composite(sized,(x,y));file=f'{state}-{idx:02}.png';frame.save(out/file,optimize=True);atlas.alpha_composite(frame,(f%6*320,f//6*256))
  r,g,b=[ar[:,:,i].astype(float) for i in range(3)];yellow=(r>145)&(g>110)&(b<r*.55)&(alpha>128)&(np.indices(alpha.shape)[0]<pose.height*.65)
  if kind=='apocalypse':yellow=(r>180)&(g>50)&(g<180)&(b<80)&(alpha>128)&(np.indices(alpha.shape)[0]<pose.height*.3)
  if kind=='guardian':yellow=(r>180)&(g>100)&(b<100)&(alpha>128)&(np.indices(alpha.shape)[0]<pose.height*.4)
  if kind=='titan':yellow=(g>200)&(r>90)&(b<150)&(alpha>128)&(np.indices(alpha.shape)[0]<pose.height*.3)
  if kind=='wisp':yellow=(r>145)&(g>110)&(b<r*.55)&(alpha>128)
  if kind in ('phantom','sentinel'):yellow=(r>170)&(b>170)&(g>40)&(g<150)&(alpha>128)&(np.indices(alpha.shape)[0]<pose.height*.35)
  if kind=='beetle':yellow=(r>210)&(g>210)&(b>150)&(abs(r-g)<25)&(abs(g-b)<35)&(alpha>128)
  if kind=='scorpion':yellow=(r>170)&(g>60)&(b<r*.55)&(alpha>128)
  if kind=='sludge':yellow=(r>190)&(g>190)&(b>150)&(alpha>128)&(np.indices(alpha.shape)[0]<pose.height*.45)
  labs,n=label(yellow);spots=[]
  for i,sl in enumerate(find_objects(labs),1):
   yy,xx=np.where(labs==i)
   if len(xx)>2:spots.append((len(xx),float(xx.mean()),float(yy.mean())))
  if kind in ('scorpion','beetle','venomCrawler','thornBeast','stalker','spitter','phantom','sentinel','apocalypse','guardian','titan'):
   tx,ty={'scorpion':(.65,.65),'beetle':(.72,.45),'venomCrawler':(.65,.45),'thornBeast':(.8,.35),'stalker':(.7,.2),'spitter':(.65,.15),'phantom':(.6,.18),'sentinel':(.6,.18),'apocalypse':(.7,.12),'guardian':(.6,.28),'titan':(.6,.17)}[kind]
   spots=sorted(spots,key=lambda q:(q[1]/pose.width-tx)**2+(q[2]/pose.height-ty)**2)[:2 if kind in ('phantom','sentinel') else 1]
  eyes=[[round(x+ex*frame_scale,2),round(y+ey*frame_scale,2)] for _,ex,ey in sorted(spots,reverse=True)[:1 if kind in ('scrap','drone') else 2]]
  if not eyes and kind not in ('scorpion','beetle','venomCrawler','thornBeast','stalker','spitter','phantom','sentinel','apocalypse','guardian','titan'):eyes=[[round(x+pose.width*.6*frame_scale,2),round(y+pose.height*.4*frame_scale,2)]]
  frames.append({'state':state,'index':idx,'file':file,'anchor':[160,240],'eyes':eyes,'sha256':hashlib.sha256((out/file).read_bytes()).hexdigest()})
 atlas.save(out/'atlas.png',optimize=True)
 meta={'name':name,'region':region,'frameCount':len(poses),'clips':{state:{'start':sum(counts[:i]),'count':counts[i]} for i,state in enumerate(STATES)},'cellWidth':320,'cellHeight':256,'columns':6,'rows':5,'anchor':[160,240],'referenceHeight':128,'sourceFacing':1,'file':f'animations/{kind}/atlas.png','frames':frames,'sources':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (source,attack) if p.exists()},'provenance':'Separately AI-drawn poses guided by approved reference; source alpha preserved.'}
 (out/'manifest.json').write_text(json.dumps(meta,indent=2)+'\n');print(kind,len(poses),'frames, scale',scale)
def catalog():
 result={}
 for p in sorted((ASSETS/'animations').glob('*/manifest.json')):
  m=json.loads(p.read_text());result[p.parent.name]={k:m[k] for k in ('name','region','frameCount','cellWidth','cellHeight','columns','rows','anchor','referenceHeight','sourceFacing','file')};result[p.parent.name]['eyes']=[f['eyes'] for f in m['frames']]
  if 'clips' in m:result[p.parent.name]['clips']=m['clips']
 (ROOT/'monster-animation-catalog.mjs').write_text('// Generated from retained animation manifests.\nexport const MONSTER_ANIMATIONS=Object.freeze('+json.dumps(result,separators=(',',':'))+');\n')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('types',nargs='+');args=p.parse_args()
 for kind in args.types:package(kind)
 catalog()
