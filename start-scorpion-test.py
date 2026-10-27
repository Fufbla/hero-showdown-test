#!/usr/bin/env python3
"""Serve the existing game and its isolated scorpion approval test locally."""
import argparse
import hashlib
import http.server
import json
from pathlib import Path
import webbrowser

CORE_BLOB = 'fa65e31b59d891785d566059974b133513f6208e'
REQUIRED = (
    'hero-showdown.html', 'scorpion-rig-test.html',
    'assets/shore/boss-core.js', 'assets/shore/boss-parts.png',
    'assets/shore/boss-renderer.js', 'assets/shore/story-shore.js',
    'assets/scorpion-rig/rig-core.js', 'assets/scorpion-rig/rig-renderer.js',
    'assets/scorpion-rig/review.js',
)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument('--port', type=int, default=0, help='Default: choose a free local port')
    parser.add_argument('--check', action='store_true', help='Validate the installation without starting')
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    root = args.root.resolve()
    missing = [name for name in REQUIRED if not (root / name).is_file()]
    if missing:
        parser.exit(1, 'Missing files: ' + ', '.join(missing) + '\nCopy the update beside the existing hero-showdown.html and assets folder.\n')
    data = (root / 'assets/shore/boss-core.js').read_bytes()
    actual = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
    if actual != CORE_BLOB:
        parser.exit(1, 'This boss-core.js differs from the gameplay version used to verify this test. Keep the files unchanged and review compatibility first.\n')
    if args.check:
        print(json.dumps({'valid': True, 'root': str(root), 'boss_core_blob': actual}))
        return

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *values, **kwargs):
            super().__init__(*values, directory=str(root), **kwargs)
        def end_headers(self):
            self.send_header('Cache-Control', 'no-cache')
            super().end_headers()

    with http.server.ThreadingHTTPServer(('127.0.0.1', args.port), Handler) as server:
        url = f'http://127.0.0.1:{server.server_port}/scorpion-rig-test.html'
        print('Scorpion approval test: ' + url, flush=True)
        print('Keep this window open while playing. Press Ctrl+C to stop.', flush=True)
        if not args.no_browser:
            webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('\nTest server stopped.')

if __name__ == '__main__':
    main()
