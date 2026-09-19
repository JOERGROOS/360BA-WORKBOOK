# Supabase

Projekt: `zzmomqmegzjibnqrmzyo` (JOERG AI Produktion, shared — nur `wb_*`-Tabellen und den `workbooks`-Bucket anfassen).

## Migrationen

- `001_workbook.sql` — Schema (`wb_*`-Tabellen, Bucket `workbooks`)
- `002_rls.sql` — Row Level Security auf allen `wb_*`-Tabellen, `anon`/`authenticated` gesperrt
- `003_einladung.sql` — Status `eingeladen` in `wb_sessions.status` erlaubt
- `004_statistik.sql` — `wb_sessions.gestartet_at` (Start des Interviews) und `wb_sessions.diktate` (Zähler erfolgreicher Spracheingaben) für die Admin-Übersicht

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
