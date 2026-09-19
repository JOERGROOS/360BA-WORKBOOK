-- Finanzdaten-Upload: Metadaten je hochgeladener Datei + privater Speicherbereich ("Bucket").
create table if not exists wb_dateien (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references wb_sessions(id) on delete cascade,
  dateiname text not null, pfad text not null unique, bytes bigint not null, content_type text not null,
  created_at timestamptz default now(), abgeholt_at timestamptz
);
create index if not exists wb_dateien_session on wb_dateien(session_id);
alter table wb_dateien enable row level security;
revoke all on wb_dateien from anon, authenticated;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('finanzdaten', 'finanzdaten', false, 52428800, array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint'
])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
