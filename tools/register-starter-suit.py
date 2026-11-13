"""Register complete-frame starter artwork against the existing Action-Chibi atlas.

Reads artwork without altering it. Emits only animation/registration metadata.
The game retains its existing full-body animation sampler and combat timings.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
OLD = ROOT / 'royale-v3-staging/kingjames/outfits/kingjames-original'
NEW = ROOT / 'royale-v3-staging/starter-suit/assets'


def bounds(a):
    labels, _ = ndimage.label(a[:, :, 3] >= 128)
    counts = np.bincount(labels.ravel())
    counts[0] = 0
    component = labels == counts.argmax()
    y, x = np.where(component)
    return [int(x.min()), int(y.min()), int(x.max() + 1), int(y.max() + 1)]


def main():
    m = json.loads((OLD / 'manifest.json').read_text())
    m.update(id='starter-superhero', label='Customizable Starter Superhero Suit',
             atlas='body.png', atlases={'attacks': 'attacks.png', 'basic': 'basic.png'},
             cape='optional-independent-color', paletteVersion=1)
    old_images = {k: np.array(Image.open(OLD / name).convert('RGBA')) for k, name in
                  {'default': 'body.webp', 'attacks': 'attacks.webp', 'basic': 'basic-attacks-v1.webp'}.items()}
    new_images = {k: np.array(Image.open(NEW / name).convert('RGBA')) for k, name in
                  {'default': 'body.png', 'attacks': 'attacks.png', 'basic': 'basic.png'}.items()}
    rows = {'default': 6, 'attacks': 7, 'basic': 2}
    for index, f in enumerate(m['frames']):
        key = f.get('atlas', 'default')
        old, new = old_images[key], new_images[key]
        ox, oy, _, _ = f['rect']
        old_crop = old[oy:oy + 256, ox:ox + 256]
        ob = bounds(old_crop)
        col, row = ox // 256, oy // 256
        cell_x, cell_y = round(col * new.shape[1] / 8), round(row * new.shape[0] / rows[key])
        right, bottom = round((col + 1) * new.shape[1] / 8), round((row + 1) * new.shape[0] / rows[key])
        a = new[cell_y:bottom, cell_x:right]
        nb = bounds(a)
        # The generated canvases may have different padding/resolution. Register
        # each complete pose, never individual arms or legs, to the old neck.
        sx = (ob[2] - ob[0]) / (nb[2] - nb[0])
        sy = (ob[3] - ob[1]) / (nb[3] - nb[1])
        expected = [nb[0] + (f['head'][0] - ob[0]) / sx,
                    nb[1] + (f['head'][1] - ob[1]) / sy]
        yy, xx = np.indices(a.shape[:2])
        r, g, b, alpha = [a[:, :, n].astype(float) for n in range(4)]
        near = ((xx - expected[0]) ** 2 + (yy - expected[1]) ** 2 < (12 / sy) ** 2)
        rim = near & (alpha > 190) & (r > g * 1.5) & (g > b * 1.5) & (r > 30) & (r < 170)
        cy, cx = np.where(rim)
        neck = [float(cx.mean()), float(cy.mean())] if len(cx) >= 4 else expected
        # Independent X/Y normalization only restores the source image's aspect
        # ratio (the generator limits wide sheets), not the hero's body options.
        left, top = max(0, nb[0] - 2), max(0, nb[1] - 2)
        width, height = min(a.shape[1], nb[2] + 2) - left, min(a.shape[0], nb[3] + 2) - top
        f['sourceRect'] = [cell_x + left, cell_y + top, width, height]
        f['paintRect'] = [round(f['head'][0] - (neck[0] - left) * sx, 3),
                          round(f['head'][1] - (neck[1] - top) * sy, 3),
                          round(width * sx, 3), round(height * sy, 3)]
        f['sourceNeck'] = [round(neck[0] - left, 3), round(neck[1] - top, 3)]
        f['rect'] = [0, 0, 256, 256]
        f['chest'] = [f['head'][0] + 2, f['head'][1] + 29, f['head'][2]]
    # Preserve authored full-body timing, phases, combo stride and all 116 poses.
    for animation in m['animations'].values():
        animation.pop('embeddedImpact', None)
    (NEW / 'manifest.json').write_text(json.dumps(m, indent=2) + '\n')
    print(f'Registered {len(m["frames"])} complete poses; {len(m["animations"])} animation clips.')


if __name__ == '__main__':
    main()
