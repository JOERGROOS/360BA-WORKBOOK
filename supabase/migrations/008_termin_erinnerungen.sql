-- Termin vor Ort + Erinnerungs-Sequenz (14/10/7 Tage vorher).
alter table wb_sessions add column if not exists termin_am date;
alter table wb_sessions add column if not exists erinnerung_14_gesendet_at timestamptz;
alter table wb_sessions add column if not exists erinnerung_10_gesendet_at timestamptz;
alter table wb_sessions add column if not exists erinnerung_7_gesendet_at timestamptz;
