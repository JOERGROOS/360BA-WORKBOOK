-- Row Level Security auf allen wb_-Tabellen: nur der Service-Role-Key (Server) darf lesen/schreiben,
-- anon/authenticated (Supabase-Standardrollen für Browser-Zugriff) kommen gar nicht mehr an die Tabellen ran.
alter table wb_sessions enable row level security;
alter table wb_chapters enable row level security;
alter table wb_questions enable row level security;
alter table wb_texte enable row level security;
revoke all on wb_sessions, wb_chapters, wb_questions, wb_texte from anon, authenticated;
