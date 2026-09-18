#!/bin/zsh
# Gleicht den Laufwerksordner in die lokale Arbeitskopie ab. Bauen läuft nur dort.
set -e
Q="/Users/joergroos/Library/CloudStorage/SynologyDrive-AI-BUSINSESS-OS/04-360BA-Workbook/"
Z="/Users/joergroos/dev/360ba-workbook/"
mkdir -p "$Z"
rsync -a --delete --exclude node_modules --exclude .next --exclude .git --exclude .env.local "$Q" "$Z"
[ -L "$Z.env.local" ] || ln -s "$HOME/.config/360ba-workbook/.env.local" "$Z.env.local"
cd "$Z" && [ -d node_modules ] || npm install
echo "sync ok → $Z"
