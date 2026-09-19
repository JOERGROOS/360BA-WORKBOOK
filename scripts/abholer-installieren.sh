#!/bin/bash
# Installiert das Abholprogramm als zwei launchd-Dienste (auch nach Neustart):
# - de.joerg-roos.360ba-abholer          Vollmodus, täglich 08:00 und 14:00
# - de.joerg-roos.360ba-abholer-sofort   --nur-angefordert, alle 5 Minuten
# Erneutes Ausführen ist ungefährlich — hängt laufende Dienste zuerst aus.
set -euo pipefail

SKRIPT="/Users/joergroos/dev/360ba-workbook/scripts/finanzdaten-abholen.mjs"
ENV_DATEI="$HOME/.config/360ba-workbook/.env.local"
LOG="$HOME/Library/Logs/360ba-abholer.log"
NODE_BIN="$(command -v node)"

if [ -z "$NODE_BIN" ]; then
  echo "node wurde im PATH nicht gefunden." >&2
  exit 1
fi

LABEL1="de.joerg-roos.360ba-abholer"
PLIST1="$HOME/Library/LaunchAgents/$LABEL1.plist"
cat > "$PLIST1" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL1</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>--no-warnings</string>
    <string>--env-file=$ENV_DATEI</string>
    <string>$SKRIPT</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/joergroos/dev/360ba-workbook</string>
  <key>StartCalendarInterval</key>
  <array>
    <dict>
      <key>Hour</key>
      <integer>8</integer>
      <key>Minute</key>
      <integer>0</integer>
    </dict>
    <dict>
      <key>Hour</key>
      <integer>14</integer>
      <key>Minute</key>
      <integer>0</integer>
    </dict>
  </array>
  <key>RunAtLoad</key>
  <false/>
  <key>StandardOutPath</key>
  <string>$LOG</string>
  <key>StandardErrorPath</key>
  <string>$LOG</string>
</dict>
</plist>
EOF

LABEL2="de.joerg-roos.360ba-abholer-sofort"
PLIST2="$HOME/Library/LaunchAgents/$LABEL2.plist"
cat > "$PLIST2" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL2</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>--no-warnings</string>
    <string>--env-file=$ENV_DATEI</string>
    <string>$SKRIPT</string>
    <string>--nur-angefordert</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/joergroos/dev/360ba-workbook</string>
  <key>StartInterval</key>
  <integer>300</integer>
  <key>RunAtLoad</key>
  <false/>
  <key>StandardOutPath</key>
  <string>$LOG</string>
  <key>StandardErrorPath</key>
  <string>$LOG</string>
</dict>
</plist>
EOF

for LABEL in "$LABEL1" "$LABEL2"; do
  PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$PLIST"
done

echo "Installiert. Status:"
launchctl list | grep 360ba || echo "(kein Eintrag gefunden — etwas ist schiefgelaufen)"
