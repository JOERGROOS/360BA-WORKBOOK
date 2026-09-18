# 360BA Online-Workbook

Interaktives Online-Workbook zur 360° Business-Analyse für Jörg Roos' Kunden
(Ersatz für das bisherige Word-Workbook). Interview-artiger Fragebogen,
Ergebnis-Auswertung, PDF-Export, Admin-Bereich zum Pflegen von Fragen/Texten.

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 3 · Supabase
(Tabellen-Präfix `wb_`) · Anthropic SDK + OpenAI SDK (Auswertung) · Resend
(Mail) · @react-pdf/renderer (PDF-Export).

## Arbeitskopie-Regel (Pflicht)
Dieser Ordner liegt auf dem Synology-Laufwerk — `npm install` und
`next build`/`next dev` laufen dort NICHT (Turbopack scheitert). Immer:
`./scripts/sync-lokal.sh` → gleicht nach `~/dev/360ba-workbook/` ab, dort
`npm run dev` / `npx next build`. Code wird hier im Laufwerksordner
geschrieben, nie direkt in der Arbeitskopie.

## Umgebungsvariablen
`.env.example` zeigt die Schlüssel. Echte Werte liegen in
`~/.config/360ba-workbook/.env.local` (von `sync-lokal.sh` per Symlink
eingebunden) — nie committen.

## Spec & Plan
Spec: `docs/specs/2026-09-18-online-workbook-design.md` · Plan:
`docs/plans/2026-09-18-online-workbook.md` · Fortschritt:
`.superpowers/sdd/2026-09-18-online-workbook/progress.md`.

## Prüfskripte
`npm run check` → `check-seed.mjs`, `check-punkte.mjs`, `check-geometrie.mjs`.

## Wichtig
Änderungen am Fragebogen (`wb_questions`, `wb_chapters`) wirken nur auf neue
Sitzungen — laufende `wb_sessions` behalten den Stand ihres Starts.
