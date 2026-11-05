#!/usr/bin/env python3
"""Package separately drawn alpha poses; never animate a reference thumbnail.

Source sheets and replacement attack strips are retained unchanged. Connected
components separate irregular sheet spacing without cutting neighboring poses.
Each animation uses a shared anatomical root and reference scale, including
defeat frames: a collapsing monster is never scaled back up to standing height.
"""
import argparse, hashlib, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps
from scipy.ndimage import label, find_objects, binary_dilation

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets/monsters'
CELL_W, CELL_H, BASELINE, HEIGHT = 320, 256, 240, 128
STATES = ('idle', 'move', 'attack', 'hit', 'defeat')
CONFIG = {
 'bottle': {'name':'Bottle Critter','region':1,'facing':-1,'pivot':'blue'},
 'slime': {'name':'Trash Slime','region':1,'facing':1,'pivot':'body'},
 'crawler': {'name':'Sand Crawler','region':1,'facing':1,'pivot':'eyes'},
}

def parts(path, rows, skip_rows=(), columns=6):
    rgba = np.asarray(Image.open(path).convert('RGBA')).copy()
    components, _ = label(rgba[:,:,3] > 64)
    found = [[] for _ in range(rows)]
    for ident, area in enumerate(find_objects(components), 1):
        if area is None or np.count_nonzero(components[area] == ident) < 1000:
            continue
        row = min(rows-1, int((area[0].start+area[0].stop)/2 / (rgba.shape[0]/rows)))
        if row in skip_rows:
            continue
        # Recover antialiased edges, retaining source alpha (no baked matte).
        x0,x1 = max(0,area[1].start-2),min(rgba.shape[1],area[1].stop+2)
        y0,y1 = max(0,area[0].start-2),min(rgba.shape[0],area[0].stop+2)
        crop = rgba[y0:y1,x0:x1].copy()
        keep = binary_dilation(components[y0:y1,x0:x1] == ident, iterations=2)
        crop[:,:,3][~keep] = 0
        found[row].append((x0, Image.fromarray(crop)))
    for row, entries in enumerate(found):
        entries.sort(key=lambda e:e[0])
        expected = columns[row] if isinstance(columns, (list, tuple)) else columns
        if row not in skip_rows and len(entries) != expected:
            raise ValueError(f'{path.name}: row {row+1} has {len(entries)} complete poses, expected {expected}')
    return [[im for _,im in row] for row in found]

def measure(im, kind):
    a=np.asarray(im); r,g,b,alpha=[a[:,:,i].astype(float) for i in range(4)]
    ys,xs=np.where(alpha>64)
    floor=float(ys.max()+1)
    if kind=='blue':
        mask=(b>r*1.3)&(b>80)&(alpha>128)
        yy,xx=np.where(mask)
        width=float(np.percentile(xx,97)-np.percentile(xx,3))
        pivot=float(np.mean(xx)-width*.20)
        eyes=[[float(np.min(xs)+(np.max(xs)-np.min(xs))*.23),float(np.min(ys)+(floor-np.min(ys))*.48)]]
    elif kind=='eyes':
        mask=(g>r*1.05)&(g>b*1.25)&(g>100)&(alpha>128)
        yy,xx=np.where(mask)
        if len(xx)<4: pivot=float((xs.min()+xs.max())/2)
        else: pivot=float(np.mean(xx)-im.width*.10)
        width=float(xs.max()-xs.min())
        eyes=[[float(np.mean(xx)),float(np.mean(yy))]] if len(xx) else []
    else:
        # Bottom contact patch, excluding an extended arm, is the body root.
        bottom=(alpha>128)&(np.indices(alpha.shape)[0]>floor-12)
        _,xx=np.where(bottom)
        pivot=float((np.percentile(xx,5)+np.percentile(xx,95))/2)
        width=float(xs.max()-xs.min())
        eyes=[[pivot+im.width*.06,im.height*.39],[pivot+im.width*.24,im.height*.39]]
    return pivot,floor,width,eyes

def package(type):
    cfg=CONFIG[type];source=ASSETS/'animation-source'/f'{type}.png'
    rows=parts(source,5,skip_rows=(2,))
    attack=ASSETS/'animation-source'/f'{type}-attack.png'
    rows[2]=sum(parts(attack,2,columns=3),[])
    ref=measure(rows[0][0],cfg['pivot']);ref_height=rows[0][0].height
    base_scale=HEIGHT/ref_height
    # Replacement strips have a separate acquisition resolution. Use the
    # ready pose's height to establish one fixed scale for that entire strip.
    attack_scale=HEIGHT/rows[2][0].height
    out=ASSETS/'animations'/type;out.mkdir(parents=True,exist_ok=True)
    frames=[];atlas=Image.new('RGBA',(CELL_W*6,CELL_H*5))
    for row,state in enumerate(STATES):
        for index,pose in enumerate(rows[row]):
            pivot,floor,width,eyes=measure(pose,cfg['pivot'])
            scale=attack_scale if state=='attack' else base_scale
            if cfg['pivot']=='blue':
                # The rigid bottle's width is invariant, even in a collapse.
                source_ref=measure(rows[2][0],cfg['pivot'])[2] if state=='attack' else ref[2]
                scale*=source_ref/width
            scaled=pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS)
            x=round(CELL_W/2-pivot*scale);y=round(BASELINE-floor*scale)
            if x<4 or x+scaled.width>CELL_W-4 or y<4 or y+scaled.height>CELL_H-4:
                raise ValueError(f'{type}/{state}/{index}: pose exceeds fixed canvas: {x,y,scaled.size}')
            frame=Image.new('RGBA',(CELL_W,CELL_H));frame.alpha_composite(scaled,(x,y))
            transformed_eyes=[[round(x+ex*scale,2),round(y+ey*scale,2)] for ex,ey in eyes]
            if cfg['facing']==-1:
                frame=ImageOps.mirror(frame)
                transformed_eyes=[[CELL_W-ex,ey] for ex,ey in transformed_eyes]
            file=f'{state}-{index:02}.png';frame.save(out/file,optimize=True)
            atlas.alpha_composite(frame,(index*CELL_W,row*CELL_H))
            frames.append({'state':state,'index':index,'file':file,'anchor':[CELL_W/2,BASELINE],
                           'eyes':transformed_eyes,'sha256':hashlib.sha256((out/file).read_bytes()).hexdigest()})
    atlas.save(out/'atlas.png',optimize=True)
    meta={'name':cfg['name'],'region':cfg['region'],'frameCount':30,'cellWidth':CELL_W,'cellHeight':CELL_H,'columns':6,'rows':5,
          'anchor':[CELL_W/2,BASELINE],'referenceHeight':HEIGHT,'sourceFacing':1,
          'file':f'animations/{type}/atlas.png','frames':frames,
          'sources':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (source,attack)},
          'provenance':'Separate AI-drawn poses guided by the approved design; packaged with source alpha.'}
    (out/'manifest.json').write_text(json.dumps(meta,indent=2)+'\n')
    return meta

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('types',nargs='*',default=list(CONFIG));args=parser.parse_args()
    for type in args.types:
        meta=package(type);print(f'{type}: {meta["frameCount"]} aligned transparent PNG frames + atlas')
    catalog={}
    for path in sorted((ASSETS/'animations').glob('*/manifest.json')):
        m=json.loads(path.read_text())
        catalog[path.parent.name]={k:m[k] for k in ('name','region','frameCount','cellWidth','cellHeight','columns','rows','anchor','referenceHeight','sourceFacing','file')}
        catalog[path.parent.name]['eyes']=[f['eyes'] for f in m['frames']]
    (ROOT/'monster-animation-catalog.mjs').write_text('// Generated by tools/prepare-monster-animation-frames.py.\nexport const MONSTER_ANIMATIONS=Object.freeze('+json.dumps(catalog,separators=(',',':'))+');\n')
