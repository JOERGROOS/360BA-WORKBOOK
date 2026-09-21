# Übergabe · 360BA Online-Workbook · Stand 19.09.2026 abends

Für den nächsten Chat. Alles, was nötig ist, um ohne Rückfragen weiterzuarbeiten. Auftraggeber: Jörg Roos. Sprache zu Jörg: Du, direkt, keine KI-Floskeln, keine englischen Tech-Wörter ohne Erklärung (Regeln in `01-CoWork/CLAUDE.md`).

## 1. Was das Projekt ist

Das Word-Workbook der 360° Business-Analyse (Vorbereitung des gemeinsamen Tages mit einem Kunden) ist eine Online-App: Kunde bekommt einen Einladungslink, beantwortet 93 Fragen (Freitext mit Spracheingabe, Skala 1–10, Tabelle), sieht sein Erfolgsrad, hält Aha-Momente fest, bekommt das fertige Workbook als PDF per Mail (Kopie an controlling@joerg-roos.com) und kann Finanzdaten hochladen. Jörg pflegt Fragen, Texte, Einladungen und Uploads im Admin.

- **Live:** https://360ba.joerg-roos.com (Vercel, Region fra1 greift). Admin: `/admin`.
- **Code:** GitHub `JOERGROOS/360BA-WORKBOOK`, Zweig `main` = Zweig `bau` (Arbeitszweig). HEAD siehe `git log` — die Zeile hier lief in der Vergangenheit unbemerkt veraltet mit (siehe Abschnitt 17). Vercel deployt `main` automatisch.
- **Projektordner (Synology-Sync, hier wird geschrieben und committet):** `/Users/joergroos/Library/CloudStorage/SynologyDrive-AI-BUSINSESS-OS/04-360BA-Workbook`
- **Arbeitskopie (hier laufen node, tsc, build, Dev-Server):** `/Users/joergroos/dev/360ba-workbook` — angleichen mit `./scripts/sync-lokal.sh` aus dem Projektordner. Nie auf dem Synology-Ordner bauen (Turbopack bricht ab).
- Spec, Pläne, Mockups, Design-Screenshots: `docs/` (`specs/`, `plans/`, `mockup/`, `design/`, `deployment.md`, `abholer.md`, `datenschutz-absatz.md`). Projekt-`CLAUDE.md` = technische Kurzreferenz inkl. react-pdf-Fallen.

## 2. Stack und Architektur in einem Absatz

Next.js 16 (App Router, React 19, Tailwind), Supabase (Projekt `zzmomqmegzjibnqrmzyo` = das Produktiv-Projekt von JOERG AI, Tabellen mit Präfix `wb_`, RLS aktiv, Zugriff nur serverseitig mit Service-Role-Key), Buckets `workbooks` (PDFs) und `finanzdaten` (Kunden-Uploads, privat), Resend (`noreply@joerg-roos.com`), OpenAI `gpt-transcribe` mit Wortschatz-Vorgabe (Sprache, siehe Abschnitt 24), Anthropic `claude-haiku-4-5-20251001` (Text-Glättung), `@react-pdf/renderer` (PDF). Migrationen `supabase/migrations/001–007` sind eingespielt (Anleitung `supabase/README.md`, Management-API mit `SUPABASE_ACCESS_TOKEN`). Umgebungsvariablen: `SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, RESEND_API_KEY, ADMIN_PASSWORD, APP_URL` — lokal in `~/.config/360ba-workbook/.env.local` (Symlink in der Arbeitskopie), in Vercel gesetzt. ⚠ Lokal steht `APP_URL=http://localhost:3000`, in Vercel `https://360ba.joerg-roos.com` — am 19.09. waren beide Werte plus `SUPABASE_URL` in Vercel falsch kopiert; bei „Link zeigt auf localhost“ oder „Fehler mit HTML-Wust“ zuerst die Vercel-Variablen gegen die lokale Datei prüfen.

## 3. Status-Kette und Datenmodell

`wb_sessions.status`: `eingeladen → laufend → ergebnis → abgeschlossen`. Einladung = vorangelegte Sitzung aus dem Admin, Token (43 Zeichen) ist der einzige Kundenschlüssel. Beim Start wird der Fragen-Snapshot frisch gezogen; Admin-Änderungen am Fragebogen wirken nur auf neue Sitzungen. Weitere Spalten: `gestartet_at`, `diktate`, `abholen_angefordert`, `pdf_path`. `wb_chapters`, `wb_questions` (Typen `text|skala|tabelle`), `wb_texte` (alle Kundentexte, Admin → Texte), `wb_dateien` (Uploads, `lokaler_name` = relativer Pfad auf Jörgs Mac).

Kundenrouten: `/` neutral (noindex) · `/w/<token>` Landeseite mit Video + zwei Kacheln · `/w/<token>/interview` · `/ergebnis` · `/fertig`. Admin: Übersicht (Statistik + „Neue Einladung“) · Ausgefüllte Workbooks (Dateien, ZIP, „Auf meinen Mac abholen“, Zurückziehen) · Fragebogen · Texte.

## 4. Abholprogramm auf Jörgs Mac

`scripts/finanzdaten-abholen.mjs` läuft aus der Arbeitskopie per launchd: `de.joerg-roos.360ba-abholer` (08:00 und 14:00, Vollmodus) und `de.joerg-roos.360ba-abholer-sofort` (alle 5 Minuten, nur Sitzungen mit gesetztem Signal, stumm im Leerlauf). Ziel: `/Users/joergroos/_JRB-SERVER/03-FULLFILMENT/360 GRAD BUSINESSANALYSE/1-Uploads von Kunden/<Firma>/`. Log `~/Library/Logs/360ba-abholer.log`. Sofort von Hand: `launchctl kickstart gui/$(id -u)/de.joerg-roos.360ba-abholer`. Nach Code-Änderungen erst `sync-lokal.sh`, dann ggf. `scripts/abholer-installieren.sh` (idempotent). Doku `docs/abholer.md`.

## 5. Prüfen und Verifizieren

In der Arbeitskopie: `npm run check` (9 Prüfskripte: seed, punkte, geometrie, admin-auth, mail-html, dateinamen, statistik, zip, video, fehlertext, pdf über Probe-Route), `npx tsc --noEmit`, `npx next build`. Dev-Server `npm run dev` (Port 3000); Launch-Eintrag `workbook-lokal` in `01-CoWork/.claude/launch.json`. PDF-Probe (nur Dev): `GET /api/dev/pdf-probe` mit `docs/beispiel/musterdaten.json`. Test-Sitzungen immer wieder löschen (Admin-DELETE räumt beide Buckets). Live-Smoke-Tests per curl gegen die Admin-API mit Login-Cookie sind in Ordnung; Passwort steht in der lokalen `.env.local`, nie in Chat oder Bericht.

## 6. Arbeitsweise, die sich bewährt hat

Plan als Datei in `docs/plans/`, je Aufgabe ein frischer Subagent (sonnet für Umsetzung, opus für Design und Gesamtprüfung), danach Review-Subagent, Fix-Runde mit Re-Review, am Ende Gesamtprüfung über den Zweig. Ich (Controller) fasse Code nicht selbst an, außer Doku/Memory. Zwei Agenten parallel nur bei disjunkten Dateien (z. B. App vs. `lib/pdf`), dann jeder nur seine Pfade committen. Screenshots zur Abnahme an Jörg schicken, bevor etwas als fertig gilt.

## 7. Jörgs Vorgaben (verbindlich)

- Design auf dem Niveau von joerg-roos.com und dem B-OS: Plexus-Hintergrund, oranger Glow, Glaskacheln, ein Akzent Orange, Bewegung dezent. Referenz `docs/plans/2026-09-19-design-weltklasse.md`, `app/globals.css`.
- Logo im PDF und in dunklen Flächen: nur die Variante mit orangem Verlaufs-Emblem (`public/logo-full-gradiant.png`), nie das flache weiße. Innenseiten hell mit schwarzem Logo.
- PDF-Fakten-Kapitel: Fragetexte dunkelblau, Nummernpunkt orange, Antwort grau mit orangem Balken.
- Kacheln gleich hoch, Untertexte drei Zeilen. Video als schmale Kachel rechts im Einstiegstext, Text läuft drum herum, mit Knopf „Vergrößern“ (Overlay zwei Drittel Breite); Vimeo-Link im Admin (`video_url`), Platzhalter bis dahin (Jörg, 19.09. nachmittags).
- Abholer zweimal täglich reicht; kein 10-Minuten-Takt für Downloads.
- Kein zusätzliches Passwort für Kunden; der Einladungslink ist der Schlüssel.
- Einladung sendet nicht automatisch Mail; eigener Knopf „Einladung per Mail senden“.
- Aufgaben in Klartext benennen, Grammatik (der Radar / der Erfolgsradar), verbotene Wörter meiden (Liste in `01-CoWork/CLAUDE.md`).

## 8. Offen

1. **Jörgs eigener Durchlauf** als Kunde (Admin → Übersicht → Neue Einladung → Link → Video-Platz, Kacheln, Upload, Workbook, Abschluss). Danach ZIP und „Auf meinen Mac abholen” prüfen. Drei Mails erwartet (Einladung, Finanzdaten-Hinweis an controlling@, fertiges Workbook).
2. ~~Vimeo-Link eintragen~~ erledigt (Video eingearbeitet, erster Test erfolgreich, Jörg-Rückmeldung 22.09.).
3. ~~Datenschutz-Absatz auf joerg-roos.com~~ erledigt anders als ursprünglich geplant (Jörg, 22.09.): statt Sub-Prozessoren-Absatz direkt in der Haupt-Datenschutzerklärung eigene kurze `/datenschutz`-Seite auf 360ba.joerg-roos.com gebaut (Commit `c259c2f`), plus Fußzeile mit Impressum-/Datenschutz-Links auf allen Kundenseiten. Jörg hat den Verweis-Satz in der Haupt-Datenschutzerklärung selbst ergänzt (gleiches Muster wie beim Verweis auf die Potenzialanalyse).
4. ~~Sprachaufnahme in Chrome~~ Ursache gefunden und behoben 22.09.2026, siehe Abschnitt 22. Offen bleibt nur noch der **Modellwechsel auf `gpt-4o-transcribe`** mit Handwerker-Wortschatz-Prompt (gemessen besser als `gpt-4o-mini-transcribe`) — unabhängig vom Aufnahme-Problem, jederzeit machbar.
5. ~~Foto Über-Jörg-Seite~~ Entscheidung Jörg 22.09.: bleibt so.
6. **Später / geparkt:** Admin-Workbook-Liste lädt je Sitzung Dateien + signierte URLs (N+1) · ZIP-Route hält alles im Speicher (30×50 MB Grenze) · Weiß auf Orange 2,8:1 (Markenvorgabe, bewusst) · `diktate`-Zähler nicht atomar (Statistik) · PDF 1,3 MB wegen PNG-Hintergrund (JPEG wäre ~150 KB).

## 9. Fallen, die Zeit gekostet haben

- **Vercel-Env:** lokale Werte 1:1 kopiert → Links auf localhost, DB-Aufrufe auf die eigene Domain. `lib/db.ts` prüft `SUPABASE_URL` jetzt beim Start.
- **react-pdf 4.9:** `lineHeight` wirkt nur mit `fontSize` am selben Element; `lineHeight` auf `Page` killt den `fixed`-Footer; ganzseitige Hintergründe brauchen feste pt-Maße + `fixed`; kein `fontStyle: italic` ohne registrierte Kursivschrift; Seitenzahlen im Inhaltsverzeichnis nur über zwei Render-Durchläufe.
- **Supabase im geteilten Projekt:** neue Tabellen sind ohne RLS über den öffentlichen anon-Key lesbar — jede Migration mit `enable row level security` + `revoke` versehen (002, 005).
- **Vercel-Body-Grenze 4,5 MB:** Uploads gehen direkt vom Browser über signierte Upload-URLs in den Bucket.
- **Synology:** Dateirechte springen auf 755 → `git config core.fileMode false` ist gesetzt.
- **Subagent-Regel „Snapshot gilt“:** Änderungen am Fragebogen dürfen laufende Sitzungen nie verändern.

## 10. Gedächtnis außerhalb des Repos

- Session-Einträge: `01-CoWork/01-ATLAS/memory/sessions/latest-updates.md` (19.09., drei Blöcke).
- Projekt-Memory: `~/.claude/projects/-Users-joergroos-Library-CloudStorage-SynologyDrive-AI-BUSINSESS-OS-01-CoWork/memory/projekt-360ba-online-workbook.md`.
- Ursprungsvorlage: `/Users/joergroos/_JRB-SERVER/03-FULLFILMENT/unsere P R O D U K T E/4-360 GRAD BUSINESS ANALYSE/2-WORKBOOK/2026-360BA-Workbook.docx`.

## 11. Nachtrag 21.09.2026 · Kunden-Bereich, Termin vor Ort, Erinnerungs-Sequenz

Neu, im Detail in `CLAUDE.md` → „Termin vor Ort + Erinnerungs-Sequenz":
Admin-Bereich „Ausgefüllte Workbooks" heißt jetzt „Kunden". Jede Kunden-Zeile
trägt ein Termin-Feld (`wb_sessions.termin_am`); 14/10/7 Tage vorher geht
automatisch je eine kurze, wertschätzende Erinnerungsmail raus (nie mehrere am
selben Tag), zuletzt mit der Bitte um Workbook + Finanzdaten. Täglicher Lauf
über Vercel Cron, Testknopf „Erinnerungen jetzt prüfen" im Admin. Alle sechs
versendeten Mails (Betreff+Text) jetzt an einem Ort: neuer Admin-Bereich
„E-Mails". `CRON_SECRET` in Vercel eingetragen (Jörg, 22.09.) — täglicher
Erinnerungs-Lauf jetzt aktiv, nicht mehr nur der Testknopf im Admin.
Migration 008 ist bereits eingespielt.

## 12. Nachtrag 21.09.2026 abends · Termin-Feld-Fix

Bug gemeldet: Jahreszahl im Termin-Feld ließ sich nicht durchtippen, brach nach der
ersten Ziffer oder nach „20" ab. Ursache: Jedes Tastendruck-Ereignis (auch mit noch
unvollständigem Datum) löste sofort `terminSpeichern` aus, das die Eingabe synchron
deaktivierte (`disabled`) — mitten im Tippen verlor das Feld den Fokus. Fix:
Entwurfs-Zustand wie bei Texte.tsx/Mails.tsx (lokal tippen, erst beim Verlassen des
Felds `onBlur` speichern), `disabled` komplett entfernt. Dazu `colorScheme: 'dark'`
auf dem Feld — macht das native Kalender-Icon hell statt dunkel-auf-dunkel-unsichtbar.
Automatisiertes Durchtippen ließ sich im Browser-Werkzeug nicht nachstellen (bekannte
Grenze bei nativen Datumsfeldern), stattdessen den exakten Auslöser nachgebaut
(Zwischen-Ereignis mit leerem Wert) und geprüft: Feld bleibt editierbar und fokussiert,
kein Speichervorgang läuft an; ein vollständiges Datum löst beim Verlassen genau einen
PATCH aus. `9fc318e` auf bau+main.

## 13. Nachtrag 21.09.2026 abends #2 · Falsche „Fehler beim Speichern"-Meldung bei Texten

Jörg gemeldet: Text im Admin-Bereich „Texte" (Beispiel Start-Zugangshinweis) geändert,
gespeichert → „Fehler beim Speichern", der Text stand aber tatsächlich schon drin.
Kam wiederholt vor. Nicht lokal reproduzierbar — ein sauberer Einzel-Speichervorgang
lief immer glatt durch, lokal wie über die API. Wahrscheinlichste Erklärung (⚠
Annahme, nicht durch ein Live-Log bestätigt — kein Zugriff auf Vercel-Logs von hier
aus): bei der gepoolten Datenbank-Verbindung geht der Schreibvorgang manchmal durch,
nur die Bestätigung auf dem Rückweg verloren. `PUT /api/admin/texte` prüft bei einem
gemeldeten Fehler jetzt einmal nach, ob der Wert trotzdem angekommen ist, bevor
wirklich „Fehler" gemeldet wird — betrifft die Bereiche Texte UND E-Mails, die
dieselbe Route nutzen. `e0e0af0` auf bau+main.

**Falls die Meldung wiederkommt:** dann ist die Erklärung oben falsch (der Wert kommt
in dem Fall nachweislich NICHT an) und die Ursache liegt woanders — als Nächstes in
den Vercel-Funktions-Logs für `/api/admin/texte` nachsehen (Zugriffsdaten/Dashboard
hat nur Jörg).

## 14. Nachtrag 21.09.2026 abends #3 · Zugangsseite neu geordnet

Jörgs Einwand gegen die vorherige Überschrift „Phase 1: Interview und Finanzdaten":
brach auf schmaleren Bildschirmen um, UND falsche Gewichtung — das Produkt ist die
360° Business-Analyse, „Phase 1" nur der aktuelle Schritt darin. Gelöst durch
Drehung der Hierarchie statt durch Box-Verbreiterung oder Wort-Kürzung allein:
- **Große Überschrift:** „360° Business-Analyse" (das Produkt, immer einzeilig).
- **Kleine Zeile darüber:** „Phase 1 · Interview & Finanzdaten" (mit „&" statt „und").
- **Zugangs-Hinweis-Text** in drei Absätze geteilt (vor „Den persönlichen Link" und
  vor „Bei Fragen"), mehr Luft zwischen den Sätzen.

`app/page.tsx` + `data/texte-seed.json`. Lokale und Live-Datenbank sind dasselbe
Supabase-Projekt — ein lokal gesetzter Text-Wert gilt sofort auch live, kein
separater Schritt nötig. `1fe7b75` auf bau+main, live per echtem Browser bestätigt.

## 15. Nachtrag 22.09.2026 · Erinnerungen gezielt statt generisch

Jörg-Auftrag: Prüfen, ob Workbook und Finanzdaten schon vorliegen, bevor eine
Erinnerung rausgeht — liegt beides vor, keine Erinnerung mehr; fehlt nur eine
Sache, soll die Mail ausschließlich die fehlende Sache benennen.

Umgesetzt in `lib/erinnerungen.ts` (`fehlendeUnterlagen`, reine Funktion,
Workbook fehlt bei `status !== 'abgeschlossen'`, Finanzdaten fehlen bei leerem
`wb_dateien`), `lib/erinnerungen-lauf.ts` (zählt `wb_dateien` je fälliger
Sitzung, überspringt bei beidem erledigt — der frühere Datenbank-Filter
`.neq('status','abgeschlossen')` ist weg, sonst wäre ein fertiges Workbook ohne
Finanzdaten fälschlich stumm geblieben), `lib/mail.ts` (wählt zwischen
generischer und `_teilweise`-Textfassung + `{fehlt}`-Wert). Drei neue,
admin-editierbare Textpaare im Bereich „E-Mails" (14/10/7 Tage × teilweise),
grammatikalisch bewusst so gebaut, dass Singular („dein Workbook") und Plural
(„deine Finanzdaten") nie ein Verb-Kongruenz-Problem erzeugen.

Lokal end-to-end gegen die echte, geteilte Datenbank getestet (sichere interne
Test-Sitzung, sofort wieder gelöscht, keine echte Kundensitzung verändert).
`95f3dce` auf bau+main, live per echtem Browser bestätigt (Bundle-Inhalt
geprüft, nicht Kommandozeile — wegen des Checkpoint-Vorfalls vom 21.09.).

## 16. Nachtrag 22.09.2026 #2 · Kunden-Mails in Kopie an controlling@

Jörg-Auftrag: jede versendete Mail auch an `controlling@joerg-roos.com`. Umgesetzt
für die Link-Mail und alle sechs Erinnerungs-Fassungen über ein echtes `cc`-Feld
(`kopieInternBeiEcht()` in `lib/mail.ts`), nicht als separater Zweit-Versand —
außer bei einer Test-Sitzung. Die „Workbook fertig"-Mail bekommt bewusst KEIN
zusätzliches cc: sie erreicht controlling@ bereits über eine eigene, inhaltlich
passendere interne Mail (Kontaktdaten statt bloßer Kopie) — ein cc dort hätte zu
einer doppelten Zustellung geführt.

⚠ Nicht live mit echtem Mail-Versand geprüft (`RESEND_API_KEY` ist auch lokal
weiterhin leer, siehe „Offen für Jörg" oben) — nur tsc, Build und die
Prüfskripte, plus ein sauberer 401 der Cron-Route live (kein Server-Absturz
beim neuen Code-Pfad). Der erste echte Versand mit sichtbarem cc-Feld ist erst
möglich, sobald der Resend-Schlüssel gesetzt ist. `b6a58c9` auf bau+main.

## 17. Nachtrag 22.09.2026 #3 · Kleine Überschrift Kunden-Landeseite

„Dein Workbook“ → „Dein persönlicher Arbeitsbereich“ auf `/w/[token]`
(`components/KundenStart.tsx`, Zeile mit der `eyebrow`-Klasse). Lokal mit
Test-Sitzung visuell bestätigt, sofort gelöscht. `a1cf903` auf bau+main.

⚠ **Live nicht per Bundle-Suche nachgewiesen** — anders als sonst in dieser
Übergabe: Der Text sitzt in `KundenStart.tsx`, die nur geladen wird, wenn ein
gültiger Kunden-Token in der URL steht. Ein ungültiger Token rendert
serverseitig `UngueltigerLink` statt `KundenStart` — die Komponente (und ihr
JS-Bündel) wird dann gar nicht erst angefragt. Ohne Live-Admin-Zugang stand
kein gültiger Token zur Verfügung. Das Deploy-Muster war in dieser Sitzung
bislang jedes Mal zuverlässig, aber das ist kein Ersatz für einen echten Blick
auf einen echten Kunden-Link. **Bitte einmal selbst mit einem gültigen Link
gegenprüfen.**

⚠ **Nachgezogener Fehler beim Pflegen dieser Übergabe:** Die HEAD-Zeile ganz
oben blieb über mehrere Nachträge (design/f3d640b bis cc-controlling/b6a58c9)
unbemerkt auf `1fe7b75` stehen, weil ein Text-Ersetzungsschritt den falschen
Suchtext hatte und beim nächsten Mal stillschweigend nichts tat, statt einen
Fehler zu werfen. Jetzt auf den echten Stand korrigiert. Lehre: Bei so einer
Ersetzung künftig mit einer Prüfung arbeiten, die abbricht, wenn der Suchtext
nicht mehr passt — nicht mit einem stillen `.replace()`.

## 18. Nachtrag 22.09.2026 #4 · Management Summary nach Kunden-Abschluss

Neu, im Detail in `CLAUDE.md` → „Management Summary nach Kunden-Abschluss":
Nach jedem echten Erst-Abschluss eines Kunden-Workbooks läuft im Hintergrund
eine KI-Analyse der Antworten (`claude-sonnet-5`, Business-Coach-Rolle,
„zwischen den Zeilen lesen") und schickt eine Management Summary als
`.docx` **ausschließlich** an `controlling@joerg-roos.com`. Der Kunde bekommt
diese Mail nie — eigener Code-Pfad, kein cc auf dem Kunden-Mail-Weg.

**Neue Dateien:** `lib/management-summary.ts` (Text-Aufbereitung, KI-Aufruf,
Word-Erzeugung — eigenständig wie `lib/erinnerungen.ts`, gleicher Grund),
`lib/management-summary-lauf.ts` (verbindet das mit dem Mail-Versand),
`scripts/check-management-summary.mjs`. Neue Abhängigkeit: `docx` (npm).
Geändert: `lib/abschluss.ts` (neues Feld `neuAbgeschlossen`), die
Abschluss-Route (`after()` aus `next/server`, `maxDuration` 60→90),
`lib/mail.ts` (`managementSummaryMailSenden`).

**Zwei echte API-Fallen gefunden und behoben** (nur durch einen echten
Aufruf gegen die Anthropic-API sichtbar, nicht im Typ-Check): `claude-sonnet-5`
lehnt `temperature` mit HTTP 400 ab ("deprecated for this model") — anders
als das ältere Haiku-Modell in `lib/glaettung.ts`. Und `max_tokens: 3000` war
für die sechs Antwortfelder zu knapp — die strukturierte Antwort brach mitten
im JSON ab (Platzhalter statt echter Stichpunkte); auf `6000` angehoben.

**Echter End-to-End-Test** mit erfundenen Antworten (kein DB-Zugriff, keine
Mail): Die Analyse liest tatsächlich zwischen den Zeilen — erkannte in einem
Testfall z. B. die stille Abhängigkeit vom Steuerberater statt eigener
Zahlen-Kontrolle und benannte eine Formulierung des (fiktiven) Kunden als
mögliche Schutzbehauptung. Die erzeugte Word-Datei ist ein echter, gültiger
`.docx`-Container (ZIP mit PK-Signatur).

⚠ **Nicht geprüft:** der tatsächliche Mail-Versand — `RESEND_API_KEY` ist
lokal weiterhin leer. Ebenso nicht mit einem vollständigen Kunden-Durchlauf
durch die eigentliche Abschluss-Route getestet (hätte alle ~90 Fragen des
echten Fragebogens beantworten müssen) — stattdessen `analysiere()` und
`docxErzeugen()` direkt mit einem realistischen Test-Datensatz aufgerufen.
Die Verkabelung selbst (`neuAbgeschlossen`-Flag, `after()`-Aufruf) ist per
Code-Review und Typ-Check abgesichert, nicht per echtem Durchlauf. **Der
erste echte Kunden-Abschluss ist damit der erste echte Beweis** — bitte den
Posteingang von controlling@ danach kurz prüfen.

11/11 Prüfskripte, tsc, Produktionsbau grün. `e9275fe` auf bau+main, live
per 405-Statuscode auf der neuen Route bestätigt (kein Server-Absturz) —
nicht per Bundle-Inhalt, weil der Code rein serverseitig ist.

## 19. Betriebs-Lehre 22.09.2026 · Backticks mit spitzen Klammern in der Shell

Beim Schreiben dieses Nachtrags ist ein Bash-Aufruf mit Parse-Fehler
abgebrochen, BEVOR er etwas verändert hat (nichts Halbes hängen geblieben).
Ursache: eine Session-Log-Zeile enthielt in Backticks eingeschlossenen Text
mit spitzen Klammern (Platzhalter-Notation) — für die Shell sind `<`/`>`
Umleitungs-Zeichen, das bricht die Befehlszeile mitten im Backtick-Block.
Lehre: Session-Log-Zeilen mit Code-Begriffen in Backticks künftig über ein
einfach gequotetes Heredoc (`<<'EOF'`) schreiben, nie als doppelt gequotete
Bash-Variable — das schließt jede Shell-Interpretation zuverlässig aus,
unabhängig vom Inhalt.

## 20. Nachtrag 22.09.2026 #5 · Klarstellung, Download, Wording, echter Testkunde

**Klarstellung Mail-Versand (Jörg-Rückmeldung):** Meine frühere Formulierung
„Mail-Versand nicht geprüft" hat missverständlich geklungen, als sei der
E-Mail-Versand generell unsicher — das war falsch formuliert. `RESEND_API_KEY`
fehlt ausschließlich in der lokalen Testumgebung hier. Live ist er gesetzt und
funktioniert nachweislich (Jörg hat selbst eine echte, live versendete
Erinnerungsmail an Finja Roos gesehen). Betroffen von der fehlenden lokalen
Prüfung ist nur: Ich konnte den allerletzten Schritt (den tatsächlichen
Resend-Aufruf) meiner eigenen lokalen Tests nicht beobachten — nicht, dass
der Versand selbst irgendwo unsicher wäre.

**Management Summary jetzt im Admin herunterladbar.** Neuer Speicherbereich
`management-summaries` (Migration 009, Spalte `wb_sessions.
management_summary_path`), Knopf „Management Summary öffnen" direkt neben
„PDF öffnen" in der Kunden-Kachel. Die Datei wird jetzt IMMER abgelegt, bevor
die Mail verschickt wird — bleibt also auch abrufbar, falls der Mail-Versand
scheitert.

**Wording-Korrektur:** Die drei `_teilweise`-Erinnerungstexte nannten die
fehlende Sache „eine Kleinigkeit" — unpassend, wenn es um die Finanzdaten
geht, das Herzstück der Analyse. Jetzt neutral: „es fehlt uns von dir noch:
{fehlt}", ohne verharmlosendes Wort. Gilt für alle drei Stufen (14/10/7),
nicht nur die, die Jörg live gesehen hat — die gleiche Formulierung stand
in allen dreien.

**Echter Testkunde, kompletter Durchlauf:** Sitzung „Daniel Tester ·
Schreinerei Tester GmbH" angelegt (`joerg@familie-roos.net`, `test: false` —
bewusst kein Test-Flag, sonst hätte die Management Summary gar nicht
ausgelöst, siehe deren eigene Test-Sperre), alle 91 Fragen inhaltlich
plausibel beantwortet (Schreinerei, 700.000 € Umsatz, 5 Gesellen, 1
Minijobber, 1 Azubi — mit bewusst gelegten Schwachstellen bei Zahlen,
Marketing und einem vermiedenen Mitarbeitergespräch, damit die Analyse
etwas zu finden hat), Aha-Moment gesetzt, komplett abgeschlossen. Ergebnis:
Kunden-PDF (1,3 MB) und Management Summary (echtes .docx, 11 KB) beide
erfolgreich erzeugt und in Supabase abgelegt — **beide Dateien liegen als
Anhang in dieser Sitzung**, zusätzlich jederzeit über den Admin abrufbar
(dieselbe geteilte Datenbank wie live). Die Analyse-Qualität ist wirklich
gut: erkannte u. a. aus der Kombination „Sonntage klappen nicht jede Woche"
+ niedriger Energie-Wert eine mögliche private Belastung, obwohl das im
Workbook nirgends direkt gesagt wurde.

**Einzige Lücke weiterhin:** Kunden-Mail, interne Mail und Management-
Summary-Mail sind bei diesem Testlauf lokal wie erwartet an
`RESEND_API_KEY fehlt` gescheitert (`mailFehler: true` in der Antwort) —
das betrifft nur diesen lokalen Testlauf, nicht die Live-Umgebung (siehe
Klarstellung oben).

**Wichtig — Aufräumen:** Die Sitzung „Daniel Tester" ist eine ECHTE
(nicht-Test-)Sitzung und zählt aktuell in Statistik und Erfolgsrad mit. Bitte
nach dem Prüfen im Admin unter „Kunden" löschen (räumt automatisch beide
Speicherbereiche mit auf).

`674ce6e` auf bau+main, live per 401 auf der neuen Route bestätigt (kein
Absturz). 11 Prüfskripte, tsc, Produktionsbau grün.

## 21. Nachtrag 22.09.2026 #6 · Mail-Versand bestätigt, CI-Design, echte Zuverlässigkeits-Lücke gefunden und behoben

**Live-Mail-Versand direkt bewiesen (nicht nur behauptet):** über Daniel Testers echten
Token `POST /api/w/<token>/link` auf der LIVE-Seite ausgelöst (kein Admin-Login nötig,
nur der Kunden-Token) — `{"ok":true}`. Das ist derselbe `sendeMail()`-Weg, den auch die
Management Summary nutzt. Live funktioniert der Versand also nachweislich.

**Management Summary jetzt im JR-CI** (`lib/management-summary.ts` → `docxErzeugen`):
Logo im Kopf (Originalproportion 7,87:1, aus `public/logo-full.png`), Montserrat,
Farben wie im PDF (`ED7A02` / `0F1B23` / `5F676C`), orange Eyebrow-Zeile, Zwischen-
überschriften mit orangem Unterstrich, Fußzeile mit Copyright + Seitenzahl.

**Echte, bisher unentdeckte Zuverlässigkeits-Lücke gefunden und behoben:** Bei
Daniel Testers echtem, umfangreichem Antwortsatz (91 Fragen) brach die Analyse bei
mehreren aufeinanderfolgenden echten API-Aufrufen REGELMÄSSIG ab — `claude-sonnet-5`
lieferte die Listenfelder in der strukturierten Antwort nicht als echtes Array,
sondern als einzelne Zeichenkette (mal `<item>`-Markup, mal feld-spezifische Tag-
Namen wie `<staerke>`, mal reine Zeilen ohne Markup, mal ein einzelner Satz ohne
jeden Trenner). Keine Token-Grenze, kein Zufall — bei kleineren Testdatensätzen
trat es nie auf, bei diesem großen Datensatz jedes Mal. `alsListe()` normalisiert
jetzt alle beobachteten Formen zu einer echten Liste (generisches Tag-Muster,
nicht auf „item" festgelegt), sechs neue Testfälle sichern das ab. Ohne diesen
Fund hätte JEDER Kunde mit einem ähnlich umfangreichen Antwortsatz vermutlich
NIE eine Management Summary bekommen — bei kleinen Testdatensätzen wäre das nie
aufgefallen.

**Endgültige Fassung für Daniel Tester erzeugt und gespeichert** (direkt gegen die
geteilte Datenbank, Storage-Pfad aktualisiert) — liegt jetzt im Admin bereit und
wurde Jörg als Datei geschickt. Der lokale Mailversand-Schritt wurde dabei bewusst
nicht erneut versucht (bereits bekannt: scheitert lokal an `RESEND_API_KEY`, bringt
keine neue Erkenntnis — der Versandweg selbst ist über den `/link`-Test oben bereits
bewiesen).

`0cff80f` auf bau+main. 11 Prüfskripte, tsc, Produktionsbau grün.

## 22. Nachtrag 22.09.2026 #7 · Inhalt war zu dünn — echte Ursache behoben, nicht nur kaschiert

Jörg-Rückmeldung: die reparierte Fassung war inhaltlich spürbar dünner als die
allererste. Berechtigt — die vorherige Reparatur (`alsListe`-Normalisierung, siehe
Nachtrag #6) hat zwar verhindert, dass die Erzeugung abbricht, aber nicht das
eigentliche Problem gelöst: sie hat einen kollabierten, zu dünnen Stichpunkt
akzeptiert, statt einen reichhaltigen zu erzwingen.

**Root Cause:** `claude-sonnet-5` hält die feste JSON-Array-Struktur einer
Werkzeug-Antwort (`tool_choice`) bei einem großen, echten Datensatz (91 Fragen)
nicht zuverlässig durch — manchmal kollabiert ein Listenfeld auf einen einzigen,
stark verkürzten Stichpunkt statt mehrerer, unabhängig von Prompt-Feinschliff.

**Der eigentliche Fix:** komplette Umstellung von JSON-Werkzeug auf Markdown.
`lib/management-summary.ts` verlangt jetzt sechs Markdown-Abschnitte mit fester
Überschrift (`## Titel`) und `- `-Stichpunkten, `parseMarkdown()` liest das
deterministisch per Regex aus. Sprachmodelle halten eine Fließtext-Struktur mit
Markdown-Überschriften für lange, inhaltsreiche Antworten erwiesenermaßen sehr
viel zuverlässiger durch als ein tief verschachteltes JSON-Schema — das war die
falsche Werkzeugwahl für diese Aufgabe, nicht nur ein Formatierungsproblem.

**Fünf von fünf Testläufen** mit Daniel Testers echten 91 Antworten:
durchgehend 5 Stichpunkte je Abschnitt (Ziel war drei bis fünf), inhaltlich
sichtbar reichhaltiger als beide vorherigen Fassungen — u. a. eine neue,
tiefere Beobachtung zur fehlenden Neupositionierung nach der Betriebs-
übernahme, die in den dünneren Fassungen nicht auftauchte.

**Endgültige, dritte Fassung für Daniel Tester erzeugt und gespeichert** —
liegt im Admin bereit, wurde Jörg als Datei geschickt.

`8da299e` auf bau+main. 11 Prüfskripte, tsc, Produktionsbau grün.

## 22. Nachtrag 22.09.2026 #7 · Sprachaufnahme in Chrome — Ursache gefunden

Jörgs Fehlerbild, wörtlich: *„Es ist einfach nur nichts passiert"* — keine Warnung,
keine Meldung. Damit war die Pegel-Warnung („Kein Ton") als Ursache ausgeschlossen.

**Erst gemessen, dann gebaut.** In Jörgs echtem Chrome (über die Chrome-Steuerung,
echtes Shure MV6) fünf Aufnahmen à 3 Sekunden gefahren: **5 von 5 sauber**, je ~48 KB,
Mikrofon-Freigabe in 206–279 ms, `AudioContext` lief. Ergebnis: Der Aufnahme-Weg selbst
ist in Ordnung — der Fehler steckt in der Ablauflogik drumherum.

**Die eigentliche Ursache — zwei Dinge, die zusammenspielen:**
1. **Kein Signal während des Öffnens.** Zwischen Klick und laufender Aufnahme vergehen
   gemessen ~250 ms, in denen der Knopf früher unverändert aussah. Wer da aus Ungeduld
   ein zweites Mal klickt, stoppt die gerade gestartete Aufnahme sofort wieder.
2. **Der Rekorder lieferte seine Daten nur im Sekundentakt** (`r.start(1000)`). Eine
   Aufnahme, die nach Millisekunden gestoppt wird, enthält deshalb **null Byte** — und
   die alte Prüfung `blob.size < 2000` verwarf sie. Im Browser-Test nachgestellt: zwei
   Klicks im Abstand von 60 ms ergaben `teile: 0, bytes: 0`.

**Behoben:** Zustand `startet` mit Lade-Ring und Wiedereintritts-Sperre (drei Klicks im
60-ms-Takt erzeugen jetzt nachweislich **genau eine** Aufnahme statt Start-Stopp-Start) ·
Taktung auf 250 ms (eine 350-ms-Aufnahme liefert jetzt 4991 Byte statt null) · Leer-Prüfung
hängt nicht mehr an einer Byte-Grenze, sondern daran, ob überhaupt Tondaten da sind.

**Dazu vier stille Sackgassen geschlossen** — Wege, auf denen der Code vorher wortlos
nichts tat:
- `confirm()` als Einwilligungs-Dialog: Chrome unterdrückt Dialoge einer Seite dauerhaft,
  sobald der Nutzer einmal „weitere Dialoge verhindern" ankreuzt. Danach lieferte `confirm()`
  **ohne jede Anzeige** `false` und der Knopf tat schlicht nichts, für immer. Der Hinweis
  steht jetzt als Karte in der Seite.
- `stopp()` lief ins Leere, wenn der Rekorder nicht mehr `recording` war — Anzeige blieb
  ewig auf „Aufnahme läuft". Jetzt endet jeder Weg über **eine** Abschluss-Funktion, plus
  Wachhund (3 s), falls `onstop` ausbleibt.
- Der `catch` beim Start verschluckte jeden Fehler und behauptete pauschal „Kein Zugriff
  auf das Mikrofon" — ohne Protokoll. Jetzt je Fall ein eigener Satz (blockiert / kein
  Gerät / von Teams oder Zoom belegt) und `console.warn` mit Grund.
- Bricht die Tonspur mitten in der Aufnahme weg (Gerät abgezogen, von einem anderen
  Programm übernommen), wird jetzt sauber abgeschlossen statt hängen zu bleiben.

**Pegel-Warnung entschärft:** Schwelle von 0,01 auf 0,002 und von 3 auf 6 Sekunden. Das
Grundrauschen von Jörgs Shure MV6 wurde mit 0,0063 gemessen — die alte Schwelle hätte bei
jeder Denkpause falschen Alarm ausgelöst.

**Warum NICHT der Weg von JOERG AI übernommen wurde:** JOERG AI nutzt die browsereigene
Spracherkennung (`webkitSpeechRecognition`). Das passt dort für kurze Chat-Nachrichten,
taugt aber nicht für das Workbook: kein Firefox, keine Zeichensetzung, keine Glättung, und
bei langen Antworten (hier bis 5 Minuten) bricht Chrome die Erkennung laufend ab — JOERG AIs
Code fängt das mit Neustart-Behelfen ab. Die Messung hat außerdem gezeigt, dass der
Whisper-Weg gar nicht das Problem war. Dazu käme ein Wechsel des Empfängers der Sprachdaten
(Google statt OpenAI) — die gerade veröffentlichte Datenschutzseite müsste neu geschrieben
werden.

**Geprüft** im echten Browser mit eingespeistem Tonstrom, über die echte Oberfläche:
Einwilligungs-Karte · gesperrtes Mikrofon meldet sich klar statt stumm · vollständiger Weg
Aufnahme → 48 Teile/230 KB → Upload → Server → OpenAI-Antwort → sichtbare Rückmeldung ·
Erholung nach Fehler · Dreifachklick erzeugt eine Aufnahme. Interne Testsitzung danach
gelöscht. 11 Prüfskripte, tsc, Produktionsbau grün.

**Nicht geprüft:** echte gesprochene Sprache durchs echte Mikrofon bis zum fertigen Text —
im Browser-Bereich ist das Mikrofon gesperrt, und Jörgs Chrome war beim Abschluss zu.
**Jörg testet das bitte einmal selbst.**

## 23. Nachtrag 22.09.2026 #8 · Die Glättung antwortete, statt zu glätten

Jörg meldete: Auf „Was sind deine Hobbys?" sprach er **„Fußball, Grillen und Reisen"** —
im Antwortfeld stand danach *„Ich kann diese Anweisung nicht ausführen, da kein Text zur
Bearbeitung vorhanden ist. Du hast nur drei Stichpunkte eingegeben …"*. Auf „Wo wohnst du?"
(„Haltern am See") kam eine Bemerkung über Nordrhein-Westfalen. Das Sprachmodell hat also
**die Antwort des Kunden als Auftrag an sich selbst gelesen** und seine Rückfrage landete
als Antwort im Workbook.

**Zwei Ursachen, beide behoben:**
1. **Die Glättung kannte die Frage nicht.** Sie sah nur „Haltern am See" und hielt das für
   einen unvollständigen Auftrag. Jetzt bekommt sie die Frage als Zusammenhang mit —
   **nachgeschlagen auf dem Server** über die Fragen-Kennung aus dem Snapshot, nicht als
   Text aus dem Browser. Sonst könnte über das Formular beliebiger Text in die Anweisung
   an das Sprachmodell geschoben werden. Das Aha-Feld auf der Ergebnisseite nutzt dafür
   die Kennung `aha`, der Server holt den Text aus `wb_texte.aha_frage`.
2. **Kurze Antworten gingen überhaupt erst zum Modell.** Die alte Grenze lag bei 12 Zeichen,
   jetzt bei 40 — an „Fußball, Grillen und Reisen" ist nichts zu glätten.

**Dazu drei Sicherungen, damit so etwas nie wieder in eine Kundenantwort gerät:**
- **Vorbelegte Antwort** (`assistant`-Nachricht `<geglaettet>`): Das Modell kann gar nicht
  mit einem Vorwort oder einer Rückfrage anfangen, es schreibt zwangsläufig im Text weiter.
- **Verschärfte Anweisung:** „Du bist ein Schreibwerkzeug, kein Gesprächspartner … Stichpunkte
  bleiben Stichpunkte." Die Frage dient ausdrücklich nur dem Verständnis.
- **`wirktWieKommentar()`** prüft das Ergebnis: verräterische Wendungen („kein Text zur
  Bearbeitung", „bitte stelle mir", „als KI") oder ein Ergebnis, das mehr als das 2,5-fache
  der Vorlage umfasst (dann wurde gedichtet). Trifft eines zu, wird die **Rohabschrift**
  verwendet statt der Modellantwort. Abgesichert durch `scripts/check-glaettung.mjs` mit
  Jörgs echter Fehlantwort als Testfall (jetzt 12 Prüfskripte).

**Echt geprüft, nicht nur behauptet** — mit echten Aufrufen beim Sprachmodell und, über den
echten Server-Weg, mit echter gesprochener Sprache (macOS-Stimme `say` → `.m4a` → Route):

| gesprochen | Ergebnis |
|---|---|
| „Fußball, Grillen und Reisen" | „Fußball, Grillen und Reisen." (unverändert, kein Kommentar) |
| „Fußball, Grillen, Reisen, Motorrad und Skifahren" (über der Grenze, geht zum Modell) | unverändert |
| „Sanitär, Heizung, Klima, Bad, Wärmepumpe, Solar" | unverändert |
| „ja also Fußball ähm Grillen und Reisen mit der Familie das mache ich gerne" | „Ja, also Fußball, Grillen und Reisen mit der Familie – das mache ich gerne." |
| „also ähm ich wohne in Haltern am See … seit zwölf Jahren" | „Ich wohne in Haltern am See. Da wohne ich jetzt schon seit 12 Jahren zusammen mit meiner Familie." |
| „fünf Gesellen einen Azubi und ein Minijobber … sieben Leute" | „Wir sind 5 Gesellen, 1 Azubi und 1 Minijobber, also insgesamt 7 Leute plus ich." |

**Nebenbefund für den offenen Punkt „Modellwechsel":** Beim Test verstand
`gpt-4o-mini-transcribe` aus der Roboterstimme „Haltern am See" ein „Taltern am See" —
Eigennamen sind die Schwachstelle. Das ist genau das, was `gpt-4o-transcribe` mit einem
Wortschatz-Prompt (Orte, Gewerke, Fachbegriffe) verbessern würde. Kein Glättungs-Fehler:
Die Antwort blieb eine Antwort.

12 Prüfskripte, tsc, Produktionsbau grün. Testsitzungen gelöscht.

## 24. Nachtrag 22.09.2026 #9 · Spracherkennung: Modell gewechselt, Wortschatz eingeführt

Jörg-Auftrag: „das aktuellste oder beste". Erst die Modell-Liste bei OpenAI abgefragt statt
aus dem Gedächtnis zu raten — es gibt inzwischen `gpt-transcribe`, `gpt-4o-transcribe`,
`gpt-4o-transcribe-diarize` und neuere Datumsstände von `gpt-4o-mini-transcribe`.

**Gemessen statt geglaubt.** Fünf deutsche Testsätze mit genau den Stolperfallen des
Workbooks (Orte, Gewerke, Zahlen, Fachbegriffe, Markenname), einmal sauber gesprochen und
einmal mit kräftigem Störgeräusch plus schnellerem Sprechen — so klingt ein Handwerker in
der Werkstatt oder im Auto. Trefferquote bei **gestörtem** Ton:

| Variante | Trefferquote |
|---|---|
| `gpt-4o-mini-transcribe` ohne Wortschatz (Stand bis heute) | **74,6 %** |
| `gpt-4o-mini-transcribe` mit Wortschatz | 94,3 % |
| `gpt-4o-transcribe` mit Wortschatz | 96,3 % |
| **`gpt-transcribe` mit Wortschatz** | **97,6 %** ← jetzt in Betrieb |
| `gpt-transcribe` ohne Wortschatz | 86,1 % |

**Die wichtigste Erkenntnis: Der Wortschatz bringt mehr als das Modell.** Das beste Modell
fällt ohne ihn auf 86 %, das schwächste steigt mit ihm auf 94 %. Deshalb beides.

So klang der alte Stand bei Störgeräusch — das hätte jeder Kunde in seinem Workbook
stehen gehabt: *„Mein **Feuerberater** macht die **DW aus**, aber die **Sonnen- und
Seitenlichter** schaue ich mir selbst an"* · *„Wir haben fünf **Busse**, einen **Bus** und
einen **Minibusser**"* · *„Ich arbeite mit **Jörg Rufs** zusammen"*.

Dasselbe verrauschte Material über den echten Server-Weg nach der Umstellung, wörtlich:
*„Mein Steuerberater macht die BWA, aber die Summen- und Saldenliste schaue ich mir selbst
an"* · *„Wir haben 5 Gesellen, einen Azubi und einen Minijobber und machen rund 700.000
Euro"* · *„Ich wohne in Haltern am See und mein Betrieb ist in Recklinghausen"* · *„Ich
arbeite mit Jörg Roos zusammen"*. Antwortzeit inklusive Glättung: **1,5 bis 2,5 Sekunden**.

**Der Wortschatz steht in `lib/stt.ts` als `WORTSCHATZ`** und ist bewusst kurz: Orte aus
Jörgs Umfeld, Gewerke, Zahlen-/Controlling-Begriffe, Marken. Eine überlange Liste verleitet
das Modell dazu, Wörter zu hören, die niemand gesagt hat. Wer ihn erweitert: sparsam bleiben
und danach eine Messung wie oben fahren. Falls das später Jörg selbst pflegen soll, gehört
er in den Admin-Bereich „Texte" — heute bewusst nicht, weil er kein Kundentext ist.

12 Prüfskripte, tsc, Produktionsbau grün. Testsitzung gelöscht.

## 25. Nachtrag 22.09.2026 #10 · Unterlagen-Checkliste an der Finanzdaten-Kachel

Jörg-Auftrag: In der Finanzdaten-Kachel sollen die **ersten Worte des Textes ein Link**
sein, der ein Fenster mit den benötigten Unterlagen öffnet — und die Punkte darin sollen
**abhakbar** sein, „so dass wir dann pro Kunde oder der Kunde auch jeweils gucken kann, was
er uns schon geschickt hat und was eben noch nicht".

**Wo die Haken liegen: in der Datenbank an der Sitzung**, nicht im Browser
(`wb_sessions.checkliste`, Migration 010, jsonb). Damit sieht der Kunde seinen Stand auf
jedem Gerät, und Jörg sieht ihn im Admin — beides war in Jörgs Satz gefordert. Gespeichert
wird **je Punkt einzeln**, nicht die ganze Liste: Hakt jemand auf dem Handy und am Rechner
gleichzeitig etwas ab, überschreibt keiner den anderen.

**Die fünf Punkte stehen in `lib/checkliste.ts`** mit fester Kennung (`jahresabschluss`,
`fixkosten`, `kontostand`, `bwa`, `susa`). **Die Kennungen sind der Schlüssel in der
Datenbank — wer sie ändert, löscht bestehenden Kunden die Haken.** Der Text darf sich
ändern, die Kennung nicht; `scripts/check-checkliste.mjs` hält das fest. Die Route nimmt
nur bekannte Kennungen an (auch `__proto__` wird abgewiesen).

**Der Link entsteht aus dem Kacheltext selbst:** `teileKacheltext()` trennt am
Gedankenstrich — der Teil davor („Jahresabschlüsse, Summen- und Saldenlisten, BWA und
Kontostände") wird zum Link, der Rest bleibt normaler Text. **Damit bleibt der Text im
Admin unter „Texte" änderbar**, ohne dass jemand Code anfassen muss; Jörg steuert die
Link-Worte über die Stelle des Gedankenstrichs. Fehlt er, wird der ganze Text zum Link,
statt zu raten.

**Eine Stolperstelle, die Arbeit gemacht hat:** Die Kachel war ein `<button>`. Ein Knopf im
Knopf ist ungültiges HTML — der Browser zieht den inneren heraus und die Kachel fällt
auseinander. Die Kachel ist deshalb jetzt eine Fläche mit Knopf-Rolle (`role="button"`,
`tabIndex`, Enter/Leertaste von Hand nachgebaut); der Link im Text ist ein echter Knopf
mit `stopPropagation`. Beides geprüft: Klick und Enter auf die Kachel öffnen weiterhin den
Upload, der Link öffnet nur das Unterlagen-Fenster, kein `button button` im fertigen DOM.

**Vier neue Texte im Admin unter „Texte"**: `unterlagen_intro`, `unterlagen_muster`,
`unterlagen_link_text`, `unterlagen_link` (SharePoint-Ordner mit den Musterdateien).
Korrektur Jörg 22.09.: Der Link zeigte auf den **übergeordneten** Ordner
`3-360BA-Kickoff-Unterlagen` (dort liegen auch Workbook und Wegbeschreibung), jetzt direkt
auf `…/1-Finanzdaten-Muster` mit den sechs Musterdateien; Linktext „Finanzdaten-Muster".
Beide Adressen im sauberen Browser ohne Microsoft-Konto geprüft — **beide öffnen sich**,
das von Jörg gesehene weiße Fenster ließ sich nicht nachstellen (⚠ Ursache damit offen;
falls es wiederkommt, liegt es nicht an der Freigabe). Fehlt die Adresse ganz, wird der
Link samt Vorspann gar nicht erst angezeigt statt als toter Verweis.
Die **Punkte selbst stehen bewusst nicht** dort — sie tragen die Kennungen.

**Im Admin** zeigt jede Kunden-Zeile „Unterlagen 2/5"; beim Draufzeigen stehen die offenen
Punkte im Klartext.

**Geprüft über die echte Oberfläche:** Link sitzt auf den ersten Worten · Fenster öffnet ·
zwei Punkte abgehakt → in der Datenbank nachgesehen (`{"bwa":true,"jahresabschluss":true}`)
· Seite neu geladen → Haken stehen noch, Balken „2 von 5 erledigt" · Musterdaten-Link
vorhanden · Admin-API liefert die Checkliste · beide neuen Anzeigen im ausgelieferten
Bündel nachgewiesen. Testsitzung gelöscht. 13 Prüfskripte, tsc, Produktionsbau grün.

**Nicht gesehen:** die Admin-Zeile im laufenden Bild — dafür hätte das Admin-Passwort durch
den Browser gehen müssen. Nachgewiesen ist sie über Typprüfung, API-Antwort und Bündel.
