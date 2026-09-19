-- Einladungslink: Sitzungen entstehen im Admin mit status 'eingeladen', bevor der Kunde startet.
alter table wb_sessions drop constraint if exists wb_sessions_status_check;
alter table wb_sessions add constraint wb_sessions_status_check check (status in ('eingeladen','laufend','ergebnis','abgeschlossen'));
