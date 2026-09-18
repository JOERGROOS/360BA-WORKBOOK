# 360° Business-Analyse · Online-Workbook — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das Word-Workbook der 360° Business-Analyse wird eine Next.js-App: Interview Frage für Frage (getippt oder gesprochen), Erfolgsrad, PDF per Mail an Kunde und controlling@joerg-roos.com, Admin für Fragen und Texte.

**Architecture:** Eine Next.js-App (App Router) auf Vercel. Der Browser spricht nur mit den API-Routen der App; die App spricht mit Supabase (Service-Role-Key, Tabellen mit Präfix `wb_`, privater Storage-Bucket `workbooks`), OpenAI (Transkription), Anthropic (Glättung) und Resend (Mail). Eine Sitzung friert beim Start die aktiven Fragen als Snapshot ein; das Interview arbeitet nur auf dem Snapshot. Erfolgsrad-Geometrie ist eine reine Funktion, die Web-SVG und PDF-SVG gemeinsam nutzen.

**Tech Stack:** Next.js 16 (App Router, React 19, TypeScript, Tailwind 3) · `@supabase/supabase-js` · `resend` · `openai` · `@anthropic-ai/sdk` · `@react-pdf/renderer` · Node 26.

Spec: `docs/specs/2026-09-18-online-workbook-design.md`. Mockups: `docs/mockup/index.html` (Look, Abstände, Farben — beim Bau der Kundenseite 1:1 als Vorlage nehmen).

## Global Constraints

- Sprache im Code: deutsche Bezeichner und Kommentare wie in JOERG AI (`kundeAusAnfrage`, `sitzungAnlegen`). Englische Framework-Begriffe bleiben (`route.ts`, `page.tsx`).
- Kundenseite dunkel: CSS-Variablen `--o:#ED7A02 --od:#9F3C07 --blue:#0F1B23 --ink:#0A1118 --paper:#EEEEEE --surf:#16212A --line:#2A353D --muted:#AFB3B5`, Schrift Montserrat (Google Fonts), Radius 12px, genau EIN Akzent Orange. Vorlage `docs/mockup/index.html`.
- PDF hell: Weiß/Paper, Text `#0F1B23`, Akzent `#ED7A02`, Montserrat eingebettet, JR-Logo (schwarz) Proportion **7,87 : 1** (Höhe = Breite ÷ 7,87), Fußzeile „Copyright © 2026 · Jörg Roos“.
- Texte zum Kunden: Du-Form, Jörg-Stimme, keine verbotenen Wörter (vielleicht, könnte, man sollte, häufig, gefühlt, eventuell, ganzheitlich, garantiert). Begriff „verpflichtende Kosten“, nie „Fixkosten“.
- Keine weiteren npm-Abhängigkeiten als die im Tech Stack. Kein Drag-and-drop, keine UI-Bibliothek, kein Formular-Framework.
- Keine Sprachaufnahme wird gespeichert. Nur geglätteter Text.
- Datenbankzugriff nur serverseitig (`lib/db.ts`). Nie Supabase-Client im Browser.
- Änderungen am Fragebogen wirken nur auf neue Sitzungen (Snapshot in `wb_sessions.fragen_snapshot`).
- Bauen und Dev-Server **nicht** auf dem Synology-Laufwerk (Turbopack bricht ab). Arbeitskopie: `/Users/joergroos/dev/360ba-workbook`, angeglichen per `scripts/sync-lokal.sh`. Git-Commits im Laufwerksordner `04-360BA-Workbook`.
- Umgebungsvariablen: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `ADMIN_PASSWORD`, `APP_URL`. Datei `.env.local` ist Symlink auf `~/.config/360ba-workbook/.env.local`.
- Modelle: Transkription `gpt-4o-mini-transcribe` · Glättung `claude-haiku-4-5-20251001`.
- Prüfskripte ohne Testrahmen unter `scripts/check-*.mjs`, laufen mit `node`. Jedes Skript endet mit `console.log('ok')` oder wirft.

---

## Dateistruktur

```
04-360BA-Workbook/
  package.json · next.config.ts · tailwind.config.ts · postcss.config.js · tsconfig.json
  .env.example · .gitignore · CLAUDE.md · .claude/launch.json
  app/
    layout.tsx · globals.css
    page.tsx                         Start (Kontaktdaten, Interview starten)
    w/[token]/page.tsx               Interview
    w/[token]/ergebnis/page.tsx      Erfolgsrad, Antworten, Aha, Speichern
    w/[token]/fertig/page.tsx        Bestätigung + Download
    admin/page.tsx                   Login + Admin-Oberfläche (Client)
    api/start/route.ts
    api/w/[token]/route.ts           GET Sitzung
    api/w/[token]/antwort/route.ts   PUT Antwort
    api/w/[token]/link/route.ts      POST Link erneut
    api/w/[token]/abschluss/route.ts POST Abschluss
    api/w/[token]/pdf/route.ts       GET signierte Adresse
    api/transkribieren/route.ts      POST Audio → Text
    api/admin/login/route.ts · logout/route.ts
    api/admin/kapitel/route.ts · kapitel/[id]/route.ts
    api/admin/fragen/route.ts · fragen/[id]/route.ts
    api/admin/texte/route.ts
    api/admin/sitzungen/route.ts · sitzungen/[id]/route.ts · sitzungen/[id]/pdf/route.ts · sitzungen/[id]/link/route.ts
  components/
    Fortschritt.tsx · FrageText.tsx · FrageSkala.tsx · FrageTabelle.tsx · Mikro.tsx · ErfolgsradSvg.tsx
    admin/Fragebogen.tsx · admin/Texte.tsx · admin/Sitzungen.tsx
  lib/
    db.ts            Supabase-Client + Typen
    sitzung.ts       Token, Snapshot, Laden, Antwort speichern, Fortschritt
    punkte.ts        Punkte je Faktor
    erfolgsrad-geometrie.ts   Segment-Pfade (rein)
    texte.ts         wb_texte lesen mit Fallback auf data/texte-seed.json, Platzhalter
    mail.ts          Resend
    stt.ts           OpenAI-Transkription
    glaettung.ts     Claude-Glättung
    admin-auth.ts    Passwort, Cookie, Bremse
    bremse.ts        einfache Aufruf-Bremse je IP
    pdf/Workbook.tsx pdf/ErfolgsradPdf.tsx pdf/render.ts
  data/fragen-seed.json · data/texte-seed.json   (liegen bereits vor)
  supabase/migrations/001_workbook.sql
  scripts/seed.mjs · sync-lokal.sh · check-seed.mjs · check-punkte.mjs · check-geometrie.mjs · check-pdf.mjs · check-glaettung.mjs
  public/logo-full.png · logo-full-white.svg · fonts/Montserrat-{Regular,Medium,SemiBold,Light}.ttf · joerg.jpg
  docs/ (Spec, Plan, Mockup)
```

---

### Task 1: Gerüst, Repo, lokale Arbeitskopie

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `tsconfig.json`, `.gitignore`, `.env.example`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (Platzhalter), `CLAUDE.md`, `.claude/launch.json`, `scripts/sync-lokal.sh`
- Copy: CI-Assets nach `public/`

**Interfaces:**
- Produces: lauffähige Next-App, `npm run dev` in der Arbeitskopie, `scripts/sync-lokal.sh` als Standard-Weg.

- [ ] **Step 1: Ordner und Git**

```bash
cd "/Users/joergroos/Library/CloudStorage/SynologyDrive-AI-BUSINSESS-OS/04-360BA-Workbook"
git init -b main
```

- [ ] **Step 2: package.json**

```json
{
  "name": "360ba-workbook",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "seed": "node scripts/seed.mjs",
    "check": "node scripts/check-seed.mjs && node scripts/check-punkte.mjs && node scripts/check-geometrie.mjs"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.60.0",
    "@react-pdf/renderer": "^4.3.0",
    "@supabase/supabase-js": "^2.108.1",
    "next": "^16.3.5",
    "openai": "^5.20.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "resend": "^6.10.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "tailwindcss": "^3.3.0",
    "typescript": "^5"
  }
}
```

Versionen von `@anthropic-ai/sdk`, `openai`, `@react-pdf/renderer` beim `npm install` auf die aktuell neueste stabile setzen (`npm view <paket> version`), Rest wie JOERG AI.

- [ ] **Step 3: Konfiguration**

`next.config.ts`:
```ts
import type { NextConfig } from 'next';
const config: NextConfig = {
  // react-pdf liest Schriften und Bilder aus public/ zur Laufzeit — Vercel muss sie mitnehmen.
  outputFileTracingIncludes: { '/api/**': ['./public/fonts/**', './public/*.png', './public/*.jpg'] },
  serverExternalPackages: ['@react-pdf/renderer'],
};
export default config;
```

`tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: { colors: { o: '#ED7A02', od: '#9F3C07', blue: '#0F1B23', ink: '#0A1118', paper: '#EEEEEE', surf: '#16212A', line: '#2A353D', muted: '#AFB3B5' },
    fontFamily: { sans: ['Montserrat', 'Arial', 'sans-serif'] }, borderRadius: { jr: '12px' } } },
  plugins: [],
} satisfies Config;
```

`postcss.config.js`: `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };`

`tsconfig.json`: wie JOERG AI (`_JOERG AI-APP/joerg-ai-dev/tsconfig.json` kopieren, Pfad-Alias `@/*` → `./*`).

`.gitignore`: `node_modules`, `.next`, `.env.local`, `.env*.local`, `tsconfig.tsbuildinfo`, `docs/beispiel/*.pdf`, `.DS_Store`.

`.env.example`:
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
ADMIN_PASSWORD=
APP_URL=http://localhost:3000
```

- [ ] **Step 4: Layout und globale Styles**

`app/globals.css`:
```css
@tailwind base; @tailwind components; @tailwind utilities;
:root{--o:#ED7A02;--od:#9F3C07;--blue:#0F1B23;--ink:#0A1118;--paper:#EEEEEE;--surf:#16212A;--line:#2A353D;--muted:#AFB3B5}
body{background:var(--ink);color:#fff;font-family:'Montserrat',Arial,sans-serif;-webkit-font-smoothing:antialiased}
.bg{position:fixed;inset:0;z-index:-1;background:
 radial-gradient(1200px 700px at 78% -10%,rgba(237,122,2,.28),rgba(159,60,7,.12) 35%,rgba(15,27,35,0) 70%),
 radial-gradient(900px 600px at 10% 110%,rgba(61,77,92,.35),rgba(10,17,24,0) 60%),
 linear-gradient(180deg,#0F1B23 0%,#0A1118 100%)}
.card{background:var(--surf);border:1px solid var(--line);border-radius:20px;padding:32px}
.btn{display:inline-flex;align-items:center;gap:10px;background:var(--o);color:#fff;border:0;border-radius:12px;padding:16px 28px;font-weight:600;font-size:16px;cursor:pointer}
.btn:disabled{opacity:.5;cursor:default}
.btn-ghost{background:transparent;border:1px solid var(--line);color:var(--muted)}
.eyebrow{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--o);font-weight:600}
label{display:block;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;font-weight:500}
input,textarea,select{width:100%;background:#0F1B23;border:1px solid var(--line);border-radius:12px;color:#fff;font:inherit;font-size:16px;padding:14px 16px;outline:none}
input:focus,textarea:focus{border-color:var(--o)}
.fine{font-size:13.5px;color:var(--muted);line-height:1.5}
```

`app/layout.tsx`:
```tsx
import './globals.css';
export const metadata = { title: '360° Business-Analyse · Workbook', description: 'Dein Workbook zur 360° Business-Analyse von JOERG ROOS.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet" /></head>
      <body><div className="bg" />{children}</body>
    </html>
  );
}
```

`app/page.tsx` vorläufig: `export default function Start(){ return <main className="p-12">Workbook</main>; }`

- [ ] **Step 5: CI-Assets kopieren**

```bash
A="/Users/joergroos/Library/CloudStorage/SynologyDrive-AI-BUSINSESS-OS/01-CoWork/01-ATLAS/Ressourcen/CI-Asssets"
mkdir -p public/fonts
cp "$A/JOERGROOS-Logo-Full.png" public/logo-full.png
cp "$A/JOERGROOS-Logo-Full-white-gradiant.svg" public/logo-full-white.svg
for s in Regular Medium SemiBold Light; do cp "$A/Montserrat/Montserrat-$s.ttf" public/fonts/; done
# Foto Jörg aus dem Word-Workbook (image8.jpeg, 609×914) → public/joerg.jpg
cd /tmp && unzip -o -q "/Users/joergroos/_JRB-SERVER/03-FULLFILMENT/unsere P R O D U K T E/4-360 GRAD BUSINESS ANALYSE/2-WORKBOOK/2026-360BA-Workbook.docx" word/media/image8.jpeg -d wbimg && cp wbimg/word/media/image8.jpeg "<Projekt>/public/joerg.jpg"
```
Prüfen: `ls public/fonts` zeigt vier TTF. Wenn Montserrat-Dateinamen im Ordner anders lauten (`ls "$A/Montserrat"`), passende Schnitte wählen.

- [ ] **Step 6: Arbeitskopie und Dev-Server**

`scripts/sync-lokal.sh`:
```bash
#!/bin/zsh
# Gleicht den Laufwerksordner in die lokale Arbeitskopie ab. Bauen läuft nur dort.
set -e
Q="/Users/joergroos/Library/CloudStorage/SynologyDrive-AI-BUSINSESS-OS/04-360BA-Workbook/"
Z="/Users/joergroos/dev/360ba-workbook/"
mkdir -p "$Z"
rsync -a --delete --exclude node_modules --exclude .next --exclude .git --exclude .env.local "$Q" "$Z"
[ -L "$Z.env.local" ] || ln -s "$HOME/.config/360ba-workbook/.env.local" "$Z.env.local"
cd "$Z" && [ -d node_modules ] || npm install
echo "sync ok → $Z"
```
`chmod +x scripts/sync-lokal.sh`. `mkdir -p ~/.config/360ba-workbook && cp .env.example ~/.config/360ba-workbook/.env.local` (Werte trägt Jörg ein; `SUPABASE_*`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY` können aus `~/.config/joerg-ai/joerg-ai-dev.env.local` übernommen werden — ADMIN_PASSWORD **nicht**, eigenes setzen).

`.claude/launch.json`:
```json
{ "version": "0.0.1", "configurations": [
  { "name": "workbook-lokal", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev", "--prefix", "/Users/joergroos/dev/360ba-workbook"], "port": 3000 } ] }
```

- [ ] **Step 7: Bauen prüfen**

Run: `./scripts/sync-lokal.sh && cd ~/dev/360ba-workbook && npx next build`
Expected: Build ohne Fehler.

- [ ] **Step 8: CLAUDE.md des Projekts**

Kurz (30 Zeilen): Was die App ist, Stack, Arbeitskopie-Regel, Umgebungsvariablen, Verweis auf Spec und Plan, Prüfskripte, Datenbanktabellen `wb_*`, „Änderungen am Fragebogen wirken nur auf neue Sitzungen“.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: Gerüst Next.js, CI-Assets, Arbeitskopie-Skript"
```
GitHub-Repo `JOERGROOS/360BA-WORKBOOK` (privat) legt Jörg an, dann `git remote add origin https://github.com/JOERGROOS/360BA-WORKBOOK.git && git push -u origin main`. Bis dahin lokal committen.

---

### Task 2: Datenbank, Typen, Seed

**Files:**
- Create: `supabase/migrations/001_workbook.sql`, `lib/db.ts`, `scripts/seed.mjs`, `scripts/check-seed.mjs`, `supabase/README.md`

**Interfaces:**
- Produces: `db` (Supabase-Client), Typen `Kapitel`, `Frage`, `FrageTyp`, `Snapshot`, `SnapshotKapitel`, `SnapshotFrage`, `Sitzung`, `Antworten`, `TabellenWert`.

- [ ] **Step 1: Migration**

`supabase/migrations/001_workbook.sql`:
```sql
create table if not exists wb_chapters (
  id uuid primary key default gen_random_uuid(),
  position int not null,
  titel text not null,
  untertitel text default '',
  einleitung text default '',
  typ text not null check (typ in ('fakten','faktor')),
  aktiv boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists wb_questions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references wb_chapters(id) on delete restrict,
  position int not null,
  text text not null,
  hinweis text default '',
  typ text not null check (typ in ('text','skala','tabelle')),
  optionen jsonb default '{}'::jsonb,
  aktiv boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists wb_questions_chapter on wb_questions(chapter_id, position);
create table if not exists wb_texte (
  key text primary key,
  wert text not null,
  updated_at timestamptz default now()
);
create table if not exists wb_sessions (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  vorname text not null, nachname text not null, firma text not null,
  telefon text default '', email text not null,
  status text not null default 'laufend' check (status in ('laufend','ergebnis','abgeschlossen')),
  test boolean not null default false,
  fragen_snapshot jsonb not null,
  antworten jsonb not null default '{}'::jsonb,
  aha text default '',
  aktuelle_frage int not null default 0,
  pdf_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  abgeschlossen_at timestamptz
);
create index if not exists wb_sessions_token on wb_sessions(token);
insert into storage.buckets (id, name, public) values ('workbooks','workbooks',false) on conflict (id) do nothing;
```

Einspielen wie bei JOERG AI über die Management-API (`supabase/README.md` dokumentiert das):
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/zzmomqmegzjibnqrmzyo/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
  --data "$(python3 -c 'import json,sys;print(json.dumps({"query":open("supabase/migrations/001_workbook.sql").read()}))')"
```
`SUPABASE_ACCESS_TOKEN` steht in `~/.config/joerg-ai/joerg-ai-dev.env.local`. Expected: `[]` ohne Fehler.

- [ ] **Step 2: lib/db.ts**

```ts
import { createClient } from '@supabase/supabase-js';

export type FrageTyp = 'text' | 'skala' | 'tabelle';
export type KapitelTyp = 'fakten' | 'faktor';
export type TabellenOptionen = { zeilen: string[]; spalten: string[] };

export type Kapitel = { id: string; position: number; titel: string; untertitel: string; einleitung: string; typ: KapitelTyp; aktiv: boolean };
export type Frage = { id: string; chapter_id: string; position: number; text: string; hinweis: string; typ: FrageTyp; optionen: Partial<TabellenOptionen>; aktiv: boolean };

export type SnapshotFrage = { id: string; typ: FrageTyp; text: string; hinweis: string; optionen?: TabellenOptionen };
export type SnapshotKapitel = { id: string; titel: string; untertitel: string; typ: KapitelTyp; einleitung: string; fragen: SnapshotFrage[] };
export type Snapshot = { kapitel: SnapshotKapitel[]; erstellt: string };

export type TabellenWert = Record<string, Record<string, string>>; // zeile → spalte → Wert
export type Antwort = string | number | TabellenWert;
export type Antworten = Record<string, Antwort>;

export type Sitzung = {
  id: string; token: string; vorname: string; nachname: string; firma: string; telefon: string; email: string;
  status: 'laufend' | 'ergebnis' | 'abgeschlossen'; test: boolean;
  fragen_snapshot: Snapshot; antworten: Antworten; aha: string; aktuelle_frage: number;
  pdf_path: string | null; created_at: string; updated_at: string; abgeschlossen_at: string | null;
};

function pflicht(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Umgebungsvariable ${name} fehlt`);
  return v;
}

// Nur serverseitig verwenden. Der Service-Role-Key darf nie in den Browser.
export const db = createClient(pflicht('SUPABASE_URL'), pflicht('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
```

- [ ] **Step 3: Seed-Skript**

`scripts/seed.mjs` (liest `.env.local` der Arbeitskopie über `--env-file`):
```js
// Aufruf: node --env-file=.env.local scripts/seed.mjs
// Legt Kapitel, Fragen und Texte an, die noch fehlen (Abgleich über Titel bzw. Fragetext). Wiederholbar.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const fragen = JSON.parse(readFileSync('data/fragen-seed.json', 'utf8'));
const texte = JSON.parse(readFileSync('data/texte-seed.json', 'utf8'));

const { data: vorhandeneKapitel } = await db.from('wb_chapters').select('id,titel');
let neuKap = 0, neuFragen = 0;
for (const [ki, k] of fragen.kapitel.entries()) {
  let kap = vorhandeneKapitel?.find((x) => x.titel === k.titel);
  if (!kap) {
    const { data, error } = await db.from('wb_chapters').insert({ position: ki + 1, titel: k.titel, untertitel: k.untertitel, einleitung: k.einleitung, typ: k.typ }).select('id,titel').single();
    if (error) throw error; kap = data; neuKap++;
  }
  const { data: vorhandeneFragen } = await db.from('wb_questions').select('text').eq('chapter_id', kap.id);
  const set = new Set((vorhandeneFragen ?? []).map((f) => f.text));
  for (const [fi, f] of k.fragen.entries()) {
    if (set.has(f.text)) continue;
    const { error } = await db.from('wb_questions').insert({ chapter_id: kap.id, position: fi + 1, text: f.text, hinweis: f.hinweis ?? '', typ: f.typ, optionen: f.optionen ?? {} });
    if (error) throw error; neuFragen++;
  }
}
const { data: vorhandeneTexte } = await db.from('wb_texte').select('key');
const keys = new Set((vorhandeneTexte ?? []).map((t) => t.key));
const neueTexte = Object.entries(texte).filter(([k]) => !keys.has(k)).map(([key, wert]) => ({ key, wert }));
if (neueTexte.length) { const { error } = await db.from('wb_texte').insert(neueTexte); if (error) throw error; }
console.log(`seed ok · Kapitel neu ${neuKap} · Fragen neu ${neuFragen} · Texte neu ${neueTexte.length}`);
```

- [ ] **Step 4: Prüfskript Seed-Daten**

`scripts/check-seed.mjs`:
```js
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const s = JSON.parse(readFileSync(new URL('../data/fragen-seed.json', import.meta.url), 'utf8'));
const t = JSON.parse(readFileSync(new URL('../data/texte-seed.json', import.meta.url), 'utf8'));
assert.equal(s.kapitel.length, 8, '8 Kapitel');
const faktoren = s.kapitel.filter((k) => k.typ === 'faktor');
assert.equal(faktoren.length, 7, '7 Faktoren');
for (const k of faktoren) { assert.equal(k.fragen.length, 10, `${k.titel}: 10 Aussagen`); assert.ok(k.fragen.every((f) => f.typ === 'skala'), `${k.titel}: nur Skala`); assert.ok(k.einleitung.length > 50); }
const fakten = s.kapitel[0];
assert.equal(fakten.typ, 'fakten');
assert.ok(fakten.fragen.length >= 22);
assert.equal(fakten.fragen.filter((f) => f.typ === 'tabelle').length, 1);
for (const k of s.kapitel) for (const f of k.fragen) { assert.ok(f.text.trim().length > 5, 'Fragetext leer'); if (f.typ === 'tabelle') assert.ok(f.optionen.zeilen.length && f.optionen.spalten.length); }
const verboten = /\b(vielleicht|könnte|man sollte|häufig|gefühlt|eventuell|ganzheitlich|garantiert|Fixkosten)\b/i;
for (const [k, v] of Object.entries(t)) assert.ok(!verboten.test(v), `verbotenes Wort in Text ${k}`);
for (const k of s.kapitel) for (const f of k.fragen) assert.ok(!verboten.test(f.text + ' ' + (f.hinweis ?? '')), `verbotenes Wort in Frage: ${f.text}`);
for (const key of ['willkommen_text','bestandteile_text','finanzcheck_liste','faktoren_einleitung','ergebnis_text','aha_frage','ueber_text','mail_link_text','mail_fertig_text']) assert.ok(t[key], `Text ${key} fehlt`);
console.log('ok');
```
Run: `node scripts/check-seed.mjs` → `ok`.

- [ ] **Step 5: Seed einspielen**

Run in der Arbeitskopie: `node --env-file=.env.local scripts/seed.mjs` → `seed ok · Kapitel neu 8 · Fragen neu 93 · Texte neu 27`. Zweiter Lauf → alles `0`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: Datenbank wb_*, Typen, Seed aus dem Word-Workbook"
```

---

### Task 3: Punkte und Erfolgsrad-Geometrie

**Files:**
- Create: `lib/punkte.ts`, `lib/erfolgsrad-geometrie.ts`, `components/ErfolgsradSvg.tsx`, `scripts/check-punkte.mjs`, `scripts/check-geometrie.mjs`

**Interfaces:**
- Consumes: `Snapshot`, `Antworten` aus `lib/db.ts`.
- Produces:
  - `punkteJeFaktor(snapshot: Snapshot, antworten: Antworten): Faktorwert[]` mit `type Faktorwert = { kapitelId: string; titel: string; punkte: number; summe: number; maximum: number }`.
  - `fortschritt(snapshot, antworten): { beantwortet: number; gesamt: number; prozent: number }`.
  - `flach(snapshot): FlacheFrage[]` mit `type FlacheFrage = { kapitelIndex: number; frageIndex: number; kapitel: SnapshotKapitel; frage: SnapshotFrage; ersteImKapitel: boolean }`.
  - `radGeometrie(werte: {titel:string;punkte:number}[], groesse = 520): RadGeometrie` mit `{ cx, cy, R, ringe: number[], segmente: { pfad: string; deckkraft: number; wert: number; wertX: number; wertY: number; labelX: number; labelY: number; titel: string; trennX: number; trennY: number }[] }`.
  - `ErfolgsradSvg({ werte, groesse?, hell? })` React-Komponente (Web).

Die Skripte importieren TypeScript nicht direkt. Deshalb liegen `punkte` und `geometrie` als **reines JavaScript-kompatibles TypeScript ohne Typ-Laufzeitabhängigkeiten**, und die Prüfskripte laden sie über `node --experimental-strip-types` (Node 26 kann TS-Dateien ohne Typ-Syntax-Erweiterungen direkt ausführen; keine `enum`, keine Parameter-Properties benutzen).

- [ ] **Step 1: Prüfskript Punkte (rot)**

`scripts/check-punkte.mjs`:
```js
import assert from 'node:assert/strict';
const { punkteJeFaktor, fortschritt, flach } = await import('../lib/punkte.ts');
const snap = { erstellt: '', kapitel: [
  { id: 'k1', titel: 'Fakten', untertitel: '', typ: 'fakten', einleitung: '', fragen: [{ id: 'f1', typ: 'text', text: 'A', hinweis: '' }, { id: 'f2', typ: 'skala', text: 'Steuerberater', hinweis: '' }] },
  { id: 'k2', titel: 'Finanzen', untertitel: '', typ: 'faktor', einleitung: '', fragen: Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, typ: 'skala', text: `S${i}`, hinweis: '' })) },
  { id: 'k3', titel: 'Kurz', untertitel: '', typ: 'faktor', einleitung: '', fragen: [{ id: 'a', typ: 'skala', text: 'a', hinweis: '' }, { id: 'b', typ: 'skala', text: 'b', hinweis: '' }, { id: 'c', typ: 'text', text: 'c', hinweis: '' }] },
] };
const antworten = { f1: 'x', f2: 7, s0: 5, s1: 5, s2: 5, s3: 5, s4: 5, s5: 5, s6: 5, s7: 5, s8: 5, s9: 5, a: 10, b: 3 };
const w = punkteJeFaktor(snap, antworten);
assert.equal(w.length, 2, 'nur faktor-Kapitel');
assert.equal(w[0].punkte, 50); assert.equal(w[0].summe, 50); assert.equal(w[0].maximum, 100);
assert.equal(w[1].punkte, 65, '13/20 → 65'); assert.equal(w[1].maximum, 20);
assert.equal(punkteJeFaktor(snap, {})[0].punkte, 0);
assert.deepEqual(fortschritt(snap, antworten), { beantwortet: 14, gesamt: 15, prozent: 93 });
assert.deepEqual(fortschritt(snap, { f1: '   ' }).beantwortet, 0, 'leerer Text zählt nicht');
const fl = flach(snap);
assert.equal(fl.length, 15); assert.equal(fl[2].ersteImKapitel, true); assert.equal(fl[3].ersteImKapitel, false); assert.equal(fl[2].kapitel.id, 'k2');
console.log('ok');
```
Run: `node --experimental-strip-types scripts/check-punkte.mjs` → FAIL (Modul fehlt).

- [ ] **Step 2: lib/punkte.ts**

```ts
import type { Snapshot, SnapshotKapitel, SnapshotFrage, Antworten, Antwort } from './db';

export type Faktorwert = { kapitelId: string; titel: string; punkte: number; summe: number; maximum: number };
export type FlacheFrage = { kapitelIndex: number; frageIndex: number; kapitel: SnapshotKapitel; frage: SnapshotFrage; ersteImKapitel: boolean };

export function istBeantwortet(frage: SnapshotFrage, wert: Antwort | undefined): boolean {
  if (wert === undefined || wert === null) return false;
  if (frage.typ === 'skala') return typeof wert === 'number' && wert >= 1 && wert <= 10;
  if (frage.typ === 'text') return typeof wert === 'string' && wert.trim().length > 0;
  if (frage.typ === 'tabelle') return typeof wert === 'object' && Object.values(wert as Record<string, Record<string, string>>).some((z) => Object.values(z).some((v) => String(v).trim() !== ''));
  return false;
}

export function flach(snapshot: Snapshot): FlacheFrage[] {
  const aus: FlacheFrage[] = [];
  snapshot.kapitel.forEach((kapitel, kapitelIndex) => {
    kapitel.fragen.forEach((frage, frageIndex) => aus.push({ kapitelIndex, frageIndex, kapitel, frage, ersteImKapitel: frageIndex === 0 }));
  });
  return aus;
}

export function fortschritt(snapshot: Snapshot, antworten: Antworten) {
  const alle = flach(snapshot);
  const beantwortet = alle.filter((f) => istBeantwortet(f.frage, antworten[f.frage.id])).length;
  const gesamt = alle.length;
  return { beantwortet, gesamt, prozent: gesamt ? Math.round((beantwortet / gesamt) * 100) : 0 };
}

// Punkte je Erfolgsfaktor: Summe der Skala-Antworten, auf 100 normiert.
// Bei zehn Aussagen ist das die einfache Summe wie im Word-Workbook.
export function punkteJeFaktor(snapshot: Snapshot, antworten: Antworten): Faktorwert[] {
  return snapshot.kapitel
    .filter((k) => k.typ === 'faktor')
    .map((k) => {
      const skala = k.fragen.filter((f) => f.typ === 'skala');
      const summe = skala.reduce((s, f) => s + (typeof antworten[f.id] === 'number' ? (antworten[f.id] as number) : 0), 0);
      const maximum = skala.length * 10;
      return { kapitelId: k.id, titel: k.titel, summe, maximum, punkte: maximum ? Math.round((summe / maximum) * 100) : 0 };
    })
    .filter((w) => w.maximum > 0);
}
```
Run Prüfskript → `ok`.

- [ ] **Step 3: Prüfskript Geometrie (rot)**

`scripts/check-geometrie.mjs`:
```js
import assert from 'node:assert/strict';
const { radGeometrie } = await import('../lib/erfolgsrad-geometrie.ts');
const g = radGeometrie([{ titel: 'A', punkte: 100 }, { titel: 'B', punkte: 0 }, { titel: 'C', punkte: 50 }], 520);
assert.equal(g.segmente.length, 3); assert.equal(g.ringe.length, 10);
assert.equal(g.cx, 260); assert.ok(g.R > 150 && g.R < 220);
assert.ok(g.segmente[0].pfad.startsWith('M260,260'), 'Pfad beginnt in der Mitte');
assert.equal(g.segmente[1].pfad, '', 'Wert 0 → kein Pfad');
assert.ok(g.segmente[0].deckkraft === 1 && g.segmente[2].deckkraft > 0.5 && g.segmente[2].deckkraft < 1);
// erstes Segment beginnt bei 12 Uhr: Label liegt rechts oben von der Mitte
assert.ok(g.segmente[0].labelY < 260 && g.segmente[0].labelX > 260);
console.log('ok');
```

- [ ] **Step 4: lib/erfolgsrad-geometrie.ts**

```ts
export type RadWert = { titel: string; punkte: number };
export type RadSegment = { titel: string; wert: number; pfad: string; deckkraft: number; wertX: number; wertY: number; labelX: number; labelY: number; trennX: number; trennY: number };
export type RadGeometrie = { cx: number; cy: number; R: number; ringe: number[]; segmente: RadSegment[] };

// Reine Geometrie, keine Darstellung. Web-SVG und PDF-SVG zeichnen dieselben Pfade.
export function radGeometrie(werte: RadWert[], groesse = 520): RadGeometrie {
  const cx = groesse / 2, cy = groesse / 2, R = groesse * 0.365;
  const n = Math.max(werte.length, 1), luecke = 0.035;
  const pol = (a: number, r: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  const runde = (x: number) => Math.round(x * 100) / 100;
  const segmente = werte.map((w, i) => {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n + luecke;
    const a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / n - luecke;
    const am = (a0 + a1) / 2;
    const wert = Math.max(0, Math.min(100, Math.round(w.punkte)));
    const r = (R * wert) / 100;
    const [x0, y0] = pol(a0, r), [x1, y1] = pol(a1, r);
    const pfad = wert > 0 ? `M${runde(cx)},${runde(cy)} L${runde(x0)},${runde(y0)} A${runde(r)},${runde(r)} 0 0 1 ${runde(x1)},${runde(y1)} Z` : '';
    const [wertX, wertY] = pol(am, Math.max(r - groesse * 0.045, groesse * 0.08));
    const [labelX, labelY] = pol(am, R + groesse * 0.035);
    const [trennX, trennY] = pol(-Math.PI / 2 + (i * 2 * Math.PI) / n, R);
    return { titel: w.titel, wert, pfad, deckkraft: 0.32 + (0.68 * wert) / 100, wertX, wertY, labelX, labelY, trennX, trennY };
  });
  return { cx, cy, R, ringe: Array.from({ length: 10 }, (_, i) => (R * (i + 1)) / 10), segmente };
}
```
Run → `ok`.

- [ ] **Step 5: Web-Komponente**

`components/ErfolgsradSvg.tsx`:
```tsx
import { radGeometrie, type RadWert } from '@/lib/erfolgsrad-geometrie';

export function ErfolgsradSvg({ werte, groesse = 520, hell = false }: { werte: RadWert[]; groesse?: number; hell?: boolean }) {
  const g = radGeometrie(werte, groesse);
  const ring = hell ? '#D5D9DC' : '#2A353D', flaeche = hell ? '#FFFFFF' : '#16212A', trenn = hell ? '#AFB3B5' : '#3D4D5C', text = hell ? '#0F1B23' : '#EEEEEE';
  const kurz = (t: string) => t.replace(' & wirtschaftliche Lage', ' & Lage').replace(' & Leistungserbringung', '');
  return (
    <svg viewBox={`0 0 ${groesse} ${groesse}`} width="100%" role="img" aria-label="Erfolgsrad">
      <circle cx={g.cx} cy={g.cy} r={g.R + groesse * 0.065} fill={flaeche} stroke={ring} />
      {g.ringe.map((r) => <circle key={r} cx={g.cx} cy={g.cy} r={r} fill="none" stroke={ring} strokeWidth={1} />)}
      {g.segmente.map((s) => (
        <g key={s.titel}>
          {s.pfad && <path d={s.pfad} fill="#ED7A02" opacity={s.deckkraft} />}
          <line x1={g.cx} y1={g.cy} x2={s.trennX} y2={s.trennY} stroke={trenn} strokeWidth={1.5} />
          <text x={s.labelX} y={s.labelY} fill={text} fontSize={groesse * 0.023} fontWeight={500} textAnchor="middle" dominantBaseline="middle" fontFamily="Montserrat, Arial">{kurz(s.titel)}</text>
          {s.wert > 0 && <text x={s.wertX} y={s.wertY} fill="#fff" fontSize={groesse * 0.029} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fontFamily="Montserrat, Arial">{s.wert}</text>}
        </g>
      ))}
      <circle cx={g.cx} cy={g.cy} r={groesse * 0.027} fill={hell ? '#EEEEEE' : '#0F1B23'} stroke={trenn} />
    </svg>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: Punkte je Faktor, Erfolgsrad-Geometrie und Web-SVG mit Prüfskripten"
```

---

### Task 4: Sitzung, Texte, Mail, Start-Seite

**Files:**
- Create: `lib/sitzung.ts`, `lib/texte.ts`, `lib/mail.ts`, `lib/bremse.ts`, `app/api/start/route.ts`, `app/api/w/[token]/route.ts`, `app/api/w/[token]/link/route.ts`, `app/page.tsx` (ersetzen)

**Interfaces:**
- Consumes: `db`, Typen aus `lib/db.ts`.
- Produces:
  - `snapshotZiehen(): Promise<Snapshot>` (aktive Kapitel/Fragen, Platzhalter `{jahr-1}` aufgelöst).
  - `sitzungAnlegen(k: Kontakt, test?: boolean): Promise<Sitzung>` mit `type Kontakt = { vorname; nachname; firma; telefon; email }`.
  - `sitzungLaden(token: string): Promise<Sitzung | null>`.
  - `antwortSpeichern(token, frageId, wert, position): Promise<void>`.
  - `texteLaden(): Promise<Record<string,string>>`, `fuelle(text, werte): string` (ersetzt `{vorname}`, `{link}` …).
  - `sendeMail({ an: string[]; betreff; text; anhang?: { dateiname; inhalt: Buffer } }): Promise<void>`, `linkMailSenden(s: Sitzung)`.
  - `bremse(schluessel: string, max: number, fensterSekunden: number): boolean` (true = erlaubt).
  - `aufruferIp(req: Request): string`.
  - `linkFuer(s: Sitzung) = ${APP_URL}/w/${s.token}`.

- [ ] **Step 1: lib/bremse.ts**

```ts
// ponytail: Zähler im Modulspeicher. Vercel-Funktionen starten kalt und teilen ihn nicht —
// als Missbrauchs-Bremse für ein Vorbereitungs-Tool reicht das. Upstash Redis, wenn es je knapp wird.
const zaehler = new Map<string, { n: number; bis: number }>();
export function bremse(schluessel: string, max: number, fensterSekunden: number): boolean {
  const jetzt = Date.now();
  const e = zaehler.get(schluessel);
  if (!e || e.bis < jetzt) { zaehler.set(schluessel, { n: 1, bis: jetzt + fensterSekunden * 1000 }); return true; }
  e.n += 1;
  return e.n <= max;
}
export function aufruferIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unbekannt';
}
```

- [ ] **Step 2: lib/texte.ts**

```ts
import { db } from './db';
import seed from '@/data/texte-seed.json';

export async function texteLaden(): Promise<Record<string, string>> {
  const { data } = await db.from('wb_texte').select('key,wert');
  const aus: Record<string, string> = { ...(seed as Record<string, string>) };
  for (const t of data ?? []) aus[t.key] = t.wert;
  return aus;
}
export function fuelle(text: string, werte: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => werte[k] ?? '');
}
```
In `tsconfig.json` muss `"resolveJsonModule": true` stehen (ist bei JOERG AI so).

- [ ] **Step 3: lib/sitzung.ts**

```ts
import { randomBytes } from 'node:crypto';
import { db, type Snapshot, type SnapshotKapitel, type Sitzung, type Antwort, type Kapitel, type Frage, type TabellenOptionen } from './db';

export type Kontakt = { vorname: string; nachname: string; firma: string; telefon: string; email: string };

function platzhalterJahr(s: string): string {
  const jahr = new Date().getFullYear();
  return s.replace(/\{jahr(-(\d))?\}/g, (_, __, d) => String(jahr - (d ? Number(d) : 0)));
}

export async function snapshotZiehen(): Promise<Snapshot> {
  const { data: kapitel, error: e1 } = await db.from('wb_chapters').select('*').eq('aktiv', true).order('position');
  if (e1) throw e1;
  const { data: fragen, error: e2 } = await db.from('wb_questions').select('*').eq('aktiv', true).order('position');
  if (e2) throw e2;
  const kap: SnapshotKapitel[] = (kapitel as Kapitel[]).map((k) => ({
    id: k.id, titel: k.titel, untertitel: k.untertitel, typ: k.typ, einleitung: k.einleitung,
    fragen: (fragen as Frage[]).filter((f) => f.chapter_id === k.id).map((f) => ({
      id: f.id, typ: f.typ, text: f.text, hinweis: f.hinweis,
      ...(f.typ === 'tabelle' ? { optionen: { zeilen: (f.optionen.zeilen ?? []).map(platzhalterJahr), spalten: (f.optionen.spalten ?? []).map(platzhalterJahr) } as TabellenOptionen } : {}),
    })),
  })).filter((k) => k.fragen.length > 0);
  return { kapitel: kap, erstellt: new Date().toISOString() };
}

export function linkFuer(s: { token: string }): string {
  return `${process.env.APP_URL ?? 'http://localhost:3000'}/w/${s.token}`;
}

export async function sitzungAnlegen(k: Kontakt, test = false): Promise<Sitzung> {
  const snapshot = await snapshotZiehen();
  if (!snapshot.kapitel.length) throw new Error('Kein aktiver Fragebogen');
  const token = randomBytes(32).toString('base64url');
  const { data, error } = await db.from('wb_sessions').insert({ ...k, token, test, fragen_snapshot: snapshot }).select('*').single();
  if (error) throw error;
  return data as Sitzung;
}

export async function sitzungLaden(token: string): Promise<Sitzung | null> {
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;
  const { data } = await db.from('wb_sessions').select('*').eq('token', token).maybeSingle();
  return (data as Sitzung) ?? null;
}

export async function antwortSpeichern(token: string, frageId: string, wert: Antwort, position: number): Promise<void> {
  const s = await sitzungLaden(token);
  if (!s) throw new Error('Sitzung nicht gefunden');
  if (s.status === 'abgeschlossen') throw new Error('Sitzung ist abgeschlossen');
  const kennt = s.fragen_snapshot.kapitel.some((k) => k.fragen.some((f) => f.id === frageId));
  if (!kennt) throw new Error('Frage gehört nicht zu dieser Sitzung');
  const antworten = { ...s.antworten, [frageId]: wert };
  const { error } = await db.from('wb_sessions').update({ antworten, aktuelle_frage: position, updated_at: new Date().toISOString() }).eq('id', s.id);
  if (error) throw error;
}
```

- [ ] **Step 4: lib/mail.ts**

```ts
import { Resend } from 'resend';
import { texteLaden, fuelle } from './texte';
import { linkFuer } from './sitzung';
import type { Sitzung } from './db';

const VON = 'JOERG ROOS <noreply@joerg-roos.com>';
const ANTWORT_AN = 'office@joerg-roos.com';
export const INTERN = 'controlling@joerg-roos.com';

function html(text: string): string {
  const abs = text.split(/\n\n+/).map((a) => `<p style="margin:0 0 16px;line-height:1.6">${a.replace(/\n/g, '<br>').replace(/(https?:\/\/\S+)/g, '<a href="$1" style="color:#ED7A02">$1</a>')}</p>`).join('');
  return `<div style="font-family:Montserrat,Arial,sans-serif;font-size:16px;color:#0F1B23;max-width:600px;margin:0 auto;padding:32px 24px">${abs}<p style="font-size:12px;color:#878D91;margin-top:32px">JOERG ROOS · Zum Stadtgraben 5 · 45721 Haltern am See · joerg-roos.com</p></div>`;
}

export async function sendeMail(m: { an: string[]; betreff: string; text: string; anhang?: { dateiname: string; inhalt: Buffer } }): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: VON, to: m.an, replyTo: ANTWORT_AN, subject: m.betreff, text: m.text, html: html(m.text),
    attachments: m.anhang ? [{ filename: m.anhang.dateiname, content: m.anhang.inhalt }] : undefined,
  });
  if (error) throw new Error(`Resend: ${JSON.stringify(error)}`);
}

export async function linkMailSenden(s: Sitzung): Promise<void> {
  const t = await texteLaden();
  const werte = { vorname: s.vorname, link: linkFuer(s) };
  await sendeMail({ an: [s.email], betreff: fuelle(t.mail_link_betreff, werte), text: fuelle(t.mail_link_text, werte) });
}
```

- [ ] **Step 5: API Start, Laden, Link**

`app/api/start/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { sitzungAnlegen, linkFuer } from '@/lib/sitzung';
import { linkMailSenden } from '@/lib/mail';
import { bremse, aufruferIp } from '@/lib/bremse';

export async function POST(req: Request) {
  if (!bremse(`start:${aufruferIp(req)}`, 10, 3600)) return NextResponse.json({ error: 'Zu viele Versuche. Bitte später erneut.' }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const feld = (k: string, max = 120) => String(b[k] ?? '').trim().slice(0, max);
  const k = { vorname: feld('vorname'), nachname: feld('nachname'), firma: feld('firma', 200), telefon: feld('telefon', 40), email: feld('email').toLowerCase() };
  if (!k.vorname || !k.nachname || !k.firma || !k.email) return NextResponse.json({ error: 'Bitte alle Pflichtfelder ausfüllen.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(k.email)) return NextResponse.json({ error: 'Die E-Mail-Adresse sieht nicht richtig aus.' }, { status: 400 });
  const s = await sitzungAnlegen(k, b.test === true && req.headers.get('x-wb-test') === 'ja');
  try { await linkMailSenden(s); } catch (e) { console.error('[start] Link-Mail', e); }
  return NextResponse.json({ link: linkFuer(s), token: s.token });
}
```

`app/api/w/[token]/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { sitzungLaden } from '@/lib/sitzung';
import { fortschritt } from '@/lib/punkte';

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) return NextResponse.json({ error: 'Link ungültig' }, { status: 404 });
  return NextResponse.json({
    vorname: s.vorname, status: s.status, snapshot: s.fragen_snapshot, antworten: s.antworten, aha: s.aha,
    aktuelleFrage: s.aktuelle_frage, fortschritt: fortschritt(s.fragen_snapshot, s.antworten), pdf: !!s.pdf_path,
  });
}
```

`app/api/w/[token]/link/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { sitzungLaden } from '@/lib/sitzung';
import { linkMailSenden } from '@/lib/mail';
import { bremse } from '@/lib/bremse';

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) return NextResponse.json({ error: 'Link ungültig' }, { status: 404 });
  if (!bremse(`link:${s.id}`, 3, 3600)) return NextResponse.json({ error: 'Der Link wurde gerade schon geschickt.' }, { status: 429 });
  await linkMailSenden(s);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Start-Seite**

`app/page.tsx` als Client-Komponente (`'use client'`). Aufbau exakt wie `docs/mockup/index.html#start`: Topbar mit `logo-full-white.svg` und „360° Business-Analyse · Workbook“; Eyebrow `start_titel`-Text steht in der Überschrift `Dein Workbook zur <span class="text-o">360° Business-Analyse</span>`; Lead-Text und Hinweise werden serverseitig geladen — dafür die Seite in `app/page.tsx` (Server, lädt `texteLaden()`) und `components/StartFormular.tsx` (Client) teilen. Formular: fünf Felder (Vorname, Nachname, Firmenname über zwei Spalten, Telefon, E-Mail), Knopf „Interview starten →“, Datenschutz-Satz „Deine Angaben nutzen wir nur für die 360° Business-Analyse.“ mit Link auf `https://joerg-roos.com/datenschutz`.

`components/StartFormular.tsx` Kern:
```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function StartFormular() {
  const r = useRouter();
  const [f, setF] = useState({ vorname: '', nachname: '', firma: '', telefon: '', email: '' });
  const [fehler, setFehler] = useState(''); const [laeuft, setLaeuft] = useState(false);
  async function starten(e: React.FormEvent) {
    e.preventDefault(); setLaeuft(true); setFehler('');
    const res = await fetch('/api/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const d = await res.json();
    if (!res.ok) { setFehler(d.error ?? 'Das hat nicht geklappt.'); setLaeuft(false); return; }
    r.push(`/w/${d.token}`);
  }
  const feld = (k: keyof typeof f, label: string, typ = 'text') => (
    <div><label htmlFor={k}>{label}</label><input id={k} type={typ} required={k !== 'telefon'} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );
  return (
    <form className="card" onSubmit={starten}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {feld('vorname', 'Vorname')}{feld('nachname', 'Nachname')}
        <div className="md:col-span-2">{feld('firma', 'Firmenname')}</div>
        {feld('telefon', 'Telefon', 'tel')}{feld('email', 'E-Mail', 'email')}
      </div>
      {fehler && <p className="mt-4 text-[#ff7a52]">{fehler}</p>}
      <div className="flex flex-wrap items-center gap-4 mt-6">
        <button className="btn text-[17px] px-9 py-5" disabled={laeuft}>{laeuft ? 'Einen Moment …' : 'Interview starten →'}</button>
        <span className="fine max-w-[300px]">Deine Angaben nutzen wir nur für die 360° Business-Analyse. <a className="underline" href="https://joerg-roos.com/datenschutz" target="_blank" rel="noreferrer">Datenschutz</a></span>
      </div>
    </form>
  );
}
```

- [ ] **Step 7: Prüfen im Browser**

`./scripts/sync-lokal.sh`, Dev-Server `workbook-lokal` starten, `http://localhost:3000`: Formular ausfüllen mit eigener Adresse → Weiterleitung auf `/w/<token>` (404 ist hier noch in Ordnung, Seite kommt in Task 5), Link-Mail kommt an, `GET /api/w/<token>` liefert Snapshot mit 8 Kapiteln und 93 Fragen, Spaltenköpfe der Tabelle zeigen `Dezember 2024 · Dezember 2025 · Aktuell`.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: Sitzung mit Snapshot, Start-Seite, Link-Mail"
```

---

### Task 5: Interview-Seite

**Files:**
- Create: `app/w/[token]/page.tsx`, `components/Interview.tsx`, `components/Fortschritt.tsx`, `components/FrageText.tsx`, `components/FrageSkala.tsx`, `components/FrageTabelle.tsx`, `app/api/w/[token]/antwort/route.ts`

**Interfaces:**
- Consumes: `GET /api/w/[token]` (Task 4), `flach`, `istBeantwortet`, `fortschritt` (Task 3), Typen.
- Produces: `PUT /api/w/[token]/antwort` Body `{ frageId: string; wert: Antwort; position: number }` → `{ ok: true }`. Komponente `Mikro` wird in Task 6 eingehängt; `FrageText` bekommt dafür schon die Prop `onDiktat?: (text: string) => void` und rendert einen Platz (`<div id="mikro-slot" />`) rechts unten im Textfeld.

- [ ] **Step 1: Antwort-Route**

```ts
import { NextResponse } from 'next/server';
import { antwortSpeichern } from '@/lib/sitzung';

export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const b = await req.json().catch(() => null);
  if (!b || typeof b.frageId !== 'string' || typeof b.position !== 'number') return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  const wert = b.wert;
  const ok = typeof wert === 'string' ? wert.length <= 20000 : typeof wert === 'number' ? Number.isInteger(wert) && wert >= 1 && wert <= 10 : typeof wert === 'object' && wert !== null && JSON.stringify(wert).length <= 5000;
  if (!ok) return NextResponse.json({ error: 'Ungültiger Wert' }, { status: 400 });
  try { await antwortSpeichern(token, b.frageId, wert, b.position); return NextResponse.json({ ok: true }); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 409 }); }
}
```

- [ ] **Step 2: Seite und Interview-Komponente**

`app/w/[token]/page.tsx` (Server): lädt `sitzungLaden(token)`; kein Treffer → Seite „Dieser Link ist ungültig. Schreib uns an office@joerg-roos.com.“; Status `abgeschlossen` → `redirect(`/w/${token}/fertig`)`; sonst `<Interview token snapshot antworten start={aktuelle_frage} vorname />`.

`components/Interview.tsx` (`'use client'`), Verhalten:
- `const alle = flach(snapshot)`; Zustand `pos` (Index in `alle`), `antworten`, `zeigeEinleitung` (true, wenn `alle[pos].ersteImKapitel` und Kapitel eine Einleitung hat und der Nutzer sie in dieser Sitzung noch nicht weggeklickt hat; Merker `sessionStorage`).
- Kopf: Topbar (Logo, `Frage ${pos+1} von ${alle.length} · ${prozent} %`), `<Fortschritt kapitel={snapshot.kapitel} aktuellesKapitel={alle[pos].kapitelIndex} prozent />`.
- Einleitungs-Bildschirm: Eyebrow `untertitel`, Titel `titel`, Text `einleitung`, Knopf „Los geht's →“.
- Frage-Bildschirm: Zeile `Kapitel ${k+1} · ${titel}`, bei Faktor-Kapitel die Pille `Erfolgsfaktor · ${titel} · Aussage ${frageIndex+1} von ${n}`; Fragetext (34px, Gewicht 500), Hinweis; darunter je Typ `FrageText` / `FrageSkala` / `FrageTabelle`.
- Navigation: „← Zurück“ (disabled bei pos 0), Tastenhinweis, „Weiter →“. Enter in Skala/Tabelle = Weiter; im Textfeld Strg/Cmd+Enter = Weiter (Enter macht Zeilenumbruch).
- `weiter()`: Skala ohne Wert → Hinweis „Bitte wähle einen Wert.“ und Abbruch. Freitext leer → `confirm('Ohne Antwort weiter?')`. Speichern: `PUT antwort` mit dem aktuellen Wert (auch leer, als `''`), bei Fehler roter Hinweis „Nicht gespeichert, bitte erneut versuchen“ und Abbruch; bei Erfolg `pos+1`. Letzte Frage → `PUT` und `router.push(`/w/${token}/ergebnis`)`.
- Skala-Auswahl: Wert setzen und nach 450 ms automatisch `weiter()`; Zifferntasten 1–9 und 0 (=10) setzen den Wert.
- Knopf „Später weitermachen“ (klein, Topbar): `POST /api/w/[token]/link` → Hinweis „Link ist unterwegs an deine E-Mail.“

`components/Fortschritt.tsx`:
```tsx
export function Fortschritt({ kapitel, aktuellesKapitel, prozent }: { kapitel: { titel: string }[]; aktuellesKapitel: number; prozent: number }) {
  const kurz = (t: string) => t.replace('Ein paar Fakten zum Einstieg', 'Ein paar Fakten').replace('Unternehmerpersönlichkeit', 'Persönlichkeit').replace(' & wirtschaftliche Lage', '').replace(' & Leistungserbringung', '').replace(' (Vertrieb)', '');
  return (
    <div className="px-12">
      <div className="h-1 rounded bg-line overflow-hidden"><i className="block h-full rounded" style={{ width: `${prozent}%`, background: 'linear-gradient(90deg,#9F3C07,#ED7A02)' }} /></div>
      <div className="flex gap-1.5 mt-3.5">
        {[...kapitel, { titel: 'Ergebnis' }].map((k, i) => (
          <b key={i} className="flex-1 h-1.5 rounded relative" style={{ background: i < aktuellesKapitel ? '#ED7A02' : i === aktuellesKapitel ? 'linear-gradient(90deg,#ED7A02 60%,#2A353D 60%)' : '#2A353D' }}>
            <span className="absolute top-3 left-0 text-[10px] font-medium uppercase tracking-wider text-muted whitespace-nowrap hidden md:block">{kurz(k.titel)}</span>
          </b>
        ))}
      </div>
    </div>
  );
}
```

`components/FrageSkala.tsx`:
```tsx
'use client';
export function FrageSkala({ wert, onChange }: { wert?: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2.5 mt-4">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} aria-pressed={wert === n}
            className={`aspect-square rounded-[14px] border text-xl font-semibold ${wert === n ? 'bg-o border-o' : 'bg-blue border-line hover:border-o'}`}>{n}</button>
        ))}
      </div>
      <div className="flex justify-between text-[13px] text-muted mt-2.5"><span>1 · trifft überhaupt nicht zu</span><span>10 · trifft voll und ganz zu</span></div>
    </div>
  );
}
```

`components/FrageTabelle.tsx`: Tabelle `zeilen × spalten` mit `<input inputMode="numeric">` je Zelle, Wert-Form `TabellenWert` (`{ [zeile]: { [spalte]: string } }`), `onChange(neuerWert)`.

`components/FrageText.tsx`: `<textarea>` (min. 170px, autofokus), Prop `wert`, `onChange`, `mikro?: React.ReactNode` (wird rechts unten absolut platziert, Klasse wie `.mic` im Mockup).

- [ ] **Step 3: Browser-Durchlauf**

Sitzung aus Task 4 öffnen. Prüfen: Einleitung Kapitel 1 erscheint einmal; Freitext speichern (Netzwerk-Tab: `PUT … 200`); Tabelle zeigt drei Jahresspalten; Skala geht nach Klick automatisch weiter; Zifferntaste setzt Wert; Zurück behält Antworten; Seite neu laden startet bei `aktuelle_frage`; „Später weitermachen“ schickt Mail. Kein Konsolenfehler.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: Interview Frage für Frage mit Fortschritt, drei Fragetypen, Speichern je Antwort"
```

---

### Task 6: Sprache zu Text

**Files:**
- Create: `lib/stt.ts`, `lib/glaettung.ts`, `app/api/transkribieren/route.ts`, `components/Mikro.tsx`, `scripts/check-glaettung.mjs`
- Modify: `components/Interview.tsx` (Mikro in `FrageText` einhängen)

**Interfaces:**
- Produces: `transkribiere(datei: File): Promise<string>` · `glaette(roh: string): Promise<string>` · `POST /api/transkribieren` (multipart `audio`, Header `x-wb-token`) → `{ text: string }` · `<Mikro onText={(t)=>…} token />`.

- [ ] **Step 1: lib/stt.ts**

```ts
import OpenAI from 'openai';
export async function transkribiere(datei: File): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const r = await client.audio.transcriptions.create({ file: datei, model: 'gpt-4o-mini-transcribe', language: 'de', response_format: 'text' });
  return typeof r === 'string' ? r.trim() : String((r as { text?: string }).text ?? '').trim();
}
```

- [ ] **Step 2: lib/glaettung.ts**

```ts
import Anthropic from '@anthropic-ai/sdk';

export const GLAETTUNG_ANWEISUNG = `Du bekommst die Rohabschrift einer gesprochenen Antwort eines Handwerksunternehmers auf eine Frage in einem Workbook.
Bring den Text in verständliches Schriftdeutsch, so wie der Sprecher es selbst aufschreiben würde.
Regeln:
- Ich-Perspektive und Wortwahl des Sprechers behalten. Kein Berater-Ton.
- Füllwörter, Versprecher, Wiederholungen und Satzabbrüche entfernen. Sätze vollständig und gerade machen.
- Nichts hinzufügen, nichts bewerten, nichts zusammenfassen. Jede inhaltliche Aussage bleibt erhalten.
- Zahlen, Namen, Firmen, Orte und Fachbegriffe exakt übernehmen.
- Absätze nur, wenn der Sprecher erkennbar das Thema wechselt.
- Antworte ausschließlich mit dem geglätteten Text. Keine Einleitung, keine Anführungszeichen, keine Erklärung.`;

export async function glaette(roh: string): Promise<string> {
  if (roh.trim().length < 12) return roh.trim();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const r = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', max_tokens: 2000, temperature: 0, system: GLAETTUNG_ANWEISUNG,
    messages: [{ role: 'user', content: roh }],
  });
  const text = r.content.filter((c) => c.type === 'text').map((c) => (c as { text: string }).text).join('').trim();
  return text || roh.trim();
}
```

- [ ] **Step 3: Route**

```ts
import { NextResponse } from 'next/server';
import { sitzungLaden } from '@/lib/sitzung';
import { transkribiere } from '@/lib/stt';
import { glaette } from '@/lib/glaettung';
import { bremse } from '@/lib/bremse';

export const maxDuration = 60;

export async function POST(req: Request) {
  const token = req.headers.get('x-wb-token') ?? '';
  const s = await sitzungLaden(token);
  if (!s || s.status === 'abgeschlossen') return NextResponse.json({ error: 'Keine gültige Sitzung' }, { status: 401 });
  if (!bremse(`stt:${s.id}`, 60, 3600)) return NextResponse.json({ error: 'Zu viele Aufnahmen in kurzer Zeit.' }, { status: 429 });
  const form = await req.formData().catch(() => null);
  const audio = form?.get('audio');
  if (!(audio instanceof File) || audio.size === 0) return NextResponse.json({ error: 'Keine Aufnahme erhalten' }, { status: 400 });
  if (audio.size > 25 * 1024 * 1024) return NextResponse.json({ error: 'Aufnahme zu groß' }, { status: 413 });
  try {
    const roh = await transkribiere(audio);
    const text = await glaette(roh);
    return NextResponse.json({ text });
  } catch (e) {
    console.error('[transkribieren]', e);
    return NextResponse.json({ error: 'Aufnahme konnte nicht umgewandelt werden. Bitte tippen oder erneut versuchen.' }, { status: 502 });
  }
}
```

- [ ] **Step 4: Mikro-Komponente**

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';

type Zustand = 'bereit' | 'nimmt-auf' | 'wandelt-um' | 'fehler';

export function Mikro({ token, onText }: { token: string; onText: (t: string) => void }) {
  const [z, setZ] = useState<Zustand>('bereit');
  const [sek, setSek] = useState(0);
  const [fehler, setFehler] = useState('');
  const rec = useRef<MediaRecorder | null>(null);
  const teile = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { rec.current?.stream.getTracks().forEach((t) => t.stop()); if (timer.current) clearInterval(timer.current); }, []);

  async function start() {
    setFehler('');
    if (!('MediaRecorder' in window)) { setZ('fehler'); setFehler('Dein Browser kann hier nicht aufnehmen. Bitte tippen.'); return; }
    if (!sessionStorage.getItem('wb-mikro-hinweis')) {
      if (!confirm('Deine Aufnahme wird zur Umwandlung in Text an einen KI-Dienst (OpenAI) übertragen und danach gelöscht. Gespeichert wird nur der Text. Einverstanden?')) return;
      sessionStorage.setItem('wb-mikro-hinweis', 'ja');
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const typ = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const r = new MediaRecorder(stream, typ ? { mimeType: typ } : undefined);
      teile.current = [];
      r.ondataavailable = (e) => { if (e.data.size) teile.current.push(e.data); };
      r.onstop = () => { stream.getTracks().forEach((t) => t.stop()); void hochladen(new Blob(teile.current, { type: r.mimeType })); };
      r.start();
      rec.current = r; setZ('nimmt-auf'); setSek(0);
      timer.current = setInterval(() => setSek((s) => { if (s + 1 >= 300) stopp(); return s + 1; }), 1000);
    } catch { setZ('fehler'); setFehler('Kein Zugriff auf das Mikrofon. Bitte im Browser erlauben oder tippen.'); }
  }
  function stopp() { if (timer.current) clearInterval(timer.current); if (rec.current?.state === 'recording') rec.current.stop(); }
  async function hochladen(blob: Blob) {
    setZ('wandelt-um');
    const fd = new FormData();
    fd.append('audio', blob, blob.type.includes('mp4') ? 'aufnahme.mp4' : 'aufnahme.webm');
    try {
      const res = await fetch('/api/transkribieren', { method: 'POST', headers: { 'x-wb-token': token }, body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      onText(d.text); setZ('bereit');
    } catch (e) { setZ('fehler'); setFehler((e as Error).message || 'Aufnahme konnte nicht umgewandelt werden.'); }
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.code === 'Space' && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); z === 'nimmt-auf' ? stopp() : z === 'bereit' && void start(); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  });
  const mm = `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')}`;
  return (
    <div>
      <button type="button" onClick={() => (z === 'nimmt-auf' ? stopp() : start())} disabled={z === 'wandelt-um'} aria-label={z === 'nimmt-auf' ? 'Aufnahme stoppen' : 'Antwort einsprechen'}
        className={`absolute right-3.5 bottom-3.5 w-[52px] h-[52px] rounded-full bg-o flex items-center justify-center ${z === 'nimmt-auf' ? 'animate-pulse' : ''}`}>
        {z === 'nimmt-auf' ? <span className="block w-4 h-4 bg-white rounded-sm" /> : <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] fill-white"><path d="M12 15a4 4 0 0 0 4-4V6a4 4 0 1 0-8 0v5a4 4 0 0 0 4 4zm6-4a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93V22h2v-3.07A8 8 0 0 0 20 11h-2z" /></svg>}
      </button>
      <div className="mt-3.5 text-sm text-[#C9CFD3] min-h-[22px]">
        {z === 'nimmt-auf' && <span><span className="inline-block w-2 h-2 rounded-full bg-[#ff5a4a] mr-2 animate-pulse" />Aufnahme läuft · {mm} · Stopp mit Klick oder Leertaste. Danach wandeln wir deine Antwort in Text um und glätten sie – du kannst sie noch anpassen.</span>}
        {z === 'wandelt-um' && <span>Wandle deine Antwort in Text um …</span>}
        {z === 'fehler' && <span className="text-[#ff7a52]">{fehler}</span>}
      </div>
    </div>
  );
}
```
In `Interview.tsx`: `FrageText` bekommt `mikro={<Mikro token={token} onText={(t) => setText((alt) => (alt ? alt.trimEnd() + '\n\n' + t : t))} />}`. Die Hinweiszeile unter dem Mikro ersetzt die statische Zeile aus dem Mockup.

- [ ] **Step 5: Prüfskript Glättung**

`scripts/check-glaettung.mjs` (läuft nur mit `ANTHROPIC_API_KEY`, sonst „übersprungen“):
```js
if (!process.env.ANTHROPIC_API_KEY) { console.log('übersprungen (kein ANTHROPIC_API_KEY)'); process.exit(0); }
const { glaette } = await import('../lib/glaettung.ts');
const faelle = [
  { roh: 'ähm also wir haben so ungefähr äh zwölf Leute und der Umsatz war letztes Jahr so bei eins Komma vier Millionen also 1,4 Millionen ja', muss: ['12', '1,4'] },
  { roh: 'unser größter Wettbewerber ist die Firma Kortmann aus Haltern die sind größer und ähm fahren halt über den Preis', muss: ['Kortmann', 'Haltern'] },
];
for (const f of faelle) {
  const t = await glaette(f.roh);
  for (const m of f.muss) if (!t.includes(m)) throw new Error(`"${m}" fehlt in: ${t}`);
  if (/ähm|äh /i.test(t)) throw new Error(`Füllwort geblieben: ${t}`);
  console.log('·', t);
}
console.log('ok');
```
Run: `node --env-file=.env.local --experimental-strip-types scripts/check-glaettung.mjs` → `ok`.

- [ ] **Step 6: Browser-Prüfung**

Freitext-Frage öffnen, Mikro klicken, Hinweis bestätigen, 20 Sekunden sprechen, stoppen. Text erscheint geglättet im Feld. Netzwerk: `POST /api/transkribieren 200`. Ohne Mikro-Recht: Fehlertext erscheint, Tippen geht weiter.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: Antwort einsprechen — Transkription und Glättung"
```

---

### Task 7: Ergebnis-Seite

**Files:**
- Create: `app/w/[token]/ergebnis/page.tsx`, `components/Ergebnis.tsx`
- Modify: `lib/sitzung.ts` (Status `ergebnis` setzen)

**Interfaces:**
- Consumes: `punkteJeFaktor`, `flach`, `ErfolgsradSvg`, `Mikro`, `PUT antwort`.
- Produces: Aha-Text wird über `PUT /api/w/[token]/antwort` mit `frageId: '__aha'` gespeichert → `antwortSpeichern` schreibt bei `frageId === '__aha'` in Spalte `aha` statt in `antworten` und setzt `status = 'ergebnis'`, wenn Status `laufend` war. Knopf „Ergebnis speichern …“ ruft `POST /api/w/[token]/abschluss` (Task 9) und leitet nach `/w/[token]/fertig`.

- [ ] **Step 1: `antwortSpeichern` erweitern**

In `lib/sitzung.ts` vor der Snapshot-Prüfung:
```ts
  if (frageId === '__aha') {
    const { error } = await db.from('wb_sessions').update({ aha: String(wert).slice(0, 20000), status: s.status === 'laufend' ? 'ergebnis' : s.status, updated_at: new Date().toISOString() }).eq('id', s.id);
    if (error) throw error; return;
  }
```

- [ ] **Step 2: Seite**

`app/w/[token]/ergebnis/page.tsx` (Server): Sitzung laden (404-Seite wie Task 5), `abgeschlossen` → redirect `fertig`. Wenn Status `laufend` → `db.update({status:'ergebnis'})`. Texte laden (`ergebnis_titel`, `ergebnis_text`, `aha_titel`, `aha_frage`). Rendern `<Ergebnis … />`.

`components/Ergebnis.tsx` (`'use client'`), Aufbau nach `docs/mockup/index.html#ergebnis`:
- Eyebrow „Geschafft, {vorname}“, Überschrift „So sieht dein <span>Erfolgsrad</span> heute aus.“, Lead `ergebnis_text`.
- Zweispaltig: `<ErfolgsradSvg werte={punkte} />` links, rechts je Faktor Karte mit Titel, Balken (`punkte %`) und Zahl.
- „Deine Antworten im Überblick“: alle Fragen aus `flach(snapshot)`, Typ text → Antwort (leer: „– keine Antwort –“ in grau), Typ tabelle → kleine Tabelle, Faktor-Kapitel als ein Eintrag „10 Aussagen · X von 100 Punkten“ mit aufklappbarer Liste Aussage → Wert. Jeder Eintrag hat Link „bearbeiten“ → `/w/[token]?frage=<index>` (Interview liest `?frage=` und springt dorthin; nach „Weiter“ von der letzten Frage geht es wieder zum Ergebnis — Anpassung in `Interview.tsx`: `useSearchParams`, `start = Number(frage) || aktuelle_frage`, und wenn `?frage` gesetzt war, führt „Weiter“ direkt zurück zum Ergebnis).
- Aha-Karte (Rahmen orange, Hintergrund `#1F1408`): Eyebrow `aha_titel`, Frage `aha_frage`, Textfeld mit `Mikro`, Speichern beim Verlassen des Feldes (`onBlur` → PUT `__aha`).
- Knopf „Ergebnis speichern & Workbook als PDF erhalten“: bestätigt mit `confirm('Wollen wir dein Ergebnis so festhalten? Danach sind die Antworten nicht mehr änderbar.')`, speichert Aha, `POST abschluss`, bei Erfolg `router.push(fertig)`, bei Fehler Hinweis aus Spec 13 („Wir konnten dein Workbook gerade nicht erstellen. Deine Antworten sind sicher. Bitte in einer Minute erneut versuchen.“). Knopf zeigt während der Erzeugung „Erstelle dein Workbook … das dauert bis zu einer Minute“.
- Fehlen Skala-Antworten (irgendein Faktor `summe < maximum` und eine Frage ohne Wert), oben Hinweis-Karte „Dir fehlen noch N Aussagen — <a>zur ersten offenen</a>“ und der Speichern-Knopf ist deaktiviert.

- [ ] **Step 3: Browser-Prüfung**

Sitzung mit allen Skala-Werten (schnell durchklicken). Ergebnis zeigt Rad mit sieben Segmenten, Zahlen stimmen mit Summen überein (stichprobenartig Faktor 2 nachrechnen). „bearbeiten“ springt zur Frage und zurück. Aha-Text bleibt nach Neuladen. Abschluss-Knopf liefert noch 404 (Task 9).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: Ergebnis-Seite mit Erfolgsrad, Antwortübersicht und Aha-Momenten"
```

---

### Task 8: PDF-Workbook

**Files:**
- Create: `lib/pdf/Workbook.tsx`, `lib/pdf/ErfolgsradPdf.tsx`, `lib/pdf/render.ts`, `scripts/check-pdf.mjs`, `docs/beispiel/musterdaten.json`

**Interfaces:**
- Consumes: `radGeometrie`, `punkteJeFaktor`, `flach`, Typen, Texte-Record.
- Produces: `pdfErzeugen(s: Sitzung, texte: Record<string,string>): Promise<Buffer>` · `pdfDateiname(s: Sitzung): string` (`360BA-Workbook-<Nachname ohne Sonderzeichen>-<JJJJ-MM-TT>.pdf`).

- [ ] **Step 1: Schriften und Stile**

`lib/pdf/render.ts`:
```ts
import path from 'node:path';
import { Font, renderToBuffer } from '@react-pdf/renderer';
import { Workbook } from './Workbook';
import type { Sitzung } from '@/lib/db';

let registriert = false;
export function schriftenRegistrieren() {
  if (registriert) return;
  const f = (n: string) => path.join(process.cwd(), 'public', 'fonts', n);
  Font.register({ family: 'Montserrat', fonts: [
    { src: f('Montserrat-Light.ttf'), fontWeight: 300 }, { src: f('Montserrat-Regular.ttf'), fontWeight: 400 },
    { src: f('Montserrat-Medium.ttf'), fontWeight: 500 }, { src: f('Montserrat-SemiBold.ttf'), fontWeight: 600 } ] });
  Font.registerHyphenationCallback((w) => [w]);
  registriert = true;
}
export function pdfDateiname(s: Sitzung): string {
  const name = s.nachname.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Kunde';
  return `360BA-Workbook-${name}-${new Date().toISOString().slice(0, 10)}.pdf`;
}
export async function pdfErzeugen(s: Sitzung, texte: Record<string, string>): Promise<Buffer> {
  schriftenRegistrieren();
  return Buffer.from(await renderToBuffer(Workbook({ s, texte })));
}
```

- [ ] **Step 2: Erfolgsrad für PDF**

`lib/pdf/ErfolgsradPdf.tsx`:
```tsx
import { Svg, Circle, Path, Line, Text as SvgText, G } from '@react-pdf/renderer';
import { radGeometrie, type RadWert } from '@/lib/erfolgsrad-geometrie';

export function ErfolgsradPdf({ werte, groesse = 420 }: { werte: RadWert[]; groesse?: number }) {
  const g = radGeometrie(werte, groesse);
  const kurz = (t: string) => t.replace(' & wirtschaftliche Lage', ' & Lage').replace(' & Leistungserbringung', '');
  return (
    <Svg width={groesse} height={groesse} viewBox={`0 0 ${groesse} ${groesse}`}>
      <Circle cx={g.cx} cy={g.cy} r={g.R + groesse * 0.065} fill="#FFFFFF" stroke="#D5D9DC" />
      {g.ringe.map((r) => <Circle key={r} cx={g.cx} cy={g.cy} r={r} fill="none" stroke="#D5D9DC" strokeWidth={0.8} />)}
      {g.segmente.map((s) => (
        <G key={s.titel}>
          {s.pfad ? <Path d={s.pfad} fill="#ED7A02" fillOpacity={s.deckkraft} /> : null}
          <Line x1={g.cx} y1={g.cy} x2={s.trennX} y2={s.trennY} stroke="#AFB3B5" strokeWidth={1.2} />
          <SvgText x={s.labelX} y={s.labelY} fill="#0F1B23" style={{ fontFamily: 'Montserrat', fontWeight: 500, fontSize: groesse * 0.024 }} textAnchor="middle">{kurz(s.titel)}</SvgText>
          {s.wert > 0 ? <SvgText x={s.wertX} y={s.wertY + groesse * 0.01} fill="#FFFFFF" style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: groesse * 0.03 }} textAnchor="middle">{String(s.wert)}</SvgText> : null}
        </G>
      ))}
      <Circle cx={g.cx} cy={g.cy} r={groesse * 0.027} fill="#EEEEEE" stroke="#AFB3B5" />
    </Svg>
  );
}
```

- [ ] **Step 3: Dokument**

`lib/pdf/Workbook.tsx` — Seitenfolge aus Spec Abschnitt 6. Grundgerüst:
```tsx
import path from 'node:path';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { Sitzung, SnapshotFrage, TabellenWert } from '@/lib/db';
import { flach, punkteJeFaktor } from '@/lib/punkte';
import { ErfolgsradPdf } from './ErfolgsradPdf';

const pub = (n: string) => path.join(process.cwd(), 'public', n);
const O = '#ED7A02', BLAU = '#0F1B23', GRAU = '#5F676C', LINIE = '#D5D9DC';
const st = StyleSheet.create({
  seite: { fontFamily: 'Montserrat', fontSize: 10.5, color: BLAU, paddingTop: 64, paddingBottom: 60, paddingHorizontal: 56, lineHeight: 1.5 },
  kopf: { position: 'absolute', top: 24, left: 56, right: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { width: 110, height: 110 / 7.87 },                         // Proportion 7,87 : 1 — nie unabhängig setzen
  kopfText: { fontSize: 8, letterSpacing: 1.2, color: GRAU, textTransform: 'uppercase' },
  fuss: { position: 'absolute', bottom: 24, left: 56, right: 56, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: GRAU },
  eyebrow: { fontSize: 8.5, letterSpacing: 1.6, color: O, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 },
  h1: { fontSize: 22, fontWeight: 600, marginBottom: 14, lineHeight: 1.2 },
  h2: { fontSize: 13, fontWeight: 600, marginTop: 14, marginBottom: 4 },
  absatz: { marginBottom: 8, fontWeight: 300 },
  frage: { fontSize: 8.5, letterSpacing: 0.8, color: GRAU, textTransform: 'uppercase', fontWeight: 500, marginTop: 10 },
  antwort: { marginTop: 2, marginBottom: 6, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: LINIE },
  leer: { color: GRAU, fontStyle: 'italic' },
  zeile: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: LINIE, paddingVertical: 4 },
  zelleText: { flex: 1 }, zelleWert: { width: 40, textAlign: 'right', fontWeight: 600 },
  summe: { flexDirection: 'row', backgroundColor: '#FDEBD9', paddingVertical: 6, paddingHorizontal: 6, marginTop: 4, fontWeight: 600 },
  deck: { backgroundColor: BLAU, color: '#FFFFFF', padding: 56, justifyContent: 'space-between' },
});

function Rahmen({ children, kopf, seite }: { children: React.ReactNode; kopf: string; seite?: boolean }) {
  return (
    <Page size="A4" style={st.seite} wrap>
      <View style={st.kopf} fixed><Image src={pub('logo-full.png')} style={st.logo} /><Text style={st.kopfText}>{kopf}</Text></View>
      {children}
      <View style={st.fuss} fixed><Text>Copyright © {new Date().getFullYear()} · Jörg Roos</Text><Text render={({ pageNumber }) => `Seite ${pageNumber}`} /></View>
    </Page>
  );
}
function Absaetze({ text }: { text: string }) {
  return <>{text.split(/\n\n+/).map((a, i) => {
    const [erste, ...rest] = a.split('\n');
    const istTitel = rest.length > 0 && erste.length < 60 && !/[.!?:]$/.test(erste);
    return istTitel ? <View key={i}><Text style={st.h2}>{erste}</Text><Text style={st.absatz}>{rest.join('\n')}</Text></View> : <Text key={i} style={st.absatz}>{a}</Text>;
  })}</>;
}
function Antwort({ frage, wert }: { frage: SnapshotFrage; wert: unknown }) {
  if (frage.typ === 'tabelle' && frage.optionen) {
    const t = (wert ?? {}) as TabellenWert;
    return <View style={st.antwort}>
      <View style={st.zeile}><Text style={st.zelleText} /> {frage.optionen.spalten.map((s) => <Text key={s} style={{ width: 90, textAlign: 'right', fontWeight: 500 }}>{s}</Text>)}</View>
      {frage.optionen.zeilen.map((z) => <View key={z} style={st.zeile}><Text style={st.zelleText}>{z}</Text>{frage.optionen!.spalten.map((s) => <Text key={s} style={{ width: 90, textAlign: 'right' }}>{t[z]?.[s] ?? '–'}</Text>)}</View>)}
    </View>;
  }
  const s = wert === undefined || wert === '' ? '' : String(wert);
  return <Text style={[st.antwort, ...(s ? [] : [st.leer])]}>{s || '– keine Antwort –'}</Text>;
}

export function Workbook({ s, texte }: { s: Sitzung; texte: Record<string, string> }) {
  const t = (k: string) => (texte[k] ?? '').replace(/\{vorname\}/g, s.vorname);
  const kapitel = s.fragen_snapshot.kapitel;
  const punkte = punkteJeFaktor(s.fragen_snapshot, s.antworten);
  const datum = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  return (
    <Document title={`360° Business-Analyse · Workbook · ${s.vorname} ${s.nachname}`} author="Jörg Roos" language="de">
      <Page size="A4" style={[st.seite, st.deck]}>
        <Image src={pub('logo-full-white.png')} style={{ width: 160, height: 160 / 7.87 }} />
        <View><Text style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.15 }}>360°{'\n'}BUSINESS-ANALYSE</Text><Text style={{ fontSize: 16, color: O, marginTop: 10 }}>Das Workbook</Text></View>
        <View><Text style={{ fontSize: 14, fontWeight: 500 }}>{s.vorname} {s.nachname}</Text><Text style={{ fontSize: 12, color: '#C9CFD3' }}>{s.firma}</Text><Text style={{ fontSize: 10, color: '#C9CFD3', marginTop: 6 }}>{datum}</Text><Text style={{ fontSize: 10, color: O, marginTop: 20 }}>{t('claim')}</Text></View>
      </Page>
      <Rahmen kopf="Willkommen"><Text style={st.eyebrow}>Schön, dass du dabei bist</Text><Text style={st.h1}>Hallo {s.vorname}</Text><Absaetze text={t('willkommen_text')} /></Rahmen>
      <Rahmen kopf="Bestandteile"><Text style={st.h1}>{t('bestandteile_titel')}</Text><Absaetze text={t('bestandteile_text')} /></Rahmen>
      <Rahmen kopf="Finanzcheck"><Text style={st.h1}>{t('finanzcheck_titel')}</Text><Absaetze text={t('finanzcheck_text')} />
        <Text style={st.h2}>Benötigte Unterlagen</Text>{t('finanzcheck_liste').split('\n').map((z, i) => <View key={i} style={{ flexDirection: 'row', marginBottom: 4 }}><Text style={{ color: O, width: 14 }}>■</Text><Text style={{ flex: 1, fontWeight: 300 }}>{z}</Text></View>)}
        <Text style={[st.absatz, { marginTop: 10, fontWeight: 500 }]}>{t('finanzcheck_uebermittlung')}</Text></Rahmen>
      {kapitel.filter((k) => k.typ === 'fakten').map((k) => (
        <Rahmen key={k.id} kopf={k.titel}><Text style={st.eyebrow}>{k.untertitel}</Text><Text style={st.h1}>{k.titel}</Text>
          {k.fragen.map((f) => <View key={f.id} wrap={false}><Text style={st.frage}>{f.text}</Text><Antwort frage={f} wert={s.antworten[f.id]} /></View>)}</Rahmen>
      ))}
      <Rahmen kopf="Erfolgsfaktoren"><Text style={st.h1}>{t('faktoren_titel')}</Text><Absaetze text={t('faktoren_einleitung')} />
        {kapitel.filter((k) => k.typ === 'faktor').map((k) => <View key={k.id} style={{ marginTop: 8 }}><Text style={st.h2}>{k.titel}</Text><Text style={st.absatz}>{k.einleitung}</Text></View>)}</Rahmen>
      {kapitel.filter((k) => k.typ === 'faktor').map((k, i) => {
        const p = punkte.find((x) => x.kapitelId === k.id);
        return <Rahmen key={k.id} kopf={`Erfolgsfaktor ${i + 1}`}><Text style={st.eyebrow}>{k.untertitel}</Text><Text style={st.h1}>{k.titel}</Text><Text style={st.absatz}>{k.einleitung}</Text>
          <View style={[st.zeile, { borderBottomWidth: 1, borderBottomColor: BLAU }]}><Text style={[st.zelleText, { fontWeight: 600 }]}>Aussage</Text><Text style={[st.zelleWert, { color: GRAU, fontWeight: 500 }]}>1–10</Text></View>
          {k.fragen.map((f, j) => <View key={f.id} style={st.zeile} wrap={false}><Text style={{ width: 18, color: GRAU }}>{j + 1}</Text><Text style={st.zelleText}>{f.text}</Text><Text style={st.zelleWert}>{typeof s.antworten[f.id] === 'number' ? String(s.antworten[f.id]) : '–'}</Text></View>)}
          {p && <View style={st.summe}><Text style={{ flex: 1 }}>Gesamtpunkte</Text><Text>{p.summe} von {p.maximum}</Text></View>}</Rahmen>;
      })}
      <Rahmen kopf="Dein Ergebnis"><Text style={st.eyebrow}>Ergebnis</Text><Text style={st.h1}>{t('ergebnis_titel')}</Text><Text style={st.absatz}>{t('ergebnis_text')}</Text>
        <View style={{ alignItems: 'center', marginVertical: 8 }}><ErfolgsradPdf werte={punkte} groesse={400} /></View>
        {punkte.map((p) => <View key={p.kapitelId} style={st.zeile}><Text style={st.zelleText}>{p.titel}</Text><View style={{ width: 160, height: 5, backgroundColor: '#EEEEEE', marginHorizontal: 10, marginTop: 5 }}><View style={{ width: `${p.punkte}%`, height: 5, backgroundColor: O }} /></View><Text style={st.zelleWert}>{p.punkte}</Text></View>)}
        <Text style={[st.absatz, { marginTop: 12 }]}>{t('ergebnis_fazit')}</Text></Rahmen>
      <Rahmen kopf="Aha-Momente"><Text style={st.eyebrow}>{t('aha_titel')}</Text><Text style={st.h1}>{t('aha_frage')}</Text><Text style={st.absatz}>{t('aha_text')}</Text>
        <View style={{ borderLeftWidth: 3, borderLeftColor: O, paddingLeft: 12, marginTop: 10 }}><Text style={s.aha ? {} : st.leer}>{s.aha || '– noch nicht festgehalten –'}</Text></View></Rahmen>
      <Rahmen kopf="Über Jörg"><View style={{ flexDirection: 'row', gap: 18 }}><View style={{ flex: 1 }}><Text style={st.eyebrow}>Finanzen im Fokus</Text><Text style={st.h1}>{t('ueber_titel')}</Text><Absaetze text={t('ueber_text')} /><Text style={{ color: O, fontWeight: 500 }}>{t('ueber_web')}</Text></View><Image src={pub('joerg.jpg')} style={{ width: 150, height: 225, borderRadius: 6 }} /></View>
        <Text style={{ marginTop: 30, fontSize: 9, color: GRAU, textAlign: 'center' }}>{t('kontakt')}</Text></Rahmen>
    </Document>
  );
}
```
Für das Deckblatt wird zusätzlich `public/logo-full-white.png` gebraucht: `cp "$A/JOERGROOS-Logo-Full-white.png" public/logo-full-white.png` (react-pdf rendert PNG zuverlässig, SVG-Logos nicht). Das Foto `joerg.jpg` ist 609×914, Verhältnis 2:3 → 150×225.

- [ ] **Step 4: Prüfskript**

`docs/beispiel/musterdaten.json`: eine vollständige Sitzung (aus `GET /api/w/<token>` einer Test-Sitzung abgespeichert, plus `vorname/nachname/firma/email/aha`). `scripts/check-pdf.mjs`:
```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const { pdfErzeugen } = await import('../lib/pdf/render.ts');
const texte = JSON.parse(readFileSync('data/texte-seed.json', 'utf8'));
const s = JSON.parse(readFileSync('docs/beispiel/musterdaten.json', 'utf8'));
const t0 = Date.now();
const buf = await pdfErzeugen(s, texte);
mkdirSync('docs/beispiel', { recursive: true });
writeFileSync('docs/beispiel/beispiel.pdf', buf);
if (buf.length < 100_000) throw new Error(`PDF zu klein: ${buf.length}`);
const seiten = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
if (seiten < 14) throw new Error(`zu wenig Seiten: ${seiten}`);
console.log(`ok · ${seiten} Seiten · ${Math.round(buf.length / 1024)} KB · ${Date.now() - t0} ms`);
```
Run: `node --experimental-strip-types scripts/check-pdf.mjs`. Falls die TSX-Dateien mit `--experimental-strip-types` nicht laufen (JSX), stattdessen eine kleine API-Route `GET /api/admin/sitzungen/[id]/pdf?vorschau=1` (Task 10) nutzen und die Datei aus dem Browser prüfen; das Skript dann auf `fetch` gegen den Dev-Server umstellen. Sichtprüfung `docs/beispiel/beispiel.pdf`: Logo-Proportion, Umbrüche, Erfolgsrad mit sieben Segmenten, Umlaute, Seitenzahlen.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: PDF-Workbook mit react-pdf, Erfolgsrad und Muster-Prüfung"
```

---

### Task 9: Abschluss — PDF ablegen, Mails, Fertig-Seite

**Files:**
- Create: `app/api/w/[token]/abschluss/route.ts`, `app/api/w/[token]/pdf/route.ts`, `app/w/[token]/fertig/page.tsx`, `lib/abschluss.ts`

**Interfaces:**
- Produces: `abschliessen(s: Sitzung): Promise<{ pfad: string }>` (idempotent) · `signierteAdresse(pfad: string): Promise<string>` · `POST /api/w/[token]/abschluss` → `{ ok: true }` · `GET /api/w/[token]/pdf` → `{ url }`.

- [ ] **Step 1: lib/abschluss.ts**

```ts
import { db, type Sitzung } from './db';
import { texteLaden, fuelle } from './texte';
import { pdfErzeugen, pdfDateiname } from './pdf/render';
import { sendeMail, INTERN } from './mail';
import { linkFuer } from './sitzung';

export async function signierteAdresse(pfad: string): Promise<string> {
  const { data, error } = await db.storage.from('workbooks').createSignedUrl(pfad, 3600);
  if (error || !data) throw error ?? new Error('Keine Adresse');
  return data.signedUrl;
}

// Idempotent: liegt die PDF schon, wird sie nicht neu erzeugt und nicht erneut verschickt.
export async function abschliessen(s: Sitzung, neuErzeugen = false): Promise<{ pfad: string }> {
  if (s.pdf_path && s.status === 'abgeschlossen' && !neuErzeugen) return { pfad: s.pdf_path };
  const texte = await texteLaden();
  const pdf = await pdfErzeugen(s, texte);
  const dateiname = pdfDateiname(s);
  const pfad = `${s.id}/${dateiname}`;
  const { error: eUp } = await db.storage.from('workbooks').upload(pfad, pdf, { contentType: 'application/pdf', upsert: true });
  if (eUp) throw eUp;
  const { error: eDb } = await db.from('wb_sessions').update({ pdf_path: pfad, status: 'abgeschlossen', abgeschlossen_at: s.abgeschlossen_at ?? new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', s.id);
  if (eDb) throw eDb;
  if (!neuErzeugen) {
    const werte = { vorname: s.vorname, nachname: s.nachname, firma: s.firma, email: s.email, telefon: s.telefon, link: linkFuer(s) };
    await sendeMail({ an: [s.email], betreff: fuelle(texte.mail_fertig_betreff, werte), text: fuelle(texte.mail_fertig_text, werte), anhang: { dateiname, inhalt: pdf } });
    if (!s.test) await sendeMail({ an: [INTERN], betreff: `Workbook 360° BA · ${s.vorname} ${s.nachname} · ${s.firma}`, text: fuelle(texte.mail_intern_text, werte), anhang: { dateiname, inhalt: pdf } });
  }
  return { pfad };
}
```

- [ ] **Step 2: Routen**

`abschluss/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { sitzungLaden } from '@/lib/sitzung';
import { abschliessen } from '@/lib/abschluss';
import { punkteJeFaktor } from '@/lib/punkte';
export const maxDuration = 60;
export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) return NextResponse.json({ error: 'Link ungültig' }, { status: 404 });
  const offen = punkteJeFaktor(s.fragen_snapshot, s.antworten).some((p) => s.fragen_snapshot.kapitel.find((k) => k.id === p.kapitelId)!.fragen.some((f) => f.typ === 'skala' && typeof s.antworten[f.id] !== 'number'));
  if (offen) return NextResponse.json({ error: 'Es fehlen noch Aussagen.' }, { status: 400 });
  try { await abschliessen(s); return NextResponse.json({ ok: true }); }
  catch (e) { console.error('[abschluss]', e); return NextResponse.json({ error: 'Wir konnten dein Workbook gerade nicht erstellen. Deine Antworten sind sicher. Bitte in einer Minute erneut versuchen.' }, { status: 500 }); }
}
```
`pdf/route.ts`: Sitzung laden, nur bei `abgeschlossen` und `pdf_path` → `{ url: await signierteAdresse(pfad) }`, sonst 404.

- [ ] **Step 3: Fertig-Seite**

`app/w/[token]/fertig/page.tsx` (Server): Sitzung laden; nicht `abgeschlossen` → redirect `ergebnis`. Inhalt: Eyebrow „Fertig“, Überschrift „Dein Workbook ist unterwegs, {vorname}.“, Text „Du bekommst es in den nächsten Minuten per E-Mail an {email}. Jörg hat dieselbe Fassung und bereitet damit euren gemeinsamen Tag vor. Denk an deine Finanzdaten für den Finanzcheck – spätestens vier Arbeitstage vor dem Treffen an controlling@joerg-roos.com.“, Knopf „Workbook jetzt herunterladen“ → Client-Komponente ruft `GET /api/w/[token]/pdf` und öffnet `url`. Kleiner Erfolgsrad-Ausschnitt (`ErfolgsradSvg`, 260 px) darüber.

- [ ] **Step 4: End-zu-End-Prüfung**

Test-Sitzung komplett: Abschluss klicken → Fertig-Seite in unter 60 s, zwei Mails (Kunde mit Anhang, controlling@ — bei `test:true` keine interne Mail), Storage-Bucket enthält `<id>/360BA-Workbook-….pdf`, `GET pdf` liefert öffnende Adresse, zweiter `POST abschluss` erzeugt keine zweite Mail. Interview-Link nach Abschluss leitet auf `fertig`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: Abschluss — PDF ablegen, Mails an Kunde und controlling@, Fertig-Seite"
```

---

### Task 10: Admin — Anmeldung, Fragebogen, Texte, Workbooks

**Files:**
- Create: `lib/admin-auth.ts`, `app/api/admin/login/route.ts`, `app/api/admin/logout/route.ts`, `app/api/admin/kapitel/route.ts`, `app/api/admin/kapitel/[id]/route.ts`, `app/api/admin/fragen/route.ts`, `app/api/admin/fragen/[id]/route.ts`, `app/api/admin/texte/route.ts`, `app/api/admin/sitzungen/route.ts`, `app/api/admin/sitzungen/[id]/route.ts`, `app/api/admin/sitzungen/[id]/pdf/route.ts`, `app/api/admin/sitzungen/[id]/link/route.ts`, `app/admin/page.tsx`, `components/admin/Fragebogen.tsx`, `components/admin/Texte.tsx`, `components/admin/Sitzungen.tsx`

**Interfaces:**
- Produces: `adminGeprueft(req: Request): boolean` · Cookie `wb_admin` = `<ablauf>.<hmac>` · JSON-APIs:
  - `GET kapitel` → `{ kapitel: Kapitel[], fragen: Frage[] }` · `POST kapitel` `{titel, untertitel, einleitung, typ}` · `PUT kapitel/[id]` beliebige Felder + `{ richtung?: 'hoch'|'runter' }` · `DELETE kapitel/[id]` (nur ohne Fragen).
  - `POST fragen` `{chapter_id, text, hinweis, typ, optionen}` · `PUT fragen/[id]` Felder + `richtung` · `DELETE fragen/[id]`.
  - `GET texte` → `Record<string,string>` · `PUT texte` `{ key, wert }`.
  - `GET sitzungen` → Liste ohne Snapshot/Antworten (`id, vorname, nachname, firma, email, status, test, created_at, abgeschlossen_at, prozent`) · `GET sitzungen/[id]` → volle Sitzung · `DELETE sitzungen/[id]` (löscht auch PDF) · `POST sitzungen/[id]/pdf` (neu erzeugen, keine Mail) → `{ url }` · `GET sitzungen/[id]/pdf` → `{ url }` · `POST sitzungen/[id]/link` (Link-Mail erneut) · `POST sitzungen` `{ test: true }` legt Test-Sitzung mit Jörgs Daten an → `{ link }`.

- [ ] **Step 1: lib/admin-auth.ts**

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';
import { bremse, aufruferIp } from './bremse';

const COOKIE = 'wb_admin';
const DAUER_S = 12 * 3600;
function geheim() { const p = process.env.ADMIN_PASSWORD; if (!p) throw new Error('ADMIN_PASSWORD fehlt'); return p; }
function sig(ablauf: string) { return createHmac('sha256', geheim()).update(ablauf).digest('base64url'); }

export function gleichOhneZeitverrat(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function cookieWert(): string { const ablauf = String(Date.now() + DAUER_S * 1000); return `${ablauf}.${sig(ablauf)}`; }
export function cookieKopf(wert: string, loeschen = false): string {
  return `${COOKIE}=${loeschen ? '' : wert}; Path=/; HttpOnly; SameSite=Lax; ${process.env.APP_URL?.startsWith('https') ? 'Secure; ' : ''}Max-Age=${loeschen ? 0 : DAUER_S}`;
}
export function adminGeprueft(req: Request): boolean {
  const roh = (req.headers.get('cookie') ?? '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!roh) return false;
  const [ablauf, s] = roh.split('.');
  if (!ablauf || !s || Number(ablauf) < Date.now()) return false;
  return gleichOhneZeitverrat(s, sig(ablauf));
}
export function loginErlaubt(req: Request): boolean { return bremse(`admin:${aufruferIp(req)}`, 10, 3600); }
```
Login-Route: `POST { passwort }` → Bremse prüfen, `gleichOhneZeitverrat(passwort, ADMIN_PASSWORD)` → `Set-Cookie: cookieKopf(cookieWert())`, sonst 401. Logout: `Set-Cookie` mit `loeschen`. Jede `api/admin/*`-Route beginnt mit `if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });`.

- [ ] **Step 2: Kapitel- und Fragen-Routen**

Muster `PUT kapitel/[id]`:
```ts
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminGeprueft(req)) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  const { id } = await params; const b = await req.json();
  if (b.richtung) {
    const { data: alle } = await db.from('wb_chapters').select('id,position').order('position');
    const i = alle!.findIndex((k) => k.id === id); const j = b.richtung === 'hoch' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= alle!.length) return NextResponse.json({ ok: true });
    await db.from('wb_chapters').update({ position: alle![j].position }).eq('id', id);
    await db.from('wb_chapters').update({ position: alle![i].position }).eq('id', alle![j].id);
    return NextResponse.json({ ok: true });
  }
  const erlaubt = ['titel', 'untertitel', 'einleitung', 'typ', 'aktiv'] as const;
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of erlaubt) if (k in b) upd[k] = b[k];
  if (upd.typ && !['fakten', 'faktor'].includes(upd.typ as string)) return NextResponse.json({ error: 'Typ' }, { status: 400 });
  const { error } = await db.from('wb_chapters').update(upd).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```
Fragen-Routen gleich, Positionen innerhalb des Kapitels (`eq('chapter_id', …)`), erlaubte Felder `text, hinweis, typ, optionen, aktiv`, Typ-Prüfung `['text','skala','tabelle']`, bei `tabelle` müssen `optionen.zeilen` und `optionen.spalten` nicht-leere String-Listen sein. `POST` setzt `position = max + 1`. `DELETE kapitel/[id]` antwortet 409 „Kapitel hat noch Fragen“, wenn Fragen existieren.

- [ ] **Step 3: Sitzungs-Routen**

`GET sitzungen`: `select('id,vorname,nachname,firma,email,status,test,created_at,abgeschlossen_at,fragen_snapshot,antworten')` absteigend nach `created_at`, `prozent` mit `fortschritt()` rechnen und Snapshot/Antworten aus der Antwort entfernen. `DELETE`: erst `db.storage.from('workbooks').remove([pdf_path])` falls vorhanden, dann Datensatz löschen. `POST sitzungen/[id]/pdf`: `abschliessen(s, true)` und `signierteAdresse`. `POST sitzungen` mit `{test:true}`: `sitzungAnlegen({ vorname:'Jörg', nachname:'Test', firma:'JOERG ROOS', telefon:'', email: <ADMIN_TEST_EMAIL oder 'office@joerg-roos.com'> }, true)`; Link-Mail schicken, `{ link }` zurück.

- [ ] **Step 4: Admin-Oberfläche**

`app/admin/page.tsx` (`'use client'`): Zustand `angemeldet` (Probe-`GET /api/admin/texte` → 401 heißt nicht angemeldet). Login-Karte: Passwortfeld, „Anmelden“. Danach Layout wie `docs/mockup/index.html#admin`: linke Leiste mit Logo, Bereichen „Fragebogen · Workbooks · Texte · Vorschau als Kunde“ und Kapitel-Liste mit Fragenzahl und „+ Neues Kapitel“; Hauptbereich je Bereich; rechte Spalte (420 px) als Bearbeitungsformular, wenn eine Frage oder ein Kapitel gewählt ist.

`components/admin/Fragebogen.tsx`: lädt `GET kapitel`; Kopfkennzahlen (Fragen aktiv, Kapitel); Kapitel-Kopf mit Titel, Badge (`Skala 1–10 · fließt ins Erfolgsrad` bei `faktor`), Links „Kapitel bearbeiten“, „+ Neue Frage“; Fragen-Zeilen mit Pfeilen ↑↓ (statt Griff), Fragetext, Typ-Badge, Aktiv-Schalter, „Bearbeiten“. Rechte Spalte Frage: Fragetext (Textarea), Hinweis, Antwort-Typ als Segment-Knöpfe (Freitext · Skala 1–10 · Tabelle), bei Tabelle zwei Felder „Zeilen (eine je Zeile)“ und „Spalten (eine je Zeile)“ mit Platzhalter-Hinweis `{jahr-1}`, Aktiv-Schalter, Speichern/Abbrechen/Löschen, Satz „Änderungen gelten für neue Interviews. Laufende Interviews behalten ihren Fragestand.“ Rechte Spalte Kapitel: Titel, Untertitel, Einleitung, Typ (Fakten · Erfolgsfaktor), Aktiv, Löschen (nur ohne Fragen). Nach jeder Änderung Liste neu laden.

`components/admin/Texte.tsx`: `GET texte`, je Schlüssel eine Karte mit lesbarem Namen (Tabelle im Code: `start_text: 'Start · Einleitung'`, `willkommen_text: 'PDF · Schön, dass du dabei bist'`, … alle 27 Schlüssel), Textarea, „Speichern“ je Feld (`PUT texte`). Hinweis oben: Platzhalter `{vorname}`, `{link}`, `{firma}` … bleiben stehen.

`components/admin/Sitzungen.tsx`: Tabelle (Name, Firma, Datum, Status-Badge `PDF versandt` grün / `In Arbeit · x %` / `Ergebnis offen`, Test-Markierung), Aktionen „Antworten“ (Ausklappen mit allen Fragen/Antworten aus `GET sitzungen/[id]`), „PDF öffnen“, „PDF neu erzeugen“, „Link erneut senden“, „Löschen“ (mit `confirm`). Knopf „Vorschau als Kunde“ → `POST sitzungen {test:true}` und Link in neuem Tab.

- [ ] **Step 5: Prüfung**

Login mit falschem Passwort → Fehlermeldung, mit richtigem → Admin. Frage anlegen (Entwurf, inaktiv), Test-Sitzung starten: Frage fehlt im Interview. Frage aktivieren, neue Test-Sitzung: Frage da; alte Sitzung unverändert. Kapitel verschieben, Text ändern, „PDF neu erzeugen“ zeigt den geänderten Text. Sitzung löschen entfernt PDF im Bucket. Abgemeldet → `GET /api/admin/kapitel` 401.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: Admin — Anmeldung, Fragebogen, Texte, Workbooks"
```

---

### Task 11: Feinschliff, Datenschutz, Deployment

**Files:**
- Create: `docs/deployment.md`, `docs/datenschutz-absatz.md`, `app/not-found.tsx`
- Modify: `CLAUDE.md`, `app/layout.tsx` (Favicon/Emblem), `README` in `supabase/`

- [ ] **Step 1: Mobil-Prüfung**

Dev-Server, Browser auf 390 px Breite: Start-Formular einspaltig, Skala zwei Reihen à fünf, Kapitel-Beschriftungen ausgeblendet (`hidden md:block`), Textfeld mit Mikro nutzbar, Ergebnis einspaltig (Rad oben, Karten darunter — `grid-cols-1 lg:grid-cols-2`). Fehler beheben.

- [ ] **Step 2: Sprach- und Grammatik-Prüfung**

`python3 "/Users/joergroos/Library/CloudStorage/SynologyDrive-AI-BUSINSESS-OS/01-CoWork/01-ATLAS/team/tools/grammatik-check.py" data/texte-seed.json docs/beispiel/beispiel.pdf` — falls das Werkzeug JSON nicht liest, Texte vorher nach `.md` ausgeben. `node scripts/check-seed.mjs` (verbotene Wörter) erneut.

- [ ] **Step 3: Datenschutz-Absatz**

`docs/datenschutz-absatz.md` — Textvorschlag für joerg-roos.com/datenschutz: Zweck (Vorbereitung 360° Business-Analyse), Daten (Kontaktdaten, Antworten), Speicherort (Supabase, EU; Vercel, Frankfurt), Sprachaufnahmen (Übertragung an OpenAI zur Umwandlung, keine Speicherung, keine Trainingsnutzung), Glättung (Anthropic), E-Mail-Versand (Resend), Speicherdauer (bis Abschluss der Zusammenarbeit, Löschung auf Anfrage an office@joerg-roos.com), Rechtsgrundlage Art. 6 Abs. 1 b DSGVO. Normale Prosa, Du-Form wie die übrige Datenschutzerklärung nicht — hier Sie-Form ist bei Rechtstexten zulässig; Jörg entscheidet.

- [ ] **Step 4: Deployment-Anleitung**

`docs/deployment.md`:
1. GitHub-Repo `JOERGROOS/360BA-WORKBOOK` (privat) anlegen, `git push -u origin main`.
2. Vercel → „Add New Project“ → Repo wählen → Framework Next.js → Region über `vercel.json`:
   ```json
   { "framework": "nextjs", "regions": ["fra1"] }
   ```
   (Datei ins Repo.)
3. Umgebungsvariablen in Vercel (Production): die sieben aus `.env.example`, `APP_URL=https://workbook.joerg-roos.com`.
4. Domain `workbook.joerg-roos.com` in Vercel hinzufügen, CNAME beim DNS-Anbieter auf `cname.vercel-dns.com`.
5. Nach dem ersten Deploy: `/admin` öffnen, Test-Sitzung, kompletter Durchlauf, PDF prüfen, beide Mails prüfen.
6. Resend: Absender `noreply@joerg-roos.com` ist verifiziert (JOERG AI). Nichts zu tun.
7. Supabase: Migration ist eingespielt (Task 2); Bucket `workbooks` existiert.

- [ ] **Step 5: CLAUDE.md und Memory**

`CLAUDE.md` ergänzen: Stand, Routen-Übersicht, „so testet man“ (sync-lokal, Dev-Server, Test-Sitzung im Admin), bekannte Grenzen (Bremse im Modulspeicher, Positionen per Pfeil). In `01-CoWork/01-ATLAS/memory/sessions/latest-updates.md` einen Eintrag „360BA Online-Workbook gebaut, Stand, offene Jörg-Schritte“.

- [ ] **Step 6: Commit und Push**

```bash
git add -A && git commit -m "feat: Deployment-Anleitung, Datenschutz-Absatz, Mobil-Feinschliff" && git push
```

---

## Selbstprüfung gegen die Spec

- Spec 3 Ablauf: Task 4 (Start, Link), 5 (Interview, Typen, Einleitungen, Zurück), 7 (Ergebnis, Aha, Rückfrage), 9 (Abschluss, Fertig). ✓
- Spec 4 Sprache: Task 6 (MediaRecorder, 5 Minuten, Whisper, Glättung, Fehlerfall, kein Speichern, Hinweis beim ersten Klick). ✓
- Spec 5 Punkte/Rad: Task 3 (Normierung, Reihenfolge, geteilte Geometrie). ✓
- Spec 6 PDF: Task 8 (alle zehn Seitenblöcke, Texte aus `wb_texte`, Logo-Proportion, Storage in Task 9). ✓
- Spec 7 Mail: Task 4 (Link), 9 (fertig, intern, Test ohne intern), 10 (Link erneut aus Admin). ✓
- Spec 8 Admin: Task 10 (drei Bereiche, Vorschau als Kunde, Snapshot-Regel). ✓
- Spec 9/10 Datenmodell, Routen: Task 2, 4, 5, 6, 9, 10. ✓
- Spec 12 Datenschutz: Task 6 Hinweis, 10 Löschen, 11 Absatz. ✓
- Spec 13 Fehler: Task 5 (Speichern), 6 (Transkription), 9 (Abschluss), 5 (ungültiger Link). ✓
- Spec 14 Prüfung: check-seed (2), check-punkte/geometrie (3), check-glaettung (6), check-pdf (8), Browser-Durchläufe je Task. ✓
- Typen: `Faktorwert`, `FlacheFrage`, `RadGeometrie`, `Sitzung`, `Antwort`, `TabellenWert` überall gleich benannt; `antwortSpeichern(token, frageId, wert, position)` in Task 4, 5, 7 identisch; `abschliessen(s, neuErzeugen)` in Task 9 und 10 identisch. ✓
