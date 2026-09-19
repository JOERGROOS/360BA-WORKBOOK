# Admin-Übersicht, Kunden-Kacheln, Finanzdaten-Upload — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** (1) Der Admin startet auf einer Übersichtsseite mit „Neue Einladung“ und Nutzungs-Statistiken. (2) Der Kunde sieht nach dem Öffnen seines Links zwei Kacheln: Workbook starten · Finanzdaten senden. (3) Hochgeladene Finanzdaten landen in `/Users/joergroos/_JRB-SERVER/03-FULLFILMENT/360 GRAD BUSINESSANALYSE/1-Uploads von Kunden/<Firmenname>/` auf Jörgs Mac.

**Architecture:** Statistik wird serverseitig aus `wb_sessions` gerechnet (neue Spalten `gestartet_at`, `diktate`). Uploads gehen **direkt vom Browser** in den privaten Supabase-Bucket `finanzdaten` über signierte Upload-Adressen (Vercel-Funktionen haben eine 4,5-MB-Grenze). Metadaten in `wb_dateien`. Ein Abholprogramm auf Jörgs Mac (launchd, alle 10 Minuten) lädt neue Dateien in den Zielordner und markiert sie als abgeholt.

**Tech Stack:** unverändert (Next.js 16, Supabase, Resend). Abholer: Node-Skript mit `@supabase/supabase-js`, gestartet per launchd.

## Global Constraints

- Alle Regeln aus `docs/plans/2026-09-18-online-workbook.md` gelten weiter (deutsche Bezeichner, Du-Form, keine verbotenen Wörter, DB nur serverseitig, keine neuen npm-Abhängigkeiten, Arbeitskopie-Regel, `scripts/check-*.mjs`, jede `api/admin/*`-Route mit `adminGeprueft`, Token bleibt einziger Kundenschlüssel).
- Erlaubte Upload-Typen (Endung UND Content-Type prüfen): `.pdf .xlsx .xls .csv .docx .doc .txt .pptx .ppt`. Max 50 MB je Datei, max 30 Dateien je Sitzung.
- Bucket `finanzdaten` privat; Download nur über signierte Adresse (Admin) oder Service-Role (Abholer). RLS auf `wb_dateien` aktiv, Revoke für anon/authenticated.
- Firmenname im Ordnernamen: nur `A-Za-z0-9 äöüÄÖÜß._-`, Leerzeichen bleiben, Rest → `_`, max 80 Zeichen, leer → `Kunde-<sitzung-id-kurz>`.
- Look: dunkel, ein Akzent; Kacheln groß mit Icon (Mockup-Stil `docs/mockup/index.html`).

---

### Task 1: Admin-Übersicht mit Statistik

**Files:**
- Create: `supabase/migrations/004_statistik.sql`, `app/api/admin/statistik/route.ts`, `components/admin/Uebersicht.tsx`, `lib/statistik.ts`, `scripts/check-statistik.mjs`
- Modify: `lib/db.ts` (Spalten), `lib/sitzung.ts` (`sitzungStarten` setzt `gestartet_at`), `app/api/transkribieren/route.ts` (`diktate + 1` bei Erfolg), `app/admin/page.tsx` (Bereich `uebersicht` als Standard, Reihenfolge Übersicht · Workbooks · Fragebogen · Texte), `components/admin/Sitzungen.tsx` (Formular „Neue Einladung“ in eigene wiederverwendbare Komponente auslagern, falls nicht schon `EinladungFormular`), `supabase/README.md`, `CLAUDE.md`

**Interfaces:**
- Migration: `alter table wb_sessions add column if not exists gestartet_at timestamptz, add column if not exists diktate int not null default 0;`
- `berechneStatistik(sitzungen: SitzungFuerStatistik[]): Statistik` — reine Funktion in `lib/statistik.ts`:
  ```ts
  type SitzungFuerStatistik = Pick<Sitzung, 'status'|'test'|'created_at'|'gestartet_at'|'abgeschlossen_at'|'fragen_snapshot'|'antworten'|'diktate'>;
  type Statistik = {
    anzahl: { eingeladen: number; laufend: number; ergebnis: number; abgeschlossen: number; gesamt: number };
    dauerMinuten: { median: number | null; mittel: number | null; n: number };      // gestartet_at → abgeschlossen_at, nur abgeschlossen
    fortschrittLaufend: { mittelProzent: number | null; n: number };                // Status laufend/ergebnis
    faktoren: { titel: string; mittel: number; n: number }[];                        // Ø Punkte je Faktor-Titel über abgeschlossene
    schwaechster: string | null; staerkster: string | null;
    diktatAnteil: number | null;   // Anteil Sitzungen (laufend+ergebnis+abgeschlossen) mit diktate > 0
    diktateGesamt: number;
  };
  ```
  Test-Sitzungen (`test = true`) werden ausgeschlossen. Faktor-Mittel über `punkteJeFaktor` je Sitzung, gruppiert nach `titel`.
- `GET /api/admin/statistik` → `Statistik` (lädt nur die benötigten Spalten).
- `components/admin/Uebersicht.tsx`: oben Knopf „Neue Einladung“ (öffnet `EinladungFormular` inline, nach Anlegen Link groß + „Link kopieren“ + „Einladung per Mail senden“); dann Kennzahl-Karten (Einladungen offen · In Arbeit · Fertig · Ø Dauer (Median, „h:mm“) · Sprachanteil); dann zwei Spalten: kleines `ErfolgsradSvg` mit den Faktor-Mitteln (groesse 360) und Balkenliste je Faktor mit Mittelwert, darunter Zeile „Schwächster Faktor: … · Stärkster: …“; darunter „Laufende Sitzungen: Ø Fortschritt x %“. Leere Zustände: „Noch keine abgeschlossenen Workbooks“ statt Nullen.

- [ ] **Step 1: Migration + Typen** einspielen (Management-API wie `supabase/README.md`), `lib/db.ts` um `gestartet_at: string | null; diktate: number` ergänzen, `sitzungStarten` setzt `gestartet_at: jetzt`, `transkribieren` erhöht `diktate` nach erfolgreicher Umwandlung (`update({ diktate: s.diktate + 1 })`, Fehler nur loggen).
- [ ] **Step 2: `lib/statistik.ts` + `scripts/check-statistik.mjs`** (TDD: drei synthetische Sitzungen — zwei abgeschlossen mit bekannten Punkten/Dauern 30 und 90 Minuten → Median 60, eine laufend mit 50 % Fortschritt, eine Test-Sitzung, die ignoriert wird; Faktor-Mittel und schwächster/stärkster prüfen). In `npm run check` aufnehmen.
- [ ] **Step 3: Route + Komponente + Admin-Startansicht.** Standard-Bereich `uebersicht`.
- [ ] **Step 4: Prüfung** in der Arbeitskopie (Dev-Server läuft auf 3000): `GET /api/admin/statistik` mit Cookie → Struktur; Admin im Browser: Übersicht ist Startansicht, „Neue Einladung“ funktioniert von dort; `npm run check`, `npx tsc --noEmit`, `npx next build`. Test-Sitzungen löschen.
- [ ] **Step 5: Commit** `feat: Admin-Übersicht mit Einladung und Nutzungs-Statistik`

---

### Task 2: Kunden-Kacheln und Finanzdaten-Upload

**Files:**
- Create: `supabase/migrations/005_finanzdaten.sql`, `lib/dateien.ts`, `app/api/w/[token]/dateien/route.ts` (GET Liste, POST Metadaten nach Upload), `app/api/w/[token]/dateien/upload-url/route.ts`, `app/api/w/[token]/dateien/melden/route.ts`, `app/api/admin/sitzungen/[id]/dateien/route.ts`, `components/KundenStart.tsx`, `components/FinanzdatenUpload.tsx`, `app/w/[token]/interview/page.tsx`
- Modify: `app/w/[token]/page.tsx` (wird Landeseite mit Kacheln), `components/EinladungStart.tsx` (auf `/w/[token]/interview` weiterleiten), `components/Interview.tsx` (Links auf `/w/[token]/interview`), `app/w/[token]/ergebnis/page.tsx` (bearbeiten-Links), `components/Ergebnis.tsx`, `components/admin/Sitzungen.tsx` (Dateien je Sitzung anzeigen + Download), `data/texte-seed.json` (`kacheln_titel`, `kachel_workbook`, `kachel_finanzdaten`, `upload_hinweis`), `scripts/check-seed.mjs`, `lib/mail.ts` (interne Mail „Neue Finanzdaten von <Firma>: n Dateien“), `docs/deployment.md`, `CLAUDE.md`

**Interfaces:**
- Migration:
  ```sql
  create table if not exists wb_dateien (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references wb_sessions(id) on delete cascade,
    dateiname text not null, pfad text not null unique, bytes bigint not null, content_type text not null,
    created_at timestamptz default now(), abgeholt_at timestamptz
  );
  create index if not exists wb_dateien_session on wb_dateien(session_id);
  alter table wb_dateien enable row level security;
  revoke all on wb_dateien from anon, authenticated;
  insert into storage.buckets (id, name, public, file_size_limit) values ('finanzdaten','finanzdaten',false, 52428800) on conflict (id) do nothing;
  ```
- `lib/dateien.ts`: `ERLAUBT: Record<string, string[]>` (Endung → erlaubte Content-Types), `dateinameSicher(name)`, `ordnerName(firma, sitzungId)` (Regel aus den Constraints), `uploadAdresse(s, dateiname, contentType, bytes) → { pfad, signedUrl, token }` via `db.storage.from('finanzdaten').createSignedUploadUrl(pfad)` mit `pfad = <session-id>/<zeitstempel>-<dateinameSicher>`; `dateiRegistrieren(s, {pfad, dateiname, bytes, content_type})` prüft, dass das Objekt existiert (`storage.list`) und die Grenze 30 Dateien; `dateienFuer(sitzungId)`.
- Routen (alle Token-geprüft, jeder Status außer `eingeladen` NICHT nötig — Upload ist in jedem Status erlaubt, auch `eingeladen` und `abgeschlossen`): `POST upload-url` Body `{dateiname, contentType, bytes}` → 400 bei Typ/Größe; `POST dateien` registriert; `GET dateien` → Liste `{dateiname, bytes, created_at}`; `POST melden` → eine interne Mail an `controlling@joerg-roos.com` mit Firmenname, Anzahl, Dateinamen (Bremse 5/h je Sitzung), keine Anhänge. Admin `GET sitzungen/[id]/dateien` → Liste mit signierten Download-Adressen (1 h).
- Browser-Upload: `fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': contentType, 'x-upsert': 'false' }, body: file })` — oder über `supabase-js` `uploadToSignedUrl` ist NICHT möglich (kein Client im Browser) → plain `fetch` PUT auf die signierte Adresse (Supabase akzeptiert PUT auf `signedUrl`; Header `Authorization` nicht nötig, Token steckt in der URL). Fortschritt je Datei per `XMLHttpRequest` (für `upload.onprogress`), dann `POST dateien`, am Ende `POST melden`.
- Landeseite `/w/[token]` (alle Status): Kopf wie bisher, Begrüßung „Hallo {vorname}“, zwei große Kacheln (`.card`, min-h 220 px, Icon 56 px, Titel 24 px, Untertext): **Workbook starten** (Text je Status: eingeladen „Interview starten“, laufend „Weitermachen · x %“, ergebnis „Zum Ergebnis“, abgeschlossen „Fertig – Workbook herunterladen“) → Ziel `/w/[token]/interview` bzw. `/ergebnis` bzw. `/fertig`; **Finanzdaten senden** (Untertext: „PDF, Excel, Word, Text oder PowerPoint – bis 50 MB je Datei“) → öffnet `FinanzdatenUpload` als Overlay: Dropzone + Dateiauswahl (`accept` mit den Endungen), Liste mit Fortschritt, bereits gesendete Dateien (aus `GET dateien`) darunter, Knopf „Fertig“ löst `melden` aus, wenn in dieser Sitzung etwas hochgeladen wurde. Hinweis-Text `upload_hinweis` (Datenschutz-Satz: verschlüsselt übertragen, nur Team JOERG ROOS).
- `/w/[token]/interview`: bisheriger Inhalt von `/w/[token]/page.tsx` (eingeladen → `EinladungStart`, laufend → `Interview`, abgeschlossen → redirect `fertig`). `EinladungStart` nach Start `router.refresh()` bleibt auf `/interview`.

- [ ] **Step 1: Migration + `lib/dateien.ts` + `scripts/check-dateien.mjs`** (reine Funktionen: Endungs-/Typ-Prüfung, `ordnerName` mit Umlauten/Sonderzeichen/leer, `dateinameSicher`). In `npm run check` aufnehmen.
- [ ] **Step 2: Routen** (Kunde + Admin) mit Bremsen (`upload:${s.id}` 60/h).
- [ ] **Step 3: Seiten** (Landeseite mit Kacheln, `/interview`, Links umstellen) und `FinanzdatenUpload`.
- [ ] **Step 4: Admin** — in `Sitzungen.tsx` je Zeile „Dateien (n)“ ausklappbar mit Download-Links und Abhol-Status (abgeholt ✓ / wartet).
- [ ] **Step 5: Prüfung**: curl-Kette upload-url → PUT einer 1-MB-Testdatei (PDF-Header) → `dateien` → `melden` (Mail scheitert lokal, 502 nur geloggt, Antwort trotzdem ok); verbotener Typ → 400; 51 MB → 400; Browser: Landeseite mit zwei Kacheln in jedem Status, Upload-Overlay mit Fortschritt, Admin-Liste zeigt Datei mit Download; alte Links `/w/<token>` → Kacheln, Interview unter `/interview`. `npm run check`, tsc, build. Test-Sitzungen + Storage-Objekte löschen.
- [ ] **Step 6: Commit** `feat: Kunden-Landeseite mit Kacheln, Finanzdaten-Upload in privaten Speicher`

---

### Task 3: Abholprogramm auf Jörgs Mac

**Files:**
- Create: `scripts/finanzdaten-abholen.mjs`, `scripts/abholer-installieren.sh`, `docs/abholer.md`
- Modify: `supabase/README.md` (Hinweis), `CLAUDE.md`, `docs/deployment.md`

**Interfaces:**
- `scripts/finanzdaten-abholen.mjs`: läuft mit `node --env-file=$HOME/.config/360ba-workbook/.env.local`; liest `wb_dateien where abgeholt_at is null` inkl. `wb_sessions(firma, id)`; Zielbasis aus `ABHOL_ZIEL` (Default `/Users/joergroos/_JRB-SERVER/03-FULLFILMENT/360 GRAD BUSINESSANALYSE/1-Uploads von Kunden`); je Datei: Ordner `ordnerName(firma, session_id)` anlegen, Download über `db.storage.from('finanzdaten').download(pfad)`, atomar schreiben (`.teil` → rename), bei Namenskonflikt Suffix `-2`, dann `abgeholt_at = now()`. Protokoll eine Zeile je Datei nach `~/Library/Logs/360ba-abholer.log`. Exit 0 auch ohne neue Dateien. Fehler je Datei loggen und weitermachen; Datei bleibt dann unabgeholt.
- Die Funktion `ordnerName` teilen sich Abholer und App: das Skript importiert sie aus `lib/dateien.ts` (Node kann .ts mit Typ-Stripping laden — daher `lib/dateien.ts` frei von nicht-erasable Syntax halten und ohne Import von `./db` in der Ordner-Funktion → `ordnerName` und `dateinameSicher` in eigene Datei `lib/dateinamen.ts` ohne Abhängigkeiten).
- `scripts/abholer-installieren.sh`: schreibt `~/Library/LaunchAgents/de.joerg-roos.360ba-abholer.plist` (StartInterval 600, `ProgramArguments`: absoluter Pfad zu `node` per `command -v node`, `--env-file=…`, Skriptpfad in der Arbeitskopie `/Users/joergroos/dev/360ba-workbook/scripts/finanzdaten-abholen.mjs`; StandardOut/Err → das Log), `launchctl bootout`/`bootstrap gui/$(id -u)`, druckt Status. `docs/abholer.md`: Klartext für Jörg — was es tut, wie man es installiert (ein Befehl), wie man prüft (`launchctl list | grep 360ba`, Log), wie man stoppt.

- [ ] **Step 1:** `lib/dateinamen.ts` herauslösen (Task 2 anpassen, Prüfskript umziehen), Abholer schreiben.
- [ ] **Step 2:** Lokal prüfen: Testdatei über die App hochladen, Abholer einmal von Hand laufen lassen → Datei liegt in `<Ziel>/<Firma>/`, `abgeholt_at` gesetzt, zweiter Lauf tut nichts. Test-Ordner danach löschen, Test-Sitzung löschen.
- [ ] **Step 3:** `abholer-installieren.sh` ausführen, `launchctl list` zeigt den Job, Log-Zeile nach dem ersten Lauf. In `docs/deployment.md` als Schritt aufnehmen. Hinweis: Der Abholer läuft nur, wenn Jörgs Mac an ist — Dateien warten sonst sicher im Speicher.
- [ ] **Step 4: Commit** `feat: Abholprogramm für Finanzdaten (launchd, alle 10 Minuten)`
