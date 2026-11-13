"""Register original, unedited fashion artwork as complete Action-Chibi poses.

Only JSON metadata is emitted. Existing head/foot anchors, animation timing,
cell size and gameplay scale remain exactly those of the approved character.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
OLD = ROOT / 'royale-v3-staging/kingjames/outfits/kingjames-original'
NEW = ROOT / 'royale/fashion/assets'

def bounds(a):
    labels, _ = ndimage.label(a[:, :, 3] >= 128)
    counts = np.bincount(labels.ravel()); counts[0] = 0
    y, x = np.where(labels == counts.argmax())
    return [int(x.min()), int(y.min()), int(x.max()+1), int(y.max()+1)]

def main():
    old_images = {k: np.array(Image.open(OLD/name).convert('RGBA')) for k, name in
        {'default':'body.webp','attacks':'attacks.webp','basic':'basic-attacks-v1.webp'}.items()}
    for folder in sorted(NEW.iterdir()):
        if not folder.is_dir(): continue
        m = json.loads((OLD/'manifest.json').read_text())
        m.update(id=folder.name, label=folder.name.replace('-', ' ').title(), atlas='body.png',
            atlases={'attacks':'attacks.png','basic':'basic.png'}, cape='none', skinMask='magenta-v1')
        images = {k:np.array(Image.open(folder/name).convert('RGBA')) for k,name in
            {'default':'body.png','attacks':'attacks.png','basic':'basic.png'}.items()}
        rows = {'default':6,'attacks':7,'basic':2}
        for i,f in enumerate(m['frames']):
            key = f.get('atlas','default'); old,new = old_images[key],images[key]
            ox,oy,_,_ = f['rect']; ob = bounds(old[oy:oy+256,ox:ox+256])
            col,row = ox//256,oy//256
            cx,cy = round(col*new.shape[1]/8),round(row*new.shape[0]/rows[key])
            right,bottom = round((col+1)*new.shape[1]/8),round((row+1)*new.shape[0]/rows[key])
            a=new[cy:bottom,cx:right]; nb=bounds(a)
            sx=(ob[2]-ob[0])/(nb[2]-nb[0]); sy=(ob[3]-ob[1])/(nb[3]-nb[1])
            expected=[nb[0]+(f['head'][0]-ob[0])/sx,nb[1]+(f['head'][1]-ob[1])/sy]
            yy,xx=np.indices(a.shape[:2]); r,g,b,alpha=[a[:,:,n].astype(float) for n in range(4)]
            dist=(xx-expected[0])**2+(yy-expected[1])**2
            neck_mask=(alpha>192)&(r>g*1.5)&(b>g*1.5)&(b>r*.65)&(dist<(14/sy)**2)
            if neck_mask.any():
                ny,nx=np.unravel_index(np.argmin(np.where(neck_mask,dist,np.inf)),dist.shape)
                neck=[float(nx),float(ny)]
            else: raise ValueError(f'{folder.name} frame {i}: neck marker missing')
            # Keep soles at the original pose's baseline while attaching the
            # same head to the solid neck. This scales the entire authored pose.
            if abs(f['head'][2])<.4:
                sy=(ob[3]-f['head'][1])/(nb[3]-neck[1])
            left,top=max(0,nb[0]-2),max(0,nb[1]-2)
            w,h=min(a.shape[1],nb[2]+2)-left,min(a.shape[0],nb[3]+2)-top
            f['sourceRect']=[cx+left,cy+top,w,h]
            f['sourceNeck']=[neck[0]-left,neck[1]-top]
            f['paintRect']=[round(f['head'][0]-(neck[0]-left)*sx,3),
                round(f['head'][1]-(neck[1]-top)*sy,3),round(w*sx,3),round(h*sy,3)]
            f['rect']=[0,0,256,256]
        for clip in m['animations'].values(): clip.pop('embeddedImpact',None)
        (folder/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
        print(f'{folder.name}: {len(m["frames"])} complete poses, {len(m["animations"])} clips')

if __name__=='__main__': main()
