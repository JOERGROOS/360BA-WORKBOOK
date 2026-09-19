# Das Abholprogramm für Finanzdaten

## Voraussetzungen

- Datei `~/.config/360ba-workbook/.env.local` mit `SUPABASE_URL` und
  `SUPABASE_SERVICE_ROLE_KEY` — fehlt einer der beiden, bricht das Programm
  sofort ab und schreibt `FEHLER Umgebungsvariablen fehlen (…)` ins Protokoll.
- Node ab Version 22.18 (auf diesem Mac unter `/Users/joergroos/.local/bin/node`).
- **Nach jeder Code-Änderung erst `./scripts/sync-lokal.sh` ausführen** — der
  launchd-Dienst startet das Skript aus der Arbeitskopie
  (`/Users/joergroos/dev/360ba-workbook/`), nicht aus diesem Laufwerksordner.
  Ohne den Abgleich läuft der nächste automatische Durchlauf noch mit dem
  alten Stand.

## Was es macht

Kunden laden ihre Finanzdaten (BWA, Kontoauszüge usw.) direkt über das
Workbook hoch. Die Dateien landen dabei zunächst nur in der Datenbank
(Supabase) — nicht auf deinem Mac. Das Abholprogramm holt sie von dort ab,
über zwei Dienste:

- **Vollmodus** (`de.joerg-roos.360ba-abholer`) — prüft täglich um 08:00 und
  14:00, ob irgendwo neue Dateien warten, und holt alle unabgeholten.
- **Sofort-Modus** (`de.joerg-roos.360ba-abholer-sofort`) — prüft alle 5
  Minuten NUR die Sitzungen, bei denen im Admin-Bereich der Knopf „Auf
  meinen Mac abholen" gedrückt wurde. Ist nichts angefordert (der
  Normalfall), stellt er nur eine einzige, sehr billige Abfrage und ist
  sofort wieder fertig.

Beide:
- Legen für die jeweilige Firma einen Ordner an (falls noch nicht
  vorhanden) und laden die Datei dort hinein:
  ```
  /Users/joergroos/_JRB-SERVER/03-FULLFILMENT/360 GRAD BUSINESSANALYSE/1-Uploads von Kunden/<Firma>/
  ```
- Markieren die Datei danach in der Datenbank als „abgeholt" — sie wird nie
  zweimal heruntergeladen.
- Lassen eine Datei, die einmal nicht durchläuft (z. B. kurzer
  Internet-Ausfall), einfach unabgeholt — sie wird beim nächsten Durchlauf
  erneut versucht. Andere Dateien im selben Durchlauf sind davon nicht
  betroffen.

## Installieren (einmalig, ein Befehl)

Im Terminal:

```bash
cd "/Users/joergroos/Library/CloudStorage/SynologyDrive-AI-BUSINSESS-OS/04-360BA-Workbook"
bash scripts/abholer-installieren.sh
```

Richtet beide Dienste ein. Das Skript kann beliebig oft erneut ausgeführt
werden (z. B. nach einer Code-Änderung) — es ersetzt einfach die vorherige
Installation.

## Prüfen, ob es läuft

```bash
launchctl list | grep 360ba
```

Erscheinen zwei Zeilen (`de.joerg-roos.360ba-abholer` und
`de.joerg-roos.360ba-abholer-sofort`), sind beide Dienste eingerichtet. Die
Zahl in der mittleren Spalte ist der letzte Rückgabewert: `0` heißt, der
letzte Durchlauf war fehlerfrei.

Was tatsächlich passiert ist, steht im gemeinsamen Protokoll:

```bash
tail -f ~/Library/Logs/360ba-abholer.log
```

Jeder Durchlauf beginnt mit einer Zeile `Modus: voll · n Dateien` bzw.
`Modus: angefordert · n Dateien`. Jede abgeholte Datei bekommt danach eine
eigene Zeile mit Zeitstempel und Zielpfad. Bei einem Fehler steht `FEHLER`
in der Zeile statt `ok`.

## Jetzt sofort abholen (ohne auf 08:00/14:00 zu warten)

```bash
launchctl kickstart gui/$(id -u)/de.joerg-roos.360ba-abholer
```

Startet einen einzelnen Durchlauf im Vollmodus sofort. Direkt danach steht
das Ergebnis im Protokoll (`tail -n 5 ~/Library/Logs/360ba-abholer.log`).
Für eine einzelne Sitzung reicht im Admin-Bereich der Knopf „Auf meinen Mac
abholen" — der Sofort-Dienst holt sie innerhalb von 5 Minuten automatisch.

## Stoppen

```bash
launchctl bootout gui/$(id -u)/de.joerg-roos.360ba-abholer
launchctl bootout gui/$(id -u)/de.joerg-roos.360ba-abholer-sofort
```

Das Programm läuft danach nicht mehr automatisch. Ein erneuter Aufruf von
`scripts/abholer-installieren.sh` startet beide Dienste wieder.

## Was passiert, wenn der Mac aus ist?

Nichts Schlimmes. Die Dateien warten sicher in der Datenbank, solange sie
nicht abgeholt sind — nichts geht verloren. Sobald der Mac wieder läuft,
holt das Programm beim nächsten planmäßigen Durchlauf (08:00 oder 14:00)
alle inzwischen aufgelaufenen Dateien nach — oder sofort per
`launchctl kickstart` (siehe oben).
