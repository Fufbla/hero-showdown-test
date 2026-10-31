"""Reproducible alpha extraction from approved reference pixels (NOT new art).
Requires Pillow, numpy, scipy. Run from any directory. Single intact poses only;
this does not label the inconsistent reference strip as an animation atlas.
"""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from scipy import ndimage as ndi
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/monsters/source'
DEST=ROOT/'assets/monsters/poses'
DEST.mkdir(parents=True,exist_ok=True)
# Audited source rectangles exclude labels and neighboring characters.
# x0,y0,x1,y1; original facing; motion profile; normalized eye locations.
ROWS=[
 ('bottle',1,'Bottle_Critter',(16,28,155,117),-1,'scuttle',[[.29,.53]]),
 ('slime',1,'Trash_Slime',(10,27,166,118),1,'ooze',[[.58,.44],[.73,.43]]),
 ('crawler',1,'Sand_Crawler',(7,19,177,108),1,'scuttle',[[.49,.46],[.60,.45]]),
 ('sprout',2,'Thorn_Sprout',(22,27,156,118),1,'amble',[[.48,.37],[.62,.38]]),
 ('mushroom',2,'Toxic_Mushroom',(21,26,158,121),1,'amble',[[.54,.63],[.63,.62]]),
 ('bark',2,'Bark_Crawler',(27,26,166,112),1,'scuttle',[[.56,.42],[.64,.44]]),
 ('scrap',3,'Scrap_Crawler',(12,28,165,118),1,'scuttle',[[.60,.43]]),
 ('sludge',3,'Sludge_Beast',(14,27,153,121),1,'ooze',[[.50,.36],[.67,.36]]),
 ('drone',3,'Rust_Drone',(15,22,168,109),1,'hover',[[.53,.52]]),
 ('scorpion',4,'Cave_Scorpion',(389,31,449,102),-1,'scuttle',[[.35,.71]]),
 ('beetle',4,'Acid_Beetle',(170,36,252,116),-1,'scuttle',[[.29,.65]]),
 ('venomCrawler',4,'Venom_Crawler',(11,36,166,120),1,'scuttle',[[.51,.47],[.61,.47]]),
 ('thornBeast',5,'Thorn_Beast',(300,18,393,109),1,'amble',[[.56,.37]]),
 ('stalker',5,'Mutant_Stalker',(26,46,150,118),1,'amble',[[.64,.34]]),
 ('spitter',5,'Poison_Spitter',(32,34,161,119),1,'serpent',[[.50,.21]]),
 ('wisp',6,'Shadow_Wisp',(145,20,226,110),1,'hover',[[.40,.71],[.65,.71]]),
 ('phantom',6,'Energy_Phantom',(302,25,367,117),1,'hover',[[.43,.24],[.56,.24]]),
 ('sentinel',6,'Dark_Sentinel',(237,30,301,124),1,'amble',[[.46,.25],[.57,.25]]),
 ('apocalypse',7,'Apocalypse_Mutant',(17,26,165,156),1,'amble',[[.40,.16],[.49,.17]]),
 ('guardian',7,'Corrupted_Guardian',(40,27,195,156),1,'amble',[[.47,.26],[.56,.26]]),
 ('titan',7,'Pollution_Titan',(96,32,228,156),1,'amble',[[.47,.15],[.56,.15]])
]
# The complete approved roster recovers large poses clipped by the ZIP strips.
# Do not use the different dark-background roster or tiny putative frame previews.
# Six rectangles include complete extremities on the original 1536 x 1024 image.
RECOVERED={
 'scorpion':(8,488,160,596),
 'beetle':(8,623,162,705),
 'thornBeast':(538,494,679,597),
 'wisp':(1049,493,1175,588),
 'phantom':(1047,613,1177,704),
 'sentinel':(1049,727,1177,825),
}
manifest={ 'source':'001sprites(1).zip and its approved original Hero Showdown Royale Monster Sprite Sheet.png', 'status':'provisional single-pose cutouts; procedural animation, not verified frame atlas', 'version':2,'sprites':{} }
for key,region,name,rect,face,motion,eyes in ROWS:
 src=SOURCE/'approved-roster-original.png' if key in RECOVERED else next(SOURCE.glob(f'0{region}_*/{name}.png'))
 rect=RECOVERED.get(key,rect)
 im=Image.open(src).convert('RGB').crop(rect)
 a=np.asarray(im).astype(np.int16)
 chroma=a.max(2)-a.min(2)
 # Saturated ink plus dark outlines seed the silhouette. Keep enclosed neutral
 # highlights, but remove checkerboard holes between legs and arms.
 seed=((chroma>34)&(a.min(2)<210))|(a.max(2)<95)
 labels,count=ndi.label(seed,np.ones((3,3)))
 sizes=np.bincount(labels.ravel());sizes[0]=0
 body=labels==sizes.argmax()
 # Preserve small detached canonical drips/sparks only when close to the body.
 nearby=ndi.binary_dilation(body,iterations=7)
 for n in range(1,count+1):
  if sizes[n]>=4 and np.any(nearby&(labels==n)):body|=labels==n
 # Enclosed neutral colors are part of the character (metal, skin, teeth).
 # Preserve them; exterior-connected checkerboard spaces remain transparent.
 holes=ndi.binary_fill_holes(body)&~body
 labs,n=ndi.label(holes);hs=np.bincount(labs.ravel())
 for i in range(1,n+1):
  if hs[i]<65 or key in ['bottle','scrap','apocalypse','guardian','titan','drone']:body|=labs==i

 # A one-pixel partially transparent outline follows dark/color antialiasing.
 edge=ndi.binary_dilation(body)&~body
 alpha=np.where(body,255,0).astype('uint8')
 strength=np.maximum(chroma/42,(155-a.max(2))/90)
 alpha[edge]=np.clip(strength[edge]*200,0,180).astype('uint8')
 alpha[alpha<35]=0
 ys,xs=np.where(alpha>0); box=(int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1))
 rgba=Image.fromarray(np.dstack([a.astype('uint8'),alpha])).crop(box)
 # Transparent padding gives every cached pose room for filtering; feet remain
 # at the same baseline regardless of idle, movement, attack or hit state.
 pad=4;out=Image.new('RGBA',(rgba.width+pad*2,rgba.height+pad*2));out.paste(rgba,(pad,pad))
 out.save(DEST/f'{key}.png',optimize=True)
 # Manually audited eye centers in the final PNG (including transparent pad).
 eye_pixels={
 'bottle':[(44,51)],'slime':[(93,38),(115,39)],'crawler':[(98,48)],
 'sprout':[(65,36),(89,40)],'mushroom':[(73,58),(89,60)],'bark':[(83,40),(98,44)],
 'scrap':[(93,42)],'sludge':[(83,32),(108,34)],'drone':[(76,50)],
 'scorpion':[(52,63)],'beetle':[(49,46)],'venomCrawler':[(96,40)],
 'thornBeast':[(106,49)],'stalker':[(82,20),(88,22)],'spitter':[(66,15)],
 'wisp':[(40,55),(62,56)],'phantom':[(58,24),(67,24)],'sentinel':[(59,26),(67,25)],
 'apocalypse':[(60,26),(67,23)],'guardian':[(74,36),(83,33)],'titan':[(64,20),(75,20)]}
 adjusted_eyes=[[x/out.width,y/out.height] for x,y in eye_pixels[key]]
 manifest['sprites'][key]={'name':name.replace('_',' '),'region':region,'source':str(src.relative_to(ROOT/'assets/monsters')),'sourceSHA256':hashlib.sha256(src.read_bytes()).hexdigest(),'crop':rect,'trim':box,'file':f'poses/{key}.png','width':out.width,'height':out.height,'anchor':[out.width/2,out.height-pad],'sourceFacing':face,'motion':motion,'eyes':adjusted_eyes,'smallPose':False,'recoveredMainPose':key in RECOVERED,'status':'provisional'}
(ROOT/'assets/monsters/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Small browser manifest; extraction audit retains the full source provenance.
catalog={key:{k:v for k,v in meta.items() if k in ['name','region','file','width','height','anchor','sourceFacing','motion','eyes','smallPose']} for key,meta in manifest['sprites'].items()}
(ROOT/'monster-sprite-catalog.mjs').write_text('// Generated by tools/prepare-monster-refs.py; original reference pixels only.\nexport const MONSTER_SPRITES=Object.freeze('+json.dumps(catalog,indent=2)+');\n')
# Auditable review contact sheet on dark and light grounds (never a game atlas).
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
out=Image.new('RGB',(1020,7*270),'#102a36');d=ImageDraw.Draw(out)
for i,(key,meta) in enumerate(manifest['sprites'].items()):
 x=(i%3)*340;y=(i//3)*270
 d.text((x+12,y+8),meta['name']+(' *small pose' if meta['smallPose'] else ''),font=font,fill='white')
 im=Image.open(DEST/f'{key}.png');s=min(300/im.width,190/im.height);im=im.resize((round(im.width*s),round(im.height*s)),Image.Resampling.NEAREST)
 out.paste(im,(x+(340-im.width)//2,y+40),im)
out.save(ROOT/'assets/monsters/cutout-review.png')
print(f'Prepared {len(ROWS)} source-derived RGBA poses; no authored animation frames.')
