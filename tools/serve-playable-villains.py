#!/usr/bin/env python3
"""Local-only preview server. No publication, credentials, or hosting configuration."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import argparse
import webbrowser

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8879)
parser.add_argument('--no-browser', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
url = f'http://127.0.0.1:{args.port}/playable-villains-test.html'
print('Playable villains local test:', url, flush=True)
print('Press Ctrl+C to stop. Production is not changed.', flush=True)
server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(SimpleHTTPRequestHandler, directory=str(root)))
if not args.no_browser:
    webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    server.server_close()
