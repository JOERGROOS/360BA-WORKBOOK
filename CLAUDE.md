# 360BA Online-Workbook

Stand: 19.09.2026 — Einladungslink + Admin-Übersicht mit Statistik (Task 1),
Kunden-Landeseite mit Kacheln + Finanzdaten-Upload (Task 2), Abholprogramm
auf Jörgs Mac (Task 3) und ZIP-Download + „Auf meinen Mac abholen" je Kunde
(Plan „Abholen je Kunde", Task 1) fertig.

## Management Summary nach Kunden-Abschluss (22.09.2026, Jörg-Auftrag)
Sobald ein Kunde sein Workbook wirklich zum ersten Mal abschließt (nicht bei
„PDF neu erzeugen" im Admin, nicht bei einer Test-Sitzung), läuft im
Hintergrund eine KI-Analyse seiner Antworten und schickt eine Management
Summary als Word-Datei **ausschließlich** an `controlling@joerg-roos.com` —
der Kunde bekommt diese Mail nie, auch nicht als Kopie.

**Ablauf:** `app/api/w/[token]/abschluss/route.ts` ruft nach erfolgreichem
`abschliessen()` — nur wenn dessen neues Rückgabefeld `neuAbgeschlossen: true`
ist — `after(() => managementSummaryErstellenUndSenden(s)...)` aus
`next/server` auf. Das läuft NACH der Antwort an den Kunden, verzögert seinen
Abschluss also nicht (`maxDuration` dafür auf 90 statt 60 angehoben). Das
Feld `neuAbgeschlossen` unterscheidet einen echten Erst-Abschluss von: schon
vorher abgeschlossen, Verlierer eines gleichzeitigen Abschlusses, oder
`neuErzeugen` (Admin-Knopf „PDF neu erzeugen" — verschickt bewusst keine
Mails, siehe dortiger Kommentar).

**Code-Aufteilung** (gleiches Muster wie bei den Erinnerungen, gleicher Grund
— `scripts/check-management-summary.mjs` lädt die Datei direkt mit `node` und
löst extensionslose Projekt-Importe nicht auf): `lib/management-summary.ts`
ist eigenständig (eigene Kopie der Faktor-Punkte-Rechnung aus `lib/punkte.ts`
statt Import) und enthält `sitzungAlsText` (alle Antworten als Fließtext für
die Analyse), `analysiere` (der KI-Aufruf) und `docxErzeugen` (die Word-Datei,
ohne Netzwerk-Aufruf testbar). `lib/management-summary-lauf.ts` verbindet das
mit `managementSummaryMailSenden` aus `lib/mail.ts` und prüft `s.test`.

**KI-Aufruf:** `claude-sonnet-5`, strukturierte Antwort über Tool-Use
(`tool_choice` fest auf das eine Werkzeug) statt Freitext-JSON — robuster,
kein Parsen von Markdown-Codezäunen nötig. Zwei Fallen beim Bau entdeckt und
behoben, beide nur beim echten API-Aufruf sichtbar geworden, nicht im
Typ-Check: (1) `temperature` wird von diesem Modell mit 400 abgelehnt
("deprecated for this model") — anders als beim älteren Haiku in
`lib/glaettung.ts`, deshalb dort weggelassen. (2) `max_tokens: 3000` reichte
bei sechs Feldern mit mehreren Stichpunkten je Feld nicht — die Antwort brach
mitten im JSON ab, sichtbar an `"<UNKNOWN>"`-Platzhaltern statt echter
Stichpunkte; auf `6000` angehoben.

**Ergebnis-Form:** `kurzeinschaetzung` (Fließtext) + fünf Listen (`staerken`,
`schwaechen`, `potenziale`, `worauf_achten`, `vermutete_themen`) —
`vermutete_themen` ist die „zwischen den Zeilen"-Interpretation, im Wort-
Dokument ausdrücklich als Vermutung gekennzeichnet, nicht als Tatsache
(Selbst-Bewertungs-Disziplin: Interpretation von Fakt trennen).

## Controlling@ bekommt jede Kunden-Mail in Kopie (22.09.2026, Jörg-Auftrag)
`lib/mail.ts` → `kopieInternBeiEcht(s)`: jede Mail an einen echten Kunden (Link-
Mail, alle Erinnerungen) geht per `cc` auch an `controlling@joerg-roos.com` —
außer bei einer Test-Sitzung (`s.test === true`), sonst würde jeder Testlauf
eine Kopie ins echte Postfach schicken. Die „Workbook fertig"-Mail ist davon
NICHT betroffen und bleibt unverändert: sie erreicht controlling@ bereits über
eine eigene, inhaltlich passendere interne Mail (`lib/abschluss.ts`, mit
Kontaktdaten statt bloßer Kopie) — keine doppelte Zustellung einbauen. Die
Finanzdaten-Upload-Mail (`finanzdatenMailSenden`) geht ohnehin schon direkt und
ausschließlich an controlling@, ist keine Kunden-Mail.

## Termin vor Ort + Erinnerungs-Sequenz (21.09.2026, Jörg-Auftrag)
`wb_sessions.termin_am` (Datum, nullable) ist der Vor-Ort-Termin — vom Team im
Admin-Bereich „Kunden" gesetzt (Feld unter jeder Zeile), oder später von einer
Automation über `PATCH /api/admin/sitzungen/[id]` (`{ "termin_am": "JJJJ-MM-TT" }`
oder `null` zum Löschen). Datumslogik ist bewusst abhängigkeitsfrei in
`lib/erinnerungen.ts` (wie `lib/video.ts`), der DB-/Mail-Teil steht getrennt in
`lib/erinnerungen-lauf.ts` — sonst kann `scripts/check-erinnerungen.mjs` die
Kernlogik nicht ohne Supabase-Schlüssel importieren.

**Ablauf:** Ein täglicher Lauf (Vercel Cron, `vercel.json` → `0 6 * * *` UTC ≈
morgens Berlin) ruft `GET /api/cron/erinnerungen` auf, authentifiziert über den
`Authorization: Bearer $CRON_SECRET`-Kopf, den Vercel automatisch mitschickt.
Derselbe Endpunkt akzeptiert auch das Admin-Cookie — dahinter steckt der Knopf
„Erinnerungen jetzt prüfen" im Bereich Kunden, für Tests und für einen kurzfristig
eingetragenen Termin, der nicht bis zum nächsten Cron-Lauf warten soll.

Je Sitzung mit gesetztem Termin, `test: false`: genau **eine** fällige, noch
nicht gesendete Stufe (14 · 10 · 7 Tage) wird geprüft, nie mehrere auf einmal.
Geprüft wird von der dringendsten Stufe her (7 zuerst) — ein sehr spät
eingetragener Termin (z. B. nur noch 8 Tage) schickt die 10er-Stufe, nicht die
inhaltlich schon überholte 14er. Ein Termin in der Vergangenheit ohne gesendete
Erinnerungen bekommt keine mehr nachgeschickt.

**Gezielt statt generisch (22.09.2026, Jörg-Auftrag):** Bevor eine fällige Stufe
tatsächlich verschickt wird, prüft `lib/erinnerungen-lauf.ts`, was der Sitzung
wirklich noch fehlt — `fehlendeUnterlagen()` in `lib/erinnerungen.ts` (reine
Funktion, geprüft in `check-erinnerungen.mjs`): Workbook fehlt, wenn
`status !== 'abgeschlossen'`; Finanzdaten fehlen, wenn `wb_dateien` keine Zeile
zur Sitzung hat (`count`-Abfrage, keine Bewertung des Inhalts — nur „ist
überhaupt etwas hochgeladen"). **Liegt beides schon vor, bleibt die Erinnerung
ganz aus**, unabhängig davon, welche Stufe fällig wäre — Status allein
(früher: `.neq('status','abgeschlossen')` in der Datenbank-Abfrage) entscheidet
das nicht mehr, weil ein abgeschlossenes Workbook ohne Finanzdaten (oder
umgekehrt) weiterhin eine Erinnerung braucht. Fehlt nur eine der beiden Sachen,
geht die `_teilweise`-Fassung der Mail raus (`mail_erinnerung_<stufe>_teilweise_
betreff/_text`), die per Platzhalter `{fehlt}` („dein Workbook" bzw. „deine
Finanzdaten") ausschließlich die fehlende Sache benennt — nie eine allgemeine
Erinnerung, wenn eigentlich nur noch eine Kleinigkeit fehlt. `erinnerungMail
Senden()` in `lib/mail.ts` wählt Text-Schlüssel und `{fehlt}`-Wert danach aus.

Fehlertoleranz wie beim Abholer: eine Mail, die nicht rausgeht (oder deren
Finanzdaten-Zählung scheitert), stoppt nicht den Lauf für die übrigen Sitzungen
(`fehler`-Liste in der Antwort, voller Fehler im Server-Log).

Mail-Texte (Betreff + Inhalt, alle neun vom Tool direkt versendeten Mails —
drei Erinnerungs-Stufen × generisch/teilweise + drei weitere) pflegt der
Admin-Bereich „E-Mails" (`components/admin/Mails.tsx`) — gleiche Tabelle
`wb_texte`, gleiche API wie die generischen Texte, nur eine eigene, kuratierte
Liste. Platzhalter in den generischen Erinnerungs-Mails: `{vorname}`, `{firma}`,
`{link}`, `{tage}`; in den `_teilweise`-Fassungen zusätzlich `{fehlt}`.

**Migration:** `008_termin_erinnerungen.sql` (Spalten `termin_am`,
`erinnerung_14/10/7_gesendet_at`).

## Abholprogramm für Finanzdaten (Task 3 + Plan „Abholen je Kunde")
Holt neue Kunden-Uploads per launchd aus dem Supabase-Bucket `finanzdaten` nach
`/Users/joergroos/_JRB-SERVER/03-FULLFILMENT/360 GRAD BUSINESSANALYSE/1-Uploads
von Kunden/<Firma>/` — Skript `scripts/finanzdaten-abholen.mjs`, Installation
`scripts/abholer-installieren.sh`, Protokoll `~/Library/Logs/360ba-abholer.log`.
Zwei launchd-Jobs: Vollmodus täglich 08:00/14:00 (alle unabgeholten Dateien),
`--nur-angefordert` alle 5 Minuten (nur Sitzungen mit gesetztem Signal
`wb_sessions.abholen_angefordert`, gesetzt über den Admin-Knopf „Auf meinen Mac
abholen" bzw. `POST /api/admin/sitzungen/[id]/abholen`). Admin kann außerdem
alle Dateien einer Sitzung direkt als ZIP laden (`GET
/api/admin/sitzungen/[id]/dateien/zip`, `lib/zip.ts`, Store-ZIP ohne
Kompression). Details: `docs/abholer.md`.

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
Begrüßung (`landing_titel`, alles nach dem Komma steht orange), Einstiegstext
(`landing_intro`, ein Zeilenumbruch je Absatz), Videobotschaft
(`components/Videobotschaft.tsx` — `video_url` aus Admin → Texte; Vimeo wird als
Player-Adresse mit `dnt=1` eingebettet, eine direkte `.mp4` als `<video>`, alles
andere ergibt den Platzhalter mit `landing_video_hinweis`; Deutung und Prüfung:
`lib/video.ts` + `scripts/check-video.mjs`). Die Kachel schwimmt ab Tablet rechts
im Einstiegstext (`md:float-right`, 42 % Breite, Text läuft drum herum — der
Textcontainer ist deshalb Block-Fluss mit `clear` am Ende, kein flex); mobil
steht sie über dem Text. Knopf „Video vergrößern“ öffnet dieselbe Fläche als
Overlay auf zwei Drittel Breite, per `createPortal` am `body` — innerhalb des
Seitencontainers wirkt dessen Einblend-Animation als Bezugsrahmen für `fixed`
und sperrt das Overlay auf 900 px ein. Dann
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
  auch in der Fußzeile. `lineHeight` wirkt nur, wenn am selben Element auch
  `fontSize` steht — dann gilt schlicht Zeilenabstand = `lineHeight` ×
  `fontSize` (mit `pdftotext -bbox` gemessen: `fontSize: 11` plus
  `lineHeight: 1.0` ergibt exakt 11,00 pt); fehlt `fontSize`, ignoriert
  react-pdf den Wert und nimmt die natürliche Zeilenhöhe der Schrift, bei
  Montserrat rund 1,36 × Schriftgröße. Ganzseitige Hintergrundbilder brauchen
  feste Punktmaße (595,28 × 841,89) und `fixed`, sonst zählen sie im
  Seitenumbruch mit und jede Seite wird zu zweien. Kein
  `fontStyle: 'italic'` verwenden, solange keine kursive Montserrat-Datei
  unter `public/fonts/` liegt.

## Offen für Jörg
- `CRON_SECRET` in Vercel eintragen — exakt derselbe Wert, der lokal in
  `~/.config/360ba-workbook/.env.local` steht (dort schon gesetzt, 21.09.2026).
  Ohne diese Vercel-Variable läuft der tägliche Erinnerungs-Lauf nicht (401).
- `RESEND_API_KEY` in Vercel eintragen (Wert aus dem Resend-Dashboard oder
  aus dem JOERG-AI-Vercel-Projekt abschreiben). Lokal in
  `~/.config/360ba-workbook/.env.local` bisher ebenfalls leer — Mails lassen
  sich von hier aus noch nicht testen, nur live.
- GitHub-Repo `JOERGROOS/360BA-WORKBOOK` anlegen und pushen.
- Vercel-Projekt anlegen, Umgebungsvariablen eintragen, deployen.
- Domain `360ba.joerg-roos.com` einrichten (CNAME beim DNS-Anbieter).
- Datenschutz-Absatz (`docs/datenschutz-absatz.md`) auf
  joerg-roos.com/datenschutz übernehmen oder anpassen.

Ausführliche Anleitung: `docs/deployment.md`.

## Wichtig
Änderungen am Fragebogen (`wb_questions`, `wb_chapters`) wirken nur auf neue
Sitzungen — laufende `wb_sessions` behalten den Stand ihres Starts.

## Übergabe
Aktuellster Gesamtstand für einen neuen Chat: `docs/UEBERGABE-2026-09-19.md` (zuerst lesen).
