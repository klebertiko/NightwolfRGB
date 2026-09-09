#!/usr/bin/env bash
# Nightwolf RGB — Windows install. On Windows this hands off to install.ps1
# the same way bun.sh/install does.
set -euo pipefail

if [[ ${OS:-} = Windows_NT ]]; then
  powershell -NoProfile -ExecutionPolicy Bypass -c "irm https://github.com/klebertiko/NightwolfRGB/releases/latest/download/install.ps1 | iex"
  exit $?
fi

echo "Nightwolf RGB ships a Windows build. On this OS, clone the repo:" >&2
echo "  git clone https://github.com/klebertiko/NightwolfRGB.git" >&2
exit 1
