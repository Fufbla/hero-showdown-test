"""Measure intact atlas PNGs. Write only crop/anchor/clip metadata; never edit pixels."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import label, find_objects, binary_dilation

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'dist/assets/animation'


def reduce_collinear(points):
    result = []
    for point in points:
        while len(result) >= 2:
            a, b = result[-2:]
            if (b[0]-a[0])*(point[1]-b[1]) != (b[1]-a[1])*(point[0]-b[0]):
                break
            result.pop()
        result.append(point)
    return result


def measure(filename, first, reference_height, anchors, count=16, columns=4):
    image = Image.open(ASSETS / filename)
    assert image.mode == 'RGBA'
    alpha = np.asarray(image)[:, :, 3]
    labels, _ = label(alpha > 64)
    components = []
    for index, box in enumerate(find_objects(labels), 1):
        if box is None:
            continue
        if np.count_nonzero(labels[box] == index) > 500:
            y, x = box
            components.append((index, x.start, y.start, x.stop, y.stop))
    assert len(components) == count, (filename, len(components))
    # Group by each four sprite centers, then sort each row by horizontal position.
    components.sort(key=lambda c: (c[2]+c[4])/2)
    ordered = []
    for row in range(count//columns):
        ordered.extend(sorted(components[row*columns:row*columns+columns], key=lambda c: c[1]))
    frames, masks = [], []
    for frame, (index, left, top, right, bottom) in enumerate(ordered):
        x, y = max(0, left-4), max(0, top-4)
        x2, y2 = min(image.width, right+4), min(image.height, bottom+4)
        local = labels[y:y2, x:x2] == index
        # A generous border keeps antialiasing; the source's alpha still determines
        # its exact outline. This clip excludes another figure crossing a cell.
        envelope = binary_dilation(local, iterations=3)
        left_edge, right_edge = [], []
        for yy in range(envelope.shape[0]):
            xs = np.flatnonzero(envelope[yy])
            if len(xs):
                left_edge.append([int(xs[0]), yy])
                right_edge.append([int(xs[-1])+1, yy+1])
        polygon = reduce_collinear(left_edge + right_edge[::-1])
        anchor_x = anchors[frame]
        anchor_y = bottom - 1
        assert x <= anchor_x <= x2 and y <= anchor_y <= y2
        assert left > 0 and top > 0 and right < image.width and bottom < image.height
        frames.append([x, y, x2-x, y2-y, anchor_x, anchor_y])
        masks.append(polygon)
    return {'file':filename, 'first':first, 'referenceHeight':reference_height,
            'frames':frames, 'masks':masks}


profile = {'name':'Sonic Tusk', 'sheets':[
    measure('sonic-tusk-presence.png', 0, 270,
            [175,510,854,1195,179,515,855,1197,174,524,860,1207,187,526,863,1200]),
    measure('sonic-tusk-attacks.png', 16, 245,
            [167,502,855,1204,181,523,853,1206,178,520,851,1199,187,522,857,1204]),
    measure('sonic-tusk-walk.png', 4, 540, [377,1020,370,1010], count=4, columns=2),
]}
# Use the corrected opposite-step quartet for frames 4-7. The source atlas stays intact.
keep = [0,1,2,3,8,9,10,11,12,13,14,15]
profile['sheets'][0]['ids'] = keep
for key in ['frames','masks']:
    profile['sheets'][0][key] = [profile['sheets'][0][key][i] for i in keep]
output = ('/* Source PNGs remain intact; measured crop bounds, foot anchors and isolation clips. */\n'
          "(function(root,factory){const data=factory();if(typeof module==='object'&&module.exports)module.exports=data;else root.HealthiaSonicTuskAtlas=data;})(typeof globalThis!=='undefined'?globalThis:this,function(){return "
          + json.dumps(profile, separators=(',', ':')) + ';});\n')
(ASSETS / 'sonic-tusk-atlas.js').write_text(output)
print(json.dumps({'sheets':3, 'frames':32, 'bytes':len(output),
                  'bounds':[{'file':s['file'],'frames':s['frames']} for s in profile['sheets']]}))
