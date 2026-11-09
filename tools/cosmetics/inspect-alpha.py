"""Read-only asset intake check. Does not crop, repaint or alter artwork."""
import argparse,json
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('image');args=p.parse_args()
im=Image.open(args.image)
if im.mode!='RGBA':raise SystemExit('REJECT: missing RGBA alpha channel')
a=im.getchannel('A');hist=a.histogram();total=im.width*im.height
# Atlas gutters and transparent corners are necessary but not sufficient.
# A human must compare all design details; this is not a fidelity score.
border=list(a.crop((0,0,im.width,2)).getdata())+list(a.crop((0,im.height-2,im.width,im.height)).getdata())
result={'width':im.width,'height':im.height,'transparentFraction':hist[0]/total,'nearOpaqueFraction':sum(hist[250:])/total,'nontransparentBorderPixels':sum(x>0 for x in border),'visualApproval':False}
print(json.dumps(result,indent=2))
if result['transparentFraction']<.25 or result['nontransparentBorderPixels'] or result['nearOpaqueFraction']<.05:raise SystemExit('REJECT: alpha/background intake check failed')
print('Alpha intake passed; reference fidelity, directions and rig fit still require review.')
