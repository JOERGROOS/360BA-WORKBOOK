-- Management Summary: Speicherplatz für die erzeugte Word-Datei je Sitzung, damit sie auch im
-- Admin (neben dem Kunden-PDF) heruntergeladen werden kann — nicht nur per Mail unterwegs.
alter table wb_sessions add column if not exists management_summary_path text;
insert into storage.buckets (id, name, public) values ('management-summaries','management-summaries',false) on conflict (id) do nothing;
