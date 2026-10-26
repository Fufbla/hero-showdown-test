#!/usr/bin/env python3
"""Generate only the isolated entry point. Never edit the production HTML files."""
from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parents[1]
source = root / 'hero-showdown.html'
text = source.read_text()
scripts = ['roster', 'move-guide', 'combat', 'cpu', 'animation-adapter', 'versus']
injection = '\n<!-- Isolated competitive test entry; generated from the unchanged base game. -->\n'
injection += '<link rel="stylesheet" href="assets/competitive/versus.css">\n'
injection += ''.join(f'<script src="assets/competitive/{name}.js"></script>\n' for name in scripts)
assert text.count('</body>') == 1
output = text.replace('</body>', injection + '</body>')
output = output.replace('<title>', '<title>Playable Villains Test · ', 1)
output = '\n'.join(line.rstrip() for line in output.splitlines()) + '\n'
(root / 'playable-villains-test.html').write_text(output)
metadata = {'source': 'hero-showdown.html', 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'base_commit': '41cbc7ebe38b676b61a454fc1f3f1ccf7f63bd28',
            'entry': 'playable-villains-test.html', 'production_modified': False}
(root / 'docs/playable-villains/build.json').write_text(json.dumps(metadata, indent=2) + '\n')
print('Built playable-villains-test.html from unchanged hero-showdown.html')
