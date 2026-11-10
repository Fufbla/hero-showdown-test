#!/usr/bin/env python3
"""Generate only the isolated entry point. Never edit the production HTML files."""
from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parents[1]
web = root / 'dist' if (root / 'dist').is_dir() else root
source = web / 'hero-showdown.html'
text = source.read_text()
scripts = [f'competitive/{name}' for name in
           ['roster', 'move-guide', 'combat', 'cpu', 'animation-state', 'animation-adapter']]
scripts += [f'villain-motion/{name}' for name in
            ['motion-core', 'fighter-atlas', 'fighter-renderer']]
scripts += ['competitive/versus']
injection = '\n<!-- Isolated competitive test entry; generated from the unchanged base game. -->\n'
injection += '<link rel="stylesheet" href="assets/competitive/versus.css">\n'
injection += ''.join(f'<script src="assets/{name}.js"></script>\n' for name in scripts)
assert text.count('</body>') == 1
output = text.replace('</body>', injection + '</body>')
output = output.replace('<title>', '<title>Playable Villains Test · ', 1)
output = '\n'.join(line.rstrip() for line in output.splitlines()) + '\n'
(web / 'playable-villains-test.html').write_text(output)
metadata = {'source': 'hero-showdown.html', 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'base_commit': '2d8c8dde9617795028f45fd2e5ebadbe87fc0426',
            'entry': 'playable-villains-test.html', 'production_modified': False}
(root / 'docs/playable-villains/build.json').write_text(json.dumps(metadata, indent=2) + '\n')
print('Built playable-villains-test.html from unchanged hero-showdown.html')
