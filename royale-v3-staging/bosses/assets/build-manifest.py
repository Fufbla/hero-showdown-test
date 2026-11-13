"""Measure original generated atlases without resampling or altering image pixels."""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image

ROOT = Path(__file__).parent
NAMES = ['idle-a','idle-b','walk-a','walk-b','melee-windup','melee-active','melee-recovery','hit','ranged-windup','ranged-active','ranged-recovery','defeat','ground-windup','ground-active','ground-recovery','phase']
COLORS = {'regional-trash-monster':'#b0e343','regional-bushman':'#bdd75e','regional-wastelander':'#d4f358','regional-giant-scorpion':'#bc80ef','regional-venomis':'#bdf55f','regional-atomdust':'#cda3ff','regional-ultimate-pollution':'#ffbe66','legendary-lightning':'#d1b3ff','legendary-air':'#f5aa68','legendary-styrodog':'#ffb78c','legendary-sonic':'#8bddff','legendary-styro':'#98e3f3','legendary-wastelander':'#d8ef7c','legendary-venomis':'#c6fa86','legendary-atomdust':'#ffcf7e'}

def cuts(projection, size):
    result=[0]
    for k in range(1,4):
        nominal=k*size/4
        a,b=int(nominal-size*.075),int(nominal+size*.075)
        v=projection[a:b]
        low=np.where(v <= max(2, int(v.min())+2))[0]+a
        # Prefer the center of the longest nearly empty run around each cell division.
        runs=np.split(low,np.where(np.diff(low)>1)[0]+1)
        run=max(runs,key=lambda r:len(r)-abs(float(r.mean())-nominal)*.04)
        result.append(int(round(float(run.mean()))))
    return result+[size]

bosses={}
for path in sorted(ROOT.glob('*.png')):
    im=Image.open(path).convert('RGBA'); a=np.array(im)[:,:,3]
    if float((a==0).mean())<.05:
        print('OPAQUE',path.name);continue
    solid=a>32
    ys=cuts(solid.sum(axis=1),im.height)
    frames=[]
    for row in range(4):
        top,bottom=ys[row:row+2]
        xs=cuts(solid[top:bottom].sum(axis=0),im.width)
        for col in range(4):
            left,right=xs[col:col+2]
            p=a[top:bottom,left:right]
            yy,xx=np.where(p>32)
            if len(xx)<100:raise ValueError((path.name,row,col,'empty frame'))
            x0=max(left,left+int(xx.min())-2);x1=min(right,left+int(xx.max())+3)
            y0=max(top,top+int(yy.min())-2);y1=min(bottom,top+int(yy.max())+3)
            # Anchor to planted feet instead of shifting the body to follow an extended hand.
            ground_y=top+int(np.quantile(yy,.997))
            foot=p[max(0,ground_y-top-10):ground_y-top+2,:]>96
            fy,fx=np.where(foot)
            anchor_x=left+float(np.median(fx)) if len(fx) else (x0+x1)/2
            frames.append({'name':NAMES[row*4+col],'crop':[x0,y0,x1-x0,y1-y0], 'anchor':[round(anchor_x-x0,2),ground_y-y0], 'bounds':[x0,y0,x1,y1]})
    # All authored poses share their column's root. A foot-pixel median can jump
    # between feet on alternating strides, so infer the shared horizontal root
    # from the first row's complete silhouettes instead of chasing a moving foot.
    root_offset=float(np.median([(f['crop'][0]+f['crop'][2]/2)-(i+.5)*im.width/4 for i,f in enumerate(frames[:4])]))
    for i,f in enumerate(frames):
        f['anchor'][0]=round((i%4+.5)*im.width/4+root_offset-f['crop'][0],2)
    idle=frames[0]
    bosses[path.stem]={'width':im.width,'height':im.height,'referenceHeight':idle['anchor'][1], 'anchor':idle['anchor'],'phaseColor':COLORS[path.stem], 'frames':frames,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'transparentPixelRatio':round(float((a==0).mean()),6),'generator':'built-in imagegen','horizontalRootOffset':round(root_offset,2),'frameConvention':'row-major 4x4; measured crop and ground anchor; shared horizontal root inferred from first-row silhouettes; one fixed scale per boss'}
    print(path.stem,'referenceHeight',idle['anchor'][1],'row boundaries',ys,'transparent',round(float((a==0).mean()),3))
manifest={'schemaVersion':1,'frameOrder':NAMES,'bosses':bosses,'notes':'Original generated PNGs preserved. Crop rectangles and anchors measured without resampling. Runtime mirrors complete right-facing frames for left movement.'}
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
