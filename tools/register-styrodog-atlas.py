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


def measure(filename, first, reference_height, anchors):
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
    assert len(components) == 16, (filename, len(components))
    # Group by each four sprite centers, then sort each row by horizontal position.
    components.sort(key=lambda c: (c[2]+c[4])/2)
    ordered = []
    for row in range(4):
        ordered.extend(sorted(components[row*4:row*4+4], key=lambda c: c[1]))
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


profile = {'name':'Styrodog', 'sheets':[
    measure('styrodog-presence.png', 0, 239,
            [174,487,801,1107,165,480,789,1096,181,486,792,1100,174,500,792,1096]),
    measure('styrodog-attacks.png', 16, 244,
            [167,477,794,1125,171,484,798,1113,165,500,792,1111,153,479,791,1110]),
]}
output = ('/* Source PNGs remain intact; measured crop bounds, foot anchors and isolation clips. */\n'
          "(function(root,factory){const data=factory();if(typeof module==='object'&&module.exports)module.exports=data;else root.HealthiaStyrodogAtlas=data;})(typeof globalThis!=='undefined'?globalThis:this,function(){return "
          + json.dumps(profile, separators=(',', ':')) + ';});\n')
(ASSETS / 'styrodog-atlas.js').write_text(output)
print(json.dumps({'sheets':2, 'frames':32, 'bytes':len(output),
                  'bounds':[{'file':s['file'],'frames':s['frames']} for s in profile['sheets']]}))
