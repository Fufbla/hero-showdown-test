#!/usr/bin/env python3
"""Serve the existing project and open its isolated Royale entry point."""
import argparse
import functools
import http.server
import pathlib
import socket
import webbrowser

parser = argparse.ArgumentParser(description="Launch the Hero Showdown Royale Phase 2 playtest")
parser.add_argument("--port", type=int, default=8000)
parser.add_argument("--lan", action="store_true", help="Allow phones on the same local network to connect")
parser.add_argument("--no-browser", action="store_true")
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parent.parent
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
host = "0.0.0.0" if args.lan else "127.0.0.1"
try:
    server = http.server.ThreadingHTTPServer((host, args.port), handler)
except OSError as error:
    parser.exit(1, f"Could not start on port {args.port}: {error}\nTry --port 8001.\n")
url = f"http://localhost:{args.port}/royale/"
print(f"Hero Showdown Royale: {url}", flush=True)
if args.lan:
    print(f"Phone: open http://YOUR-COMPUTER-IP:{args.port}/royale/ on the same Wi-Fi.", flush=True)
    try:
        addresses = sorted({item[4][0] for item in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET) if not item[4][0].startswith("127.")})
        for address in addresses:
            print(f"Possible LAN address: http://{address}:{args.port}/royale/", flush=True)
    except OSError:
        pass
print("Keep this terminal open. Press Ctrl+C to stop.", flush=True)
if not args.no_browser:
    webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
