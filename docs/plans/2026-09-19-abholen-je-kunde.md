# Abholen je Kunde: ZIP-Download und „Auf meinen Mac abholen“ — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans.

**Goal:** Im Admin unter „Ausgefüllte Workbooks“ je Kunde zwei Aktionen: (1) alle hochgeladenen Dateien als ZIP in den Browser laden, (2) den Abholer auf Jörgs Mac für diesen Kunden anstoßen (Signal in der Datenbank, Mac prüft alle 5 Minuten).

**Architecture:** ZIP wird serverseitig als Store-ZIP (ohne Kompression, `zlib.crc32`) aus den Storage-Objekten gestreamt — keine neue Abhängigkeit. Signal = Spalte `wb_sessions.abholen_angefordert timestamptz`. Der Abholer bekommt einen Modus `--nur-angefordert`; ein zweiter launchd-Job ruft ihn alle 300 s auf. Der Vollmodus (08:00/14:00) bleibt und löscht das Signal ebenfalls.

**Tech Stack:** unverändert; `node:zlib` (`crc32`) und `node:stream`.

## Global Constraints
- Regeln aus `docs/plans/2026-09-18-online-workbook.md` gelten (deutsche Bezeichner, Admin-Routen mit `adminGeprueft`, DB nur serverseitig, keine neuen npm-Abhängigkeiten, Prüfskripte).
- ZIP nur für Admin, signierte Adressen nicht nötig (Server liest mit Service-Role und streamt).
- Der 5-Minuten-Job macht genau EINE Abfrage (`select id from wb_sessions where abholen_angefordert is not null`) und beendet sich ohne Treffer sofort.

---

### Task 1: ZIP-Download, Signal, Abholer-Modus, zweiter launchd-Job

**Files:**
- Create: `supabase/migrations/007_abholen_signal.sql`, `lib/zip.ts`, `scripts/check-zip.mjs`, `app/api/admin/sitzungen/[id]/dateien/zip/route.ts`, `app/api/admin/sitzungen/[id]/abholen/route.ts`
- Modify: `lib/db.ts` (Spalte), `scripts/finanzdaten-abholen.mjs` (Modus + Signal löschen), `scripts/abholer-installieren.sh` (zweiter Job `de.joerg-roos.360ba-abholer-sofort`, StartInterval 300, gleicher Log), `components/admin/Sitzungen.tsx` (zwei Knöpfe je Sitzung + Status „angefordert seit …“ + je Datei „abgeholt ✓ <Datum>“ / „wartet“), `app/api/admin/sitzungen/route.ts` (Liste liefert `abholen_angefordert`), `docs/abholer.md`, `CLAUDE.md`

**Interfaces:**
- Migration: `alter table wb_sessions add column if not exists abholen_angefordert timestamptz;`
- `lib/zip.ts`: `zipStoreStream(eintraege: { name: string; daten: () => Promise<Uint8Array> }[]): ReadableStream<Uint8Array>` — ZIP ohne Kompression (Methode 0), lokaler Header + zentraler Ordner + End-Record, CRC32 über `zlib.crc32`, UTF-8-Namen (Flag Bit 11), Größen < 4 GB (kein ZIP64). Reine Funktion, erasable TS, mit `scripts/check-zip.mjs`: erzeugtes ZIP mit zwei Einträgen hat korrekte Signaturen (`PK\x03\x04`, `PK\x01\x02`, `PK\x05\x06`), Eintragszahl 2, CRC des ersten Eintrags = `zlib.crc32(daten)`; zusätzlich mit `unzip -l` (macOS) prüfen, dass die Datei lesbar ist.
- `GET /api/admin/sitzungen/[id]/dateien/zip`: lädt `wb_dateien` der Sitzung, streamt jedes Objekt aus `finanzdaten` via `storage.download(pfad)`; Antwort `Content-Type: application/zip`, `Content-Disposition: attachment; filename="Finanzdaten-<ordnerName>.zip"`; leer → 404 „Keine Dateien“.
- `POST /api/admin/sitzungen/[id]/abholen` → setzt `abholen_angefordert = now()` → `{ ok: true, angefordert: <iso> }`.
- Abholer: `--nur-angefordert` → nur Dateien von Sitzungen mit gesetztem Signal (unabgeholte), danach Signal auf `null`. Vollmodus wie bisher, setzt Signal ebenfalls auf `null` für alle bearbeiteten Sitzungen. Log-Zeile `Modus: voll|angefordert · n Dateien`.
- Installer: zweiter Plist `de.joerg-roos.360ba-abholer-sofort` (StartInterval 300, RunAtLoad false, ProgramArguments mit `--nur-angefordert`, gleicher Log). Idempotent für beide Jobs.
- UI: Knopf „Alle herunterladen (ZIP)“ (Link auf die Route, `download`), Knopf „Auf meinen Mac abholen“ (POST, danach Text „angefordert · HH:MM“ bis alle Dateien abgeholt sind), je Datei rechts „abgeholt ✓ TT.MM. HH:MM“ oder „wartet“.

- [ ] Step 1: Migration + `lib/db.ts` + `lib/zip.ts` + `check-zip.mjs` (TDD, in `npm run check`).
- [ ] Step 2: Routen + Sitzungsliste.
- [ ] Step 3: Abholer-Modus + Installer + Doku; Installer ausführen, `launchctl list | grep 360ba` zeigt zwei Jobs.
- [ ] Step 4: Prüfung: Testsitzung mit zwei Dateien → ZIP per curl laden → `unzip -l` zeigt beide; „Abholen“ per curl → `abholen_angefordert` gesetzt → `node … --nur-angefordert` holt beide, Signal null, Dateien im Ziel; zweiter Lauf „nichts zu tun“ in < 2 s. Browser: Knöpfe und Status je Datei. `npm run check`, tsc, build. Aufräumen (Sitzung, Storage, Zielordner).
- [ ] Step 5: Commit `feat: ZIP-Download und „Auf meinen Mac abholen“ je Kunde, Abholer-Signal alle 5 Minuten`
