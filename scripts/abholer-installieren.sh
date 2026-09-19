#!/bin/bash
# Installiert das Abholprogramm als launchd-Dienst (läuft alle 10 Minuten, auch nach Neustart).
# Erneutes Ausführen ist ungefährlich — hängt einen laufenden Dienst zuerst aus.
set -euo pipefail

LABEL="de.joerg-roos.360ba-abholer"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
SKRIPT="/Users/joergroos/dev/360ba-workbook/scripts/finanzdaten-abholen.mjs"
ENV_DATEI="$HOME/.config/360ba-workbook/.env.local"
LOG="$HOME/Library/Logs/360ba-abholer.log"
NODE_BIN="$(command -v node)"

if [ -z "$NODE_BIN" ]; then
  echo "node wurde im PATH nicht gefunden." >&2
  exit 1
fi

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>--no-warnings</string>
    <string>--env-file=$ENV_DATEI</string>
    <string>$SKRIPT</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/joergroos/dev/360ba-workbook</string>
  <key>StartInterval</key>
  <integer>600</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG</string>
  <key>StandardErrorPath</key>
  <string>$LOG</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

echo "Installiert. Status:"
launchctl list | grep 360ba || echo "(kein Eintrag gefunden — etwas ist schiefgelaufen)"
