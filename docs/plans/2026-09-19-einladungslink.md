# Einladungslink statt offener Startseite — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Das Workbook ist nur über einen von Jörg erzeugten Einladungslink erreichbar. Die öffentliche Startseite mit Kontaktformular entfällt.

**Architecture:** Eine Einladung IST eine vorangelegte Sitzung mit Status `eingeladen` (Kontaktdaten von Jörg eingetragen). Der Kunde öffnet `/w/<token>`, bestätigt seine Daten, die Sitzung wird `laufend`, der Snapshot wird in diesem Moment frisch gezogen. `/` zeigt eine neutrale Seite ohne Formular. Kein neuer Dienst, eine Migration.

**Tech Stack:** unverändert (Next.js 16, Supabase, Resend).

## Global Constraints

- Alle Regeln aus `docs/plans/2026-09-18-online-workbook.md` (Global Constraints) gelten weiter: deutsche Bezeichner, Du-Form, keine verbotenen Wörter, DB nur serverseitig, keine neuen npm-Abhängigkeiten, Arbeitskopie-Regel, Prüfskripte `scripts/check-*.mjs`.
- Token bleibt der einzige Schlüssel (32 Byte, base64url). Kein zusätzliches Passwort.
- Status-Kette: `eingeladen → laufend → ergebnis → abgeschlossen`.
- Look wie bisher (`docs/mockup/index.html#start` für den Bestätigungs-Bildschirm, dunkel, ein Akzent).

---

### Task 1: Einladungslink

**Files:**
- Create: `supabase/migrations/003_einladung.sql`, `components/EinladungStart.tsx`, `components/admin/EinladungFormular.tsx`, `app/api/w/[token]/start/route.ts`, `public/robots.txt`
- Modify: `lib/db.ts` (Status-Typ), `lib/sitzung.ts`, `app/page.tsx`, `app/layout.tsx` (robots), `app/w/[token]/page.tsx`, `app/w/[token]/ergebnis/page.tsx`, `app/w/[token]/fertig/page.tsx`, `app/api/w/[token]/route.ts`, `app/api/w/[token]/antwort/route.ts`, `app/api/w/[token]/link/route.ts`, `app/api/transkribieren/route.ts`, `app/api/admin/sitzungen/route.ts`, `components/admin/Sitzungen.tsx`, `app/admin/page.tsx`, `data/texte-seed.json`, `scripts/seed.mjs` (Texte nachziehen läuft bereits: legt fehlende Keys an), `scripts/check-seed.mjs`, `components/admin/Texte.tsx` (Label), `docs/deployment.md`, `CLAUDE.md`
- Delete: `components/StartFormular.tsx`, `app/api/start/route.ts`

**Interfaces:**
- `einladungAnlegen(k: Kontakt, test = false): Promise<Sitzung>` — legt Sitzung mit `status: 'eingeladen'` an (Snapshot wird trotzdem gezogen, Spalte ist NOT NULL).
- `sitzungStarten(token: string, k: Kontakt): Promise<Sitzung>` — nur bei `eingeladen`: Kontakt übernehmen, Snapshot neu ziehen, `status: 'laufend'`, `aktuelle_frage: 0`.
- `POST /api/w/[token]/start` Body `Kontakt` → `{ ok: true }`; 409 wenn Status nicht `eingeladen`; Validierung wie bisher in `/api/start` (Pflichtfelder, E-Mail-Format, Whitespace-Normalisierung); danach Link-Mail (Fehler nur loggen).
- `POST /api/admin/sitzungen` Body `Kontakt & { test?: boolean }` → `{ id, link }` (ersetzt den bisherigen Test-Sitzungs-Body; `test: true` weiterhin ohne interne Mail).
- Texte: neuer Key `zugang_text` („Dieses Workbook ist für eingeladene Kunden der 360° Business-Analyse. Den persönlichen Link hast du per E-Mail von uns bekommen. Fragen? office@joerg-roos.com“) und `einladung_titel` („Schön, dass du dabei bist, {vorname}“), `einladung_text` („Prüf kurz deine Daten und starte dann dein Workbook. Dein Link bleibt gültig – du kannst jederzeit pausieren und hier weitermachen.“).

- [ ] **Step 1: Migration**

`supabase/migrations/003_einladung.sql`:
```sql
alter table wb_sessions drop constraint if exists wb_sessions_status_check;
alter table wb_sessions add constraint wb_sessions_status_check check (status in ('eingeladen','laufend','ergebnis','abgeschlossen'));
```
Einspielen über die Management-API wie in `supabase/README.md`; README-Liste ergänzen. `lib/db.ts`: Status-Typ um `'eingeladen'` erweitern.

- [ ] **Step 2: lib/sitzung.ts**

`einladungAnlegen` (wie `sitzungAnlegen`, aber `status: 'eingeladen'`); `sitzungStarten` wie oben; `antwortSpeichern` wirft bei `eingeladen` („Sitzung noch nicht gestartet“). `sitzungAnlegen` bleibt für Tests erhalten oder wird durch `einladungAnlegen` ersetzt — nur eine Funktion behalten, Aufrufer anpassen.

- [ ] **Step 3: Routen**

- `app/api/w/[token]/start/route.ts` neu (siehe Interfaces; Bremse `start:${s.id}` 5/h).
- `app/api/w/[token]/route.ts`: liefert `status`, `vorname, nachname, firma, telefon, email` (für die Vorbelegung) — nur diese Kontaktfelder, kein Token.
- `link`, `transkribieren`, `antwort`: bei `eingeladen` → 409 „Bitte zuerst das Interview starten“.
- `app/api/start/route.ts` löschen. `app/api/admin/sitzungen/route.ts` POST nimmt `Kontakt & {test?}` und nutzt `einladungAnlegen`; Antwort `{ id, link }`; Validierung wie im Kunden-Start.

- [ ] **Step 4: Seiten**

- `app/page.tsx`: neutrale Seite (Logo, Eyebrow „360° Business-Analyse“, Titel „Dein Workbook“, `zugang_text`), kein Formular. `dynamic = 'force-dynamic'` bleibt.
- `app/layout.tsx`: `metadata.robots = { index: false, follow: false }`; `public/robots.txt`: `User-agent: *` / `Disallow: /`.
- `app/w/[token]/page.tsx`: `eingeladen` → `<EinladungStart token kontakt texte />`; sonst wie bisher. `ergebnis`/`fertig`: `eingeladen` → redirect `/w/[token]`.
- `components/EinladungStart.tsx` (`'use client'`): Aufbau wie das frühere Startformular (Mockup `#start`), Überschrift `einladung_titel` mit `{vorname}`, Text `einladung_text`, vorausgefüllte Felder, Datenschutz-Satz, Knopf „Interview starten →“ → `POST /api/w/[token]/start` → `router.refresh()`.

- [ ] **Step 5: Admin**

- `components/admin/EinladungFormular.tsx`: Felder Vorname, Nachname, Firma, E-Mail, Telefon; Knopf „Einladung anlegen“ → `POST /api/admin/sitzungen` → zeigt den Link groß mit Knopf „Link kopieren“ (`navigator.clipboard.writeText`) und „Einladung per Mail senden“ (`POST sitzungen/[id]/link`, Fehler anzeigen, RESEND fehlt lokal).
- `components/admin/Sitzungen.tsx`: oben Knopf „Neue Einladung“ (öffnet das Formular in der rechten Spalte oder inline), Status-Badge „Eingeladen“ (grau), Aktion „Link kopieren“ für alle nicht abgeschlossenen, „Zurückziehen“ = bestehendes Löschen mit Rückfrage „Einladung zurückziehen? Der Link wird sofort ungültig.“ „Vorschau als Kunde“ nutzt weiter `test: true` mit Jörgs Daten.
- `components/admin/Texte.tsx`: Labels für `zugang_text`, `einladung_titel`, `einladung_text`; die drei `start_*`-Keys behalten (werden nicht mehr angezeigt — Label „(nicht mehr verwendet)“) oder aus der Anzeige nehmen.

- [ ] **Step 6: Texte, Prüfung, Doku**

- `data/texte-seed.json` um die drei Keys ergänzen; `node --env-file=.env.local scripts/seed.mjs` legt sie an (nur fehlende). `scripts/check-seed.mjs`: Pflicht-Keys ergänzen.
- Prüfung in der Arbeitskopie (Dev-Server läuft bereits auf 3000, nicht neu starten): Admin-Einladung per curl anlegen → Link; `GET /w/<token>` zeigt Bestätigung (Browser-Werkzeuge); `POST start` mit leerem Namen → 400, mit gültigen Daten → 200, danach Interview sichtbar; zweiter `POST start` → 409; `PUT antwort` vor Start → 409; `/` zeigt neutrale Seite; `/api/start` → 404; `robots.txt` erreichbar; Admin: Liste zeigt „Eingeladen“, „Zurückziehen“ löscht. `npm run check`, `npx tsc --noEmit`, `npx next build` sauber. Test-Sitzungen löschen.
- `docs/deployment.md`: Ablauf „Einladung anlegen → Link in die Mail nach Zahlungseingang“ ergänzen; `CLAUDE.md`: Status-Kette, Einladungs-Prinzip, keine öffentliche Startseite.

- [ ] **Step 7: Commit**

`feat: Einladungslink — Sitzungen entstehen im Admin, Startseite ohne Formular, Suchmaschinen ausgeschlossen`
