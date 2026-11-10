#!/usr/bin/env python3
"""Create a small Mac test download; artwork is verified and cached on demand."""
import hashlib
import json
import pathlib
import stat
import subprocess
import sys
import zipfile

root = pathlib.Path(__file__).resolve().parent.parent
destination = pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root.parent / 'Hero-Showdown-Local-Coop-Mac.zip'
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
tracked = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', commit, 'royale', 'assets'], cwd=root, text=True).splitlines()
text_extensions = {'.js', '.mjs', '.json', '.css', '.html'}
art_extensions = {'.png', '.webp', '.jpg', '.jpeg', '.gif', '.svg', '.mp3', '.wav', '.ogg', '.mp4', '.webm'}
files = {}
art = {}
for relative in tracked:
    p = root / relative
    if not p.is_file():
        raise SystemExit('Required checkout file is missing: ' + relative)
    if p.suffix in text_extensions:
        files[relative] = p.read_bytes()
    elif p.suffix in art_extensions and relative.startswith(('assets/', 'royale/assets/')):
        data = p.read_bytes()
        art[relative] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

for relative in ['START-LOCAL-COOP.command', 'tools/serve-local-coop.mjs', 'tools/local-coop-asset-cache.mjs']:
    files[relative] = (root / relative).read_bytes()
files['local-coop-assets.json'] = json.dumps({'commit': commit, 'files': art}, separators=(',', ':')).encode()
files['START-HERE.txt'] = '''HERO SHOWDOWN ROYALE — MAC TWO-PLAYER TEST

1. Extract this ZIP and keep all files together.
2. Double-click START-LOCAL-COOP.command.
   If Node.js is missing, the launcher opens its official download page.
   Install the macOS LTS installer, then double-click the launcher again.
3. Keep the Terminal window open. The game opens in your browser.
   If needed, open http://127.0.0.1:4173/royale/local-coop/
4. Connect two USB or Bluetooth controllers. Press a button on each.
5. Each person enters their own 10-digit code, chooses their saved hero,
   assigns a different controller, and selects Ready. Click START GAME.

First launch downloads and verifies artwork. Later launches reuse the cache.
Internet is needed for artwork, account login, and cloud saves.
Movement and combat run locally on your Mac. This does not publish the game.
Test progression is saved to the heroes you choose, every eight seconds.
Close other game tabs using those heroes before starting.

FIRST PLAYTEST
Move and double-jump together. Have Player 2 walk offscreen and return.
Defeat a monster: both get split XP and full coins. Pick up both item copies.
Pause: open different menus, upgrade, then select Ready on both sides.
Disconnect and reconnect one controller. Leave as Player 1 and confirm
Player 2 continues. End with Leave Local Co-op for the remaining hero.
Reopen and check that both heroes kept their progress.

If macOS prevents the launcher from opening, do not disable security settings.
Tell ChatGPT the exact message so we can choose an appropriate launch method.

No existing account is included in this download. Enter codes only in the game.
'''.encode()

prefix = 'Hero-Showdown-Local-Coop-Mac/'
destination.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name, data in sorted(files.items()):
        info = zipfile.ZipInfo(prefix + name)
        info.create_system = 3
        info.external_attr = ((stat.S_IFREG | (0o755 if name.endswith('.command') else 0o644)) << 16)
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, data)
with zipfile.ZipFile(destination) as archive:
    assert archive.testzip() is None
print(json.dumps({'file': str(destination), 'bytes': destination.stat().st_size, 'bundledFiles': len(files), 'verifiedArtworkFiles': len(art), 'gameplayCommit': commit}))
