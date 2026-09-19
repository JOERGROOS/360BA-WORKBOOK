-- Signal für "Auf meinen Mac abholen": Admin klickt den Knopf, das Feld bekommt einen
-- Zeitstempel, der Abholer (--nur-angefordert, alle 5 Minuten) holt die Dateien dieser
-- Sitzung und löscht das Signal danach wieder (null).
alter table wb_sessions add column if not exists abholen_angefordert timestamptz;
