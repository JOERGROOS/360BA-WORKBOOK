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
