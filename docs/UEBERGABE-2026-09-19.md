# Übergabe · 360BA Online-Workbook · Stand 19.09.2026 abends

Für den nächsten Chat. Alles, was nötig ist, um ohne Rückfragen weiterzuarbeiten. Auftraggeber: Jörg Roos. Sprache zu Jörg: Du, direkt, keine KI-Floskeln, keine englischen Tech-Wörter ohne Erklärung (Regeln in `01-CoWork/CLAUDE.md`).

## 1. Was das Projekt ist

Das Word-Workbook der 360° Business-Analyse (Vorbereitung des gemeinsamen Tages mit einem Kunden) ist eine Online-App: Kunde bekommt einen Einladungslink, beantwortet 93 Fragen (Freitext mit Spracheingabe, Skala 1–10, Tabelle), sieht sein Erfolgsrad, hält Aha-Momente fest, bekommt das fertige Workbook als PDF per Mail (Kopie an controlling@joerg-roos.com) und kann Finanzdaten hochladen. Jörg pflegt Fragen, Texte, Einladungen und Uploads im Admin.

- **Live:** https://360ba.joerg-roos.com (Vercel, Region fra1 greift). Admin: `/admin`.
- **Code:** GitHub `JOERGROOS/360BA-WORKBOOK`, Zweig `main` = Zweig `bau` (Arbeitszweig). HEAD `e0e0af0`. Vercel deployt `main` automatisch.
- **Projektordner (Synology-Sync, hier wird geschrieben und committet):** `/Users/joergroos/Library/CloudStorage/SynologyDrive-AI-BUSINSESS-OS/04-360BA-Workbook`
- **Arbeitskopie (hier laufen node, tsc, build, Dev-Server):** `/Users/joergroos/dev/360ba-workbook` — angleichen mit `./scripts/sync-lokal.sh` aus dem Projektordner. Nie auf dem Synology-Ordner bauen (Turbopack bricht ab).
- Spec, Pläne, Mockups, Design-Screenshots: `docs/` (`specs/`, `plans/`, `mockup/`, `design/`, `deployment.md`, `abholer.md`, `datenschutz-absatz.md`). Projekt-`CLAUDE.md` = technische Kurzreferenz inkl. react-pdf-Fallen.

## 2. Stack und Architektur in einem Absatz

Next.js 16 (App Router, React 19, Tailwind), Supabase (Projekt `zzmomqmegzjibnqrmzyo` = das Produktiv-Projekt von JOERG AI, Tabellen mit Präfix `wb_`, RLS aktiv, Zugriff nur serverseitig mit Service-Role-Key), Buckets `workbooks` (PDFs) und `finanzdaten` (Kunden-Uploads, privat), Resend (`noreply@joerg-roos.com`), OpenAI `gpt-4o-mini-transcribe` (Sprache), Anthropic `claude-haiku-4-5-20251001` (Text-Glättung), `@react-pdf/renderer` (PDF). Migrationen `supabase/migrations/001–007` sind eingespielt (Anleitung `supabase/README.md`, Management-API mit `SUPABASE_ACCESS_TOKEN`). Umgebungsvariablen: `SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, RESEND_API_KEY, ADMIN_PASSWORD, APP_URL` — lokal in `~/.config/360ba-workbook/.env.local` (Symlink in der Arbeitskopie), in Vercel gesetzt. ⚠ Lokal steht `APP_URL=http://localhost:3000`, in Vercel `https://360ba.joerg-roos.com` — am 19.09. waren beide Werte plus `SUPABASE_URL` in Vercel falsch kopiert; bei „Link zeigt auf localhost“ oder „Fehler mit HTML-Wust“ zuerst die Vercel-Variablen gegen die lokale Datei prüfen.

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

1. **Jörgs eigener Durchlauf** als Kunde (Admin → Übersicht → Neue Einladung → Link → Video-Platz, Kacheln, Upload, Workbook, Abschluss). Danach ZIP und „Auf meinen Mac abholen“ prüfen. Drei Mails erwartet (Einladung, Finanzdaten-Hinweis an controlling@, fertiges Workbook).
2. **Vimeo-Link** eintragen, sobald das Begrüßungsvideo da ist.
3. **Datenschutz-Absatz** aus `docs/datenschutz-absatz.md` auf joerg-roos.com ergänzen (Sub-Prozessoren: Supabase EU, Vercel Frankfurt, OpenAI USA mit Standardvertragsklauseln, Anthropic, Resend, Vimeo wenn genutzt).
4. **Sprachaufnahme in Chrome:** bei Jörgs erstem Test scheiterten 3 von 5 Aufnahmen clientseitig, bevor Audio hochging (Server sah nur 2 Aufrufe, beide ok). Messpunkte sind eingebaut (Server-Log `[transkribieren] eingang/ergebnis`, Browser-Log `[mikro] …` erscheint im Dev-Server-Terminal als `[browser]`, Pegelanzeige, Leer-Erkennung). Nächster Schritt: Jörg testet erneut in Chrome, Log lesen. Modellwechsel auf `gpt-4o-transcribe` mit Handwerker-Wortschatz-Prompt ist gemessen besser (Testskript-Idee in `scratchpad` der alten Sitzung, nicht im Repo) — nach Klärung der Aufnahme umstellen.
5. **Entscheidungen bei Jörg:** ~~Video-Kachel schmaler~~ erledigt 19.09. (jetzt rechts im Text schwimmend mit Vergrößern-Overlay, siehe Vorgaben). Foto auf der Über-Jörg-Seite (aktuell Shooting 2024, weißes Hemd) behalten?
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
„E-Mails". **Offen bei Jörg:** `CRON_SECRET` in Vercel eintragen (Wert steht
lokal in `~/.config/360ba-workbook/.env.local`), sonst läuft der tägliche
Erinnerungs-Lauf nicht — der Testknopf im Admin funktioniert unabhängig davon.
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
