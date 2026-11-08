#!/bin/bash
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
printf '\nHero Showdown Royale — Mac local co-op test\n\n'
COOP_NODE="$(command -v node || true)"
if [ -z "$COOP_NODE" ] || ! "$COOP_NODE" -e 'process.exit(Number(process.versions.node.split(".")[0])>=22?0:1)' 2>/dev/null; then
  printf 'Install the macOS LTS version of Node.js from the page opening now.\nThen double-click START-LOCAL-COOP.command again.\n\n'
  /usr/bin/open 'https://nodejs.org/en/download'
  read -r -p 'Press Return to close this window.'
  exit 0
fi
PORT=4173 "$COOP_NODE" tools/serve-local-coop.mjs --open-browser
read -r -p 'The test server stopped. Press Return to close this window.'
