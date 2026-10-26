#!/bin/sh
cd "$(dirname "$0")" || exit 1
python3 tools/serve-playable-villains.py
