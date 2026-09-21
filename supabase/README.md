# Supabase

Projekt: `zzmomqmegzjibnqrmzyo` (JOERG AI Produktion, shared — nur `wb_*`-Tabellen und die Buckets `workbooks` und `finanzdaten` anfassen).

## Migrationen

- `001_workbook.sql` — Schema (`wb_*`-Tabellen, Bucket `workbooks`)
- `002_rls.sql` — Row Level Security auf allen `wb_*`-Tabellen, `anon`/`authenticated` gesperrt
- `003_einladung.sql` — Status `eingeladen` in `wb_sessions.status` erlaubt
- `004_statistik.sql` — `wb_sessions.gestartet_at` (Start des Interviews) und `wb_sessions.diktate` (Zähler erfolgreicher Spracheingaben) für die Admin-Übersicht
- `005_finanzdaten.sql` — Tabelle `wb_dateien` (Metadaten je hochgeladener Datei) und der private Bucket `finanzdaten` (Finanzdaten-Upload der Kunden, 50 MB je Datei, nur die neun erlaubten Dateitypen aus `lib/dateinamen.ts`)
- `006_abholer.sql` — `wb_dateien.lokaler_name`: bindet jede Zeile fest an den vom Abholer tatsächlich vergebenen lokalen Dateinamen (siehe unten)
- `007_abholen_signal.sql` — `wb_sessions.abholen_angefordert`: Signal für den Knopf „Auf meinen Mac abholen" je Sitzung (siehe `docs/abholer.md`)
- `008_termin_erinnerungen.sql` — `wb_sessions.termin_am` und die drei Zeitstempel der Erinnerungsmails
- `009_management_summary.sql` — `wb_sessions.management_summary_path` und der Bucket `management-summaries`
- `010_checkliste.sql` — `wb_sessions.checkliste`: welche Finanzunterlagen der Kunde selbst abgehakt hat (Kennungen aus `lib/checkliste.ts`)

Hinweis: `wb_dateien.abgeholt_at` und `wb_dateien.lokaler_name` werden nicht von der App
gesetzt, sondern vom Abholprogramm auf Jörgs Mac (`scripts/finanzdaten-abholen.mjs`, siehe
`docs/abholer.md`) — es lädt jede Datei mit `abgeholt_at is null` herunter, bindet die Zeile
dabei fest an ihren lokalen Dateinamen (`lokaler_name`, wichtig bei zwei Uploads mit
gleichem Namen und gleicher Größe) und setzt `abgeholt_at` danach.

## Migration einspielen

Wie bei JOERG AI über die Management-API, kein CLI-Login nötig:

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/zzmomqmegzjibnqrmzyo/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
  --data "$(python3 -c 'import json,sys;print(json.dumps({"query":open("supabase/migrations/001_workbook.sql").read()}))')"
```

(Für `002_rls.sql` denselben Aufruf mit dem anderen Dateinamen wiederholen.)

`SUPABASE_ACCESS_TOKEN` steht in `~/.config/360ba-workbook/.env.local`. Erwartete Antwort: `[]` ohne Fehler.

Schlägt allein das `insert into storage.buckets` fehl (Rechte-Problem über den SQL-Endpunkt), Bucket stattdessen per Node anlegen:

```js
db.storage.createBucket('workbooks', { public: false })
```

## Seed

```bash
node --env-file=.env.local scripts/seed.mjs
node scripts/check-seed.mjs
```

`seed.mjs` ist wiederholbar — legt nur an, was laut Titel/Fragetext noch fehlt.
