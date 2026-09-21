-- Unterlagen-Checkliste je Kunde: Welche Finanzunterlagen hat er schon geschickt?
-- Der Kunde hakt sie im Fenster „Welche Unterlagen brauchen wir?" selbst ab, Jörg sieht
-- den Stand im Admin in der Kunden-Kachel. Aufbau: { "<punkt-id>": true, ... } — nur die
-- Kennungen aus lib/checkliste.ts, alles andere weist die Route ab.
alter table wb_sessions add column if not exists checkliste jsonb not null default '{}'::jsonb;
