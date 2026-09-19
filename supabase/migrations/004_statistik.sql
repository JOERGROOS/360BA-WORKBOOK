-- Admin-Übersicht mit Statistik: Start- und Diktat-Zeitpunkt je Sitzung.
alter table wb_sessions add column if not exists gestartet_at timestamptz;
alter table wb_sessions add column if not exists diktate int not null default 0;
