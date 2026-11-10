"""Measure untouched modular atlases and author source-rect rig manifests.

Reads alpha only; never crops, repaints or rewrites the approved PNG artwork.
Explicit rows and attachment rules are kept here so a future collection uses the
same reproducible fitting pipeline. Registration is not visual release approval.
"""
import json, pathlib, argparse
from PIL import Image
import numpy as np
from scipy import ndimage

ROOT=pathlib.Path(__file__).resolve().parents[2]
BASE=ROOT/'royale/cosmetics'
catalog=json.loads((BASE/'catalog.json').read_text())
plans=json.loads((ROOT/'docs/cosmetics/art-prompts/remaining-outfits.json').read_text())
plans.insert(0,dict(id='ninja-warrior',dir='ninja-warrior',lower='pants',sleeve='long',head='purple headband',accessory='dark face scarf'))
byid={p['id']:p for p in plans}
views=['front','right','back','left']
# Cell boundaries follow the approved eight-row modular export convention.
cuts=[0,.151,.278,.405,.546,.663,.787,.889,1]

def bounds(a,x0,y0,x1,y1):
    ink=a[y0:y1,x0:x1]>=192
    labels,count=ndimage.label(ink)
    sizes=np.bincount(labels.ravel());sizes[0]=0
    if not count:return None
    biggest=int(np.argmax(sizes))
    # Restrict to the main garment's vertical band. This excludes artwork from
    # the next row when an export has shifted within its generous cell gutter.
    main=ndimage.find_objects(labels)[biggest-1]
    yy0,yy1=main[0].start,main[0].stop
    ink[:yy0]=False;ink[yy1:]=False
    ys,xs=np.where(ink)
    if len(xs)<30:return None
    # Ignore isolated export speckles by keeping rows/columns with actual ink.
    rows=np.bincount(ys,minlength=y1-y0);cols=np.bincount(xs,minlength=x1-x0)
    xx=np.where(cols>=3)[0];yy=np.where(rows>=3)[0]
    if not len(xx) or not len(yy):return None
    l=max(x0,x0+int(xx[0])-1);r=min(x1,x0+int(xx[-1])+2)
    t=max(y0,y0+int(yy[0])-1);b=min(y1,y0+int(yy[-1])+2)
    return [l,t,r-l,b-t]

def layer(view,part,ps,rect,attach,width,pivot=(.5,.08),**extra):
    w,h=rect[2:]
    return dict(view=view,part=part,pass_=ps,rect=rect,pivot=[w*pivot[0],h*pivot[1]],attach=attach,scale=width/w,**extra)

def clean(items):
    for item in items:item['pass']=item.pop('pass_')
    return items

parser=argparse.ArgumentParser();parser.add_argument('--only');args=parser.parse_args()
intake=[]
for costume in catalog['sets']:
    ident=costume['id']
    if ident not in byid or (args.only and ident not in args.only.split(',')):continue
    p=byid[ident];folder=BASE/'assets'/p['dir'];file=folder/'atlas.png'
    if not file.exists():continue
    image=Image.open(file)
    if image.mode!='RGBA':raise ValueError(f'{ident}: atlas must have alpha')
    w,h=image.size;a=np.asarray(image)[:,:,3]
    active=(a>=192).sum(axis=1)>12
    active=ndimage.binary_closing(active,structure=np.ones(5))
    bands,nbands=ndimage.label(active)
    row_ranges={}
    centers=[(cuts[i]+cuts[i+1])/2 for i in range(8)]
    for label in range(1,nbands+1):
      ys=np.where(bands==label)[0]
      if len(ys)<5:continue
      lo,hi=int(ys[0]),int(ys[-1])+1
      row=min(range(8),key=lambda i:abs((lo+hi)/2/h-centers[i]))
      if row not in row_ranges:row_ranges[row]=[lo,hi]
      else:row_ranges[row]=[min(lo,row_ranges[row][0]),max(hi,row_ranges[row][1])]
    cells={}
    for row in range(8):
      for col,view in enumerate(views):
        yr=row_ranges.get(row)
        cells[row,view]=bounds(a,round(col*w/4),max(0,yr[0]-2),round((col+1)*w/4),min(h,yr[1]+2)) if yr else None
    grouped={piece['category']:[] for piece in costume['pieces']}
    top='fullbody' if 'fullbody' in grouped else 'top'
    bottom='fullbody' if 'fullbody' in grouped else 'bottom'
    shorts=p['lower']=='shorts';skirt=p['lower']=='skirt';sleeve=p['sleeve']
    for view in views:
      side=view in ('right','left');sign=-1 if view=='left' else 1
      r=cells[0,view]
      if not r:raise ValueError(f'{ident}/{view}: missing torso')
      torso=layer(view,'torso','torso',r,'neck',24 if side else 32,pivot=(.5,.05),offset=[sign*4 if side else 0,-3],fixedWidth=True)
      torso['end']=dict(attach='waist',pivot=[r[2]*.5,r[3]*.77])
      grouped[top].append(torso)
      if sleeve!='none':
        for row,near in [(1,True),(2,False)]:
          r=cells[row,view]
          if not r:raise ValueError(f'{ident}/{view}: missing sleeve {row}')
          tag='Near' if near else 'Far'
          arm=layer(view,'upperArm'+tag,'nearArm' if near else 'farArm',r,'shoulder'+tag,11 if side else 13,pivot=(.5,.08),fixedWidth=True)
          arm['end']=dict(attach=('elbow' if sleeve=='short' else 'wrist')+tag,pivot=[r[2]*.5,r[3]*.9])
          if sleeve!='short':arm['joint']=dict(attach='elbow'+tag,fraction=.49)
          grouped[top].append(arm)
      r=cells[3,view]
      if not r:raise ValueError(f'{ident}/{view}: missing lower garment')
      if skirt:
        grouped[bottom].append(layer(view,'skirt','torso',r,'waist',34 if side else 42,pivot=(.5,0),drape=dict(nearHalf=0 if view in ('left','back') else 1)))
      else:
        # Front/back atlas silhouettes contain both legs. Each half follows its
        # own hip/knee/ankle; authored profile artwork is used for either leg.
        for near in (False,True):
          rr=r.copy();tag='Near' if near else 'Far'
          if not side:
            half=round(r[2]/2);isright=near if view=='front' else not near
            rr=[r[0]+(half if isright else 0),r[1],r[2]-half if isright else half,r[3]]
          leg=layer(view,'thigh'+tag,'nearLeg' if near else 'farLeg',rr,'hip'+tag,14 if side else 16,pivot=(.5,.04),fixedWidth=True)
          leg['end']=dict(attach=('knee' if shorts else 'ankle')+tag,pivot=[rr[2]*.5,rr[3]*.95])
          if not shorts:leg['joint']=dict(attach='knee'+tag,fraction=.51)
          grouped[bottom].append(leg)
      for row,near in [(4,True),(5,False)]:
        r=cells[row,view]
        if not r:raise ValueError(f'{ident}/{view}: missing shoe {row}')
        tag='Near' if near else 'Far'
        grouped['footwear'].append(layer(view,'foot'+tag,'nearLeg' if near else 'farLeg',r,'ankle'+tag,24 if side else 20,pivot=(.45 if view=='right' else .55 if view=='left' else .5,.7),followLeg=True))
      if 'headwear' in grouped:
        r=cells[6,view]
        if not r:raise ValueError(f'{ident}/{view}: missing headwear')
        hood=any(k in str(p['head']).lower() for k in ('hood','helmet','bandage'))
        hatWidth=48 if ident in ('witch','pilgrim-hero','explorer','scarecrow') else 39
        hood=hood and 'bandage' not in str(p['head']).lower()
        head=layer(view,'headwear','headwear',r,'head',60 if hood else hatWidth,pivot=(.5,.5 if hood else .9),offset=[0 if side else 2,-12 if hood else -16])
        if hood and view!='back':head['faceOpening']=dict(center=[sign*12 if side else 5,4 if ident=='pumpkin-knight' else 0],radius=[14 if side else 15,13 if ident=='pumpkin-knight' else 19])
        grouped['headwear'].append(head)
      if 'accessory' in grouped or 'cape' in grouped:
        accessory='accessory' if 'accessory' in grouped else 'cape'
        r=cells[7,view]
        if not r:raise ValueError(f'{ident}/{view}: missing accessory')
        desc=str(p['accessory']).lower()
        if any(k in desc for k in ('glove','wrist','cuff')):
          for near in (False,True):
            half=round(r[2]/2);rr=[r[0]+(half if near else 0),r[1],r[2]-half if near else half,r[3]]
            tag='Near' if near else 'Far'
            grouped[accessory].append(layer(view,'hand'+tag,'nearArm' if near else 'farArm',rr,'wrist'+tag,9 if 'glove' not in desc else 12,pivot=(.5,.3)))
        else:
          fan='fan' in desc;cape=any(k in desc for k in ('cape','fan'))
          belt=any(k in desc for k in ('belt','waist'))
          eyes=any(k in desc for k in ('glasses','visor','goggle','headphone'))
          mask='face scarf' in desc
          anchor='waist' if belt or fan else 'head' if eyes or mask else 'neck'
          ps=('overBody' if view=='back' else 'behindBody') if cape and not fan else 'behindBody' if fan else 'accessory'
          phones='headphone' in desc;glasses='sunglasses' in desc
          small=any(k in desc for k in ('pendant','necklace','clasp'))
          width=50 if cape else 48 if phones else 31 if eyes else 23 if belt else 9 if small else 22
          if cape:width=r[2]*(48 if fan else 45)/r[3]
          if belt:width=min(30,r[2]*7/r[3])
          if small:width=min(18,r[2]*8/r[3])
          if phones and side:width=29
          pivot=(.5,.9 if fan else .06 if cape else .5)
          if small and view=='back':ps='behindBody'
          if view=='back' and (eyes or mask):ps='behindHead'
          offset=[-sign*7 if phones and side else sign*4 if side and (eyes or mask) else 0,-14 if phones or glasses else 4 if eyes else 12 if mask else 3]
          if ident=='snow-hero':offset[1]=-17
          grouped[accessory].append(layer(view,'cape' if cape else 'accessory',ps,r,anchor,width,pivot=pivot,offset=offset))
    for piece in costume['pieces']:
      category=piece['category'];covers=[]
      if category in ('top','fullbody'):
        covers+=['torso','arms','gloves','belt','emblem','cape']
        if sleeve=='none':covers+=['bareUpperArms','bareForearms']
        elif sleeve=='short':covers+=['bareForearms']
      if category in ('bottom','fullbody'):
        covers+=['legs']
        if shorts:covers+=['darkShins' if ident=='snow-hero' else 'bareShins']
      if category=='footwear':covers+=['feet','boots']
      if category=='headwear':covers+=['helmet']
      if category in ('accessory','cape') and any(k in str(p['accessory']).lower() for k in ('cape','fan')):covers+=['cape']
      manifest=dict(template='universal-style-c-v1',atlas=dict(url=f'./assets/{p["dir"]}/atlas.png',width=w,height=h),reviewStatus='fitting-in-progress',layers=clean(grouped[category]),covers=covers)
      if category=='headwear':manifest['hair']='hidden' if any(k in str(p['head']).lower() for k in ('hood','helmet')) else 'preserved'
      (folder/(category+'.json')).write_text(json.dumps(manifest,indent=2)+'\n')
      piece['assetManifest']=f'./assets/{p["dir"]}/{category}.json'
    costume['availability']='fitting'
    intake.append(dict(id=ident,width=w,height=h,pieces=len(grouped),status='registered-for-review'))
(BASE/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
print(json.dumps(intake,indent=2))
