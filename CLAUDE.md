# 360BA Online-Workbook

Stand: 19.09.2026 — Einladungslink + Admin-Übersicht mit Statistik (Task 1),
Kunden-Landeseite mit Kacheln + Finanzdaten-Upload (Task 2) und Abholprogramm
auf Jörgs Mac (Task 3) fertig.

## Abholprogramm für Finanzdaten (Task 3)
Holt neue Kunden-Uploads per launchd täglich um 08:00 und 14:00 aus dem Supabase-Bucket
`finanzdaten` nach `/Users/joergroos/_JRB-SERVER/03-FULLFILMENT/360 GRAD
BUSINESSANALYSE/1-Uploads von Kunden/<Firma>/` — Skript
`scripts/finanzdaten-abholen.mjs`, Installation `scripts/abholer-installieren.sh`,
Protokoll `~/Library/Logs/360ba-abholer.log`. Details: `docs/abholer.md`.

## Was ist das
Interaktives Online-Workbook zur 360° Business-Analyse für Jörg Roos' Kunden
(Ersatz für das bisherige Word-Workbook). Interview-artiger Fragebogen,
Ergebnis-Auswertung mit Erfolgsrad, PDF-Export, Admin-Bereich zum Pflegen von
Fragen/Texten/Sitzungen.

## Einladungs-Prinzip — keine öffentliche Startseite
Sitzungen entstehen ausschließlich im Admin-Bereich (`/admin` → „Neue
Einladung"), nie über eine öffentliche Startseite. `app/page.tsx` zeigt nur
noch einen neutralen Zugangs-Hinweis (`zugang_text`), ohne Formular, und ist
per `robots.txt` sowie `metadata.robots` von Suchmaschinen ausgeschlossen.
Status-Kette einer Sitzung (`wb_sessions.status`):

`eingeladen` (Admin hat angelegt, Kunde hat noch nicht bestätigt) →
`laufend` (Kunde hat auf der Einladungsseite gestartet) → `ergebnis` →
`abgeschlossen`.

## Kunden-Landeseite und Finanzdaten-Upload

`/w/[token]` ist für JEDEN Status die Landeseite (`components/KundenStart.tsx`):
zwei Kacheln, „Workbook starten" (Text je Status, führt zu `/interview`,
`/ergebnis` oder `/fertig`) und „Finanzdaten senden" (öffnet
`components/FinanzdatenUpload.tsx` als Overlay). Das Interview selbst
(inkl. Einladungsbestätigung über `EinladungStart`) liegt unter
`/w/[token]/interview` — Deep-Links zu einzelnen Fragen (`?frage=`, aus
`Ergebnis.tsx`) zeigen dorthin.

Finanzdaten-Upload läuft direkt vom Browser in den privaten Bucket
`finanzdaten` (Vercel-Funktionen haben eine 4,5-MB-Grenze für den
Funktionskörper selbst, deshalb signierte Adressen statt Server-Upload):
`POST /api/w/[token]/dateien/upload-url` liefert eine signierte Adresse
(`lib/dateien.ts` → `uploadAdresse`, prüft Typ/Größe vorher UND die
30-Dateien-Grenze über `wb_dateien` UND den echten Speicher-Bestand — sonst
könnte jemand beliebig viele Adressen anfordern, ohne je zu registrieren),
der Browser lädt per `XMLHttpRequest PUT` auf diese Adresse hoch (getestet —
PUT funktioniert, kein POST/FormData nötig), danach meldet
`POST /api/w/[token]/dateien` die Datei an (`dateiRegistrieren` — Größe und
Content-Type kommen aus `storage.list`, NICHT vom Client; fehlt das Objekt im
Speicher, gibt es 404), `POST /api/w/[token]/dateien/melden` schickt eine
interne Mail (`lib/mail.ts` → `finanzdatenMailSenden`). Ein Objekt im Speicher
ohne `wb_dateien`-Zeile (Browser zwischen PUT und Registrieren geschlossen)
trägt eine interne Nachtrag-Funktion vor jeder Leseliste automatisch nach
(`verwaisteObjekteRegistrieren`, mit den echten Werten aus dem Speicher).
Validierungsfehler laufen über die Klasse `EingabeFehler` (trägt ihren
HTTP-Status selbst, Default 400) — Routen prüfen `instanceof EingabeFehler`
und geben sonst 500 mit `console.error`. Upload ist in JEDEM Sitzungsstatus
erlaubt, auch `eingeladen` und `abgeschlossen`. Erlaubte Typen, Größen- und
Mengengrenze: `lib/dateinamen.ts` (`ERLAUBT`, `MAX_BYTES`, `MAX_DATEIEN`) —
bewusst abhängigkeitsfrei, damit ein Abholprogramm auf Jörgs Mac (Task 3) sie
mit einfachem `node` importieren kann, ohne Next.js oder Supabase im Gepäck.
Geprüft mit `scripts/check-dateinamen.mjs`. Admin sieht die Dateien je
Sitzung in `components/admin/Sitzungen.tsx` („Dateien (n)", ausklappbar,
Download-Link + Abhol-Status `abgeholt_at`; scheitert die Download-Adresse
für eine einzelne Datei, zeigt die Zeile einen Hinweis statt die ganze Liste
zu blockieren). Session-Löschen (`app/api/admin/sitzungen/[id]/route.ts`)
räumt beide Buckets auf, `workbooks` UND `finanzdaten`.

Der Kunde öffnet seinen Link, bestätigt/korrigiert seine Daten auf der
Einladungsseite (`components/EinladungStart.tsx`) und startet damit erst das
Interview (`POST /api/w/[token]/start`, wechselt auf `laufend`). Vor dem
Start liefern `link`, `transkribieren` und `antwort` einen 409.

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 3 · Supabase
(Tabellen-Präfix `wb_`) · Anthropic SDK + OpenAI SDK (Sprache→Text, Glättung)
· Resend (Mail) · @react-pdf/renderer (PDF-Export).

## Ordner & Routen
- `app/page.tsx` neutrale Zugangs-Seite (kein Formular) · `app/w/[token]/`
  **Landeseite mit Kacheln** (jeder Status), `interview/` Einladungsbestätigung
  + Interview, `ergebnis/`, `fertig/` · `app/admin/` Login,
  **Übersicht (Startansicht)**, Fragebogen, Texte, Sitzungen (inkl.
  „Neue Einladung").
- `app/api/w/[token]/start` Interview starten · `app/api/w/[token]/{antwort,
  abschluss,pdf,link}` Kunden-API · `app/api/w/[token]/dateien{,/upload-url,
  /melden}` Finanzdaten-Upload · `app/api/admin/*` Admin-API (Cookie-Auth,
  `POST sitzungen` legt Einladung an, `GET statistik` Nutzungs-Statistik,
  `GET sitzungen/[id]/dateien` Finanzdaten-Liste mit Download-Adressen) ·
  `app/api/transkribieren` Sprache→Text (zählt `diktate` bei Erfolg hoch).
- `lib/` Fachlogik (sitzung, punkte, statistik, pdf, glaettung, mail-html,
  bremse, dateinamen, dateien) · `data/` Seed-JSON · `supabase/migrations/`
  Schema.

## Admin-Übersicht

Startansicht des Admin-Bereichs (`components/admin/Uebersicht.tsx`). Zeigt
oben „Neue Einladung" (öffnet das gemeinsame `EinladungFormular` inline, auch
von `Sitzungen.tsx` genutzt) und darunter Kennzahl-Karten sowie das
Erfolgsrad mit den Faktor-Mitteln über alle abgeschlossenen Workbooks.
Rechenlogik in `lib/statistik.ts` (`berechneStatistik`, reine Funktion,
geprüft mit `scripts/check-statistik.mjs`) — Test-Sitzungen fließen nie ein.
Dauer wird aus `wb_sessions.gestartet_at` → `abgeschlossen_at` berechnet,
Sprachanteil aus dem Zähler `wb_sessions.diktate`.

## So arbeitet man
1. `./scripts/sync-lokal.sh` — gleicht nach `~/dev/360ba-workbook/` ab (npm
   install/build laufen NICHT auf dem Synology-Laufwerk). Code hier im
   Laufwerksordner schreiben, nie direkt in der Arbeitskopie.
2. In der Arbeitskopie: `npm run dev` (Dev-Server) bzw. `npx next build`.
3. Test-Sitzung: `/admin` öffnen, „Vorschau als Kunde" — legt eine echte
   Sitzung mit Jörgs eigenen Daten an, zum kompletten Durchklicken.
4. Prüfskripte: `npm run check` (check-seed, check-punkte, check-geometrie,
   check-admin-auth, check-statistik, check-dateinamen) · `node
   scripts/check-glaettung.mjs` (braucht ANTHROPIC_API_KEY) ·
   `node scripts/check-mail-html.mjs` · `node scripts/check-pdf.mjs` (braucht
   laufenden Dev-Server, schreibt `docs/beispiel/beispiel.pdf`).

## Spec & Plan
Spec: `docs/specs/2026-09-18-online-workbook-design.md` · Plan:
`docs/plans/2026-09-18-online-workbook.md` · Mockup: `docs/mockup/index.html`.

## Datenbank
Supabase-Projekt `zzmomqmegzjibnqrmzyo` (JOERG AI Produktion, shared — nur
`wb_*`-Tabellen und die Buckets `workbooks`/`finanzdaten` anfassen). Migration
einspielen und Seed-Ablauf: `supabase/README.md`.

## Bekannte Grenzen
- **Bremse im Modulspeicher:** `lib/bremse.ts` zählt Aufrufe in einer
  In-Memory-Map. Vercel-Funktionen starten kalt und teilen sie nicht —
  reicht als Missbrauchsbremse für ein Vorbereitungs-Tool, ist aber kein
  verlässliches globales Limit. Bei Bedarf auf Upstash Redis umstellen.
- **Positionen per Pfeil:** Der „← Zurück"-Pfeil im Interview ändert die
  Position nur lokal im Browser. Der Server-Stand `aktuelle_frage` wird nur
  beim „Weiter" gespeichert. Schließt jemand nach dem Zurückblättern den Tab
  ohne erneut „Weiter" zu klicken, setzt der E-Mail-Link beim nächsten Mal
  wieder an der zuletzt gespeicherten (weiter vorne liegenden) Frage fort.
- **react-pdf-Eigenheiten** (`lib/pdf/Workbook.tsx`): kein `lineHeight` auf
  Seitenebene setzen — Yoga in react-pdf 4.9 überschreibt es sonst überall,
  auch in der Fußzeile. Ein hier gesetzter `lineHeight` wird beim Rendern
  fix mit 12/7 (≈1,714) multipliziert, unabhängig von der Schriftgröße —
  `lineHeight: 1.35` im Code ergibt also ~2,31 auf der Seite. Kein
  `fontStyle: 'italic'` verwenden, solange keine kursive Montserrat-Datei
  unter `public/fonts/` liegt.

## Offen für Jörg
- `RESEND_API_KEY` in Vercel eintragen (Wert aus dem Resend-Dashboard oder
  aus dem JOERG-AI-Vercel-Projekt abschreiben).
- GitHub-Repo `JOERGROOS/360BA-WORKBOOK` anlegen und pushen.
- Vercel-Projekt anlegen, Umgebungsvariablen eintragen, deployen.
- Domain `360ba.joerg-roos.com` einrichten (CNAME beim DNS-Anbieter).
- Datenschutz-Absatz (`docs/datenschutz-absatz.md`) auf
  joerg-roos.com/datenschutz übernehmen oder anpassen.

Ausführliche Anleitung: `docs/deployment.md`.

## Wichtig
Änderungen am Fragebogen (`wb_questions`, `wb_chapters`) wirken nur auf neue
Sitzungen — laufende `wb_sessions` behalten den Stand ihres Starts.
