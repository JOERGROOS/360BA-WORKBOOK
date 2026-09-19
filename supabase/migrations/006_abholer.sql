-- Der Abholer bindet jede Zeile fest an ihren tatsächlich vergebenen lokalen Dateinamen
-- (bei Namenskonflikt mit Suffix `-2`, `-3`, …). Ohne das konnte der „schon vorhanden"-
-- Kurzschluss zwei verschiedene Zeilen mit gleichem Namen UND gleicher Größe verwechseln
-- und eine davon als abgeholt markieren, ohne sie je zu schreiben (stiller Verlust).
alter table wb_dateien add column if not exists lokaler_name text;
