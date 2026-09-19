# 360BA Online-Workbook

Stand: 19.09.2026 — Einladungslink (Task 1) fertig.

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
  Einladungsbestätigung, Interview, Ergebnis, Fertig-Seite · `app/admin/`
  Login, Fragebogen, Texte, Sitzungen (inkl. „Neue Einladung").
- `app/api/w/[token]/start` Interview starten · `app/api/w/[token]/{antwort,
  abschluss,pdf,link}` Kunden-API · `app/api/admin/*` Admin-API (Cookie-Auth,
  `POST sitzungen` legt Einladung an) ·
  `app/api/transkribieren` Sprache→Text.
- `lib/` Fachlogik (sitzung, punkte, pdf, glaettung, mail-html, bremse) ·
  `data/` Seed-JSON · `supabase/migrations/` Schema.

## So arbeitet man
1. `./scripts/sync-lokal.sh` — gleicht nach `~/dev/360ba-workbook/` ab (npm
   install/build laufen NICHT auf dem Synology-Laufwerk). Code hier im
   Laufwerksordner schreiben, nie direkt in der Arbeitskopie.
2. In der Arbeitskopie: `npm run dev` (Dev-Server) bzw. `npx next build`.
3. Test-Sitzung: `/admin` öffnen, „Vorschau als Kunde" — legt eine echte
   Sitzung mit Jörgs eigenen Daten an, zum kompletten Durchklicken.
4. Prüfskripte: `npm run check` (check-seed, check-punkte, check-geometrie)
   · `node scripts/check-glaettung.mjs` (braucht ANTHROPIC_API_KEY) ·
   `node scripts/check-mail-html.mjs` · `node scripts/check-pdf.mjs` (braucht
   laufenden Dev-Server, schreibt `docs/beispiel/beispiel.pdf`).

## Spec & Plan
Spec: `docs/specs/2026-09-18-online-workbook-design.md` · Plan:
`docs/plans/2026-09-18-online-workbook.md` · Mockup: `docs/mockup/index.html`.

## Datenbank
Supabase-Projekt `zzmomqmegzjibnqrmzyo` (JOERG AI Produktion, shared — nur
`wb_*`-Tabellen und den Bucket `workbooks` anfassen). Migration einspielen
und Seed-Ablauf: `supabase/README.md`.

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
