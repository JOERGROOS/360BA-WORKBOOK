# 360° Business-Analyse · Online-Workbook — Design

Stand: 18.09.2026 · Entscheidungen von Jörg aus dem Chat vom selben Tag.
Quelle des Inhalts: `2026-360BA-Workbook.docx` (Textauszug in `docs/workbook-2026-quelltext.txt`).
Mockups: `docs/mockup/index.html` (`#start` · `#frage` · `#skala` · `#ergebnis` · `#admin`), Screenshots in `docs/mockup/shots/`.

## 1. Ziel

Das Word-Workbook, das Kunden vor dem gemeinsamen Tag der 360° Business-Analyse ausfüllen, wird eine Online-Anwendung im Interviewstil. Der Kunde beantwortet eine Frage nach der anderen, getippt oder eingesprochen. Am Ende sieht er sein Erfolgsrad, hält seine Aha-Momente fest und bekommt das fertige Workbook als PDF per E-Mail. Jörg bekommt dieselbe PDF an `controlling@joerg-roos.com`. Fragen, Kapitel und Texte pflegt Jörg in einem Admin-Bereich.

## 2. Entscheidungen (Jörg, 18.09.2026)

| Frage | Entscheidung |
|---|---|
| Sprache zu Text | OpenAI Whisper-Dienst (alle Browser, beste Qualität für Deutsch). Danach Glättung durch Claude. |
| Stack und Ablage | Eigene App, gleicher Stack wie JOERG AI: Next.js auf Vercel (Frankfurt), bestehendes Supabase-Projekt mit eigenen Tabellen, Resend, Anthropic-Key. Code im Ordner `04-360BA-Workbook/` auf dem Laufwerk, Repo `JOERGROOS/360BA-WORKBOOK` auf GitHub. |
| Look Kundenseite | Dunkel mit Orange (CI V3 Web-Standard), wie in den Mockups. Die PDF bleibt hell im Dokument-CI. |
| Inhalt | Erst 1:1 das heutige Word-Workbook. Ziele- und Organigramm-Fragen aus der Kickoff-Notiz kommen später über den Admin. |

## 3. Ablauf aus Kundensicht

1. **Start** (`/`): Vorname, Nachname, Firmenname, Telefon, E-Mail. Knopf „Interview starten“. Pflichtfelder, E-Mail wird geprüft. Datenschutz-Satz mit Link.
2. **Fortsetzungs-Link**: Sofort nach dem Start geht eine Mail an den Kunden mit seinem persönlichen Link (`/w/<token>`). Das Workbook dauert zwei bis drei Stunden, Pausen sind der Normalfall. Der Stand wird nach jeder Antwort gespeichert. Ein Knopf „Später weitermachen“ schickt den Link erneut.
3. **Interview** (`/w/<token>`): Eine Frage pro Bildschirm. Oben Fortschrittsbalken (Frage x von y, Prozent) und Kapitel-Leiste. Drei Fragetypen im Start-Inhalt:
   - **Freitext**: Textfeld plus Mikrofon-Knopf. Leertaste startet und stoppt die Aufnahme, Enter geht weiter. Antwort darf leer bleiben, dann Rückfrage „Ohne Antwort weiter?“.
   - **Skala 1–10**: Zehn Knöpfe, Zahl tippen geht auch (0 = 10). Nach der Auswahl automatisch weiter nach kurzer Pause. Pflicht.
   - **Tabelle**: Kleine Zahlen-Tabelle (Mitarbeiter: Vollzeit/Teilzeit/Minijob/Azubi × Dezember Vorvorjahr/Dezember Vorjahr/Aktuell). Spaltenköpfe werden aus dem aktuellen Jahr berechnet.
   Kapitel-Einleitungen (z. B. die Beschreibung eines Erfolgsfaktors) erscheinen als eigener Zwischenbildschirm vor der ersten Frage des Kapitels. Zurück ist jederzeit möglich, Antworten bleiben erhalten.
4. **Ergebnis** (`/w/<token>/ergebnis`): Erfolgsrad mit sieben Segmenten, Punktwerte je Erfolgsfaktor, darunter alle Fragen mit Antworten untereinander, jede mit „bearbeiten“ (springt zur Frage, kommt zurück). Danach die Aha-Frage: „Wenn du deine Antworten und dein Erfolgsrad jetzt so vor dir siehst – was fällt dir auf? Was überrascht dich, was bestätigt sich?“ (Freitext mit Mikrofon). Dann der Knopf „Ergebnis speichern & Workbook als PDF erhalten“ mit Rückfrage „Wollen wir dein Ergebnis so festhalten?“.
5. **Abschluss**: PDF wird erzeugt, per Mail an Kunde und `controlling@joerg-roos.com` verschickt, Bestätigungsseite mit Download-Link. Der Link bleibt gültig, Antworten sind danach nicht mehr änderbar (Status `abgeschlossen`). Weitere Änderungen laufen über Jörg.

## 4. Sprache zu Text

- Browser nimmt mit `MediaRecorder` auf (webm/opus, in Safari mp4/aac). Höchstens 5 Minuten je Aufnahme, danach automatischer Stopp.
- `POST /api/transkribieren` (multipart, Token-geprüft): Audio an OpenAI (`gpt-4o-mini-transcribe`, Sprache `de`), Rohtext zurück.
- **Glättung** durch Claude (`claude-haiku-4-5-20251001`, Temperatur 0): Der Rohtext wird in verständliches Schriftdeutsch gebracht. Regeln im Prompt: Ich-Perspektive behalten, Füllwörter und Versprecher raus, Sätze vollständig, nichts hinzufügen, nichts weglassen, was Inhalt trägt, keine Bewertung, Zahlen und Namen unverändert. Rückgabe nur der Text.
- Ergebnis wird an den vorhandenen Text im Feld angehängt. Der Kunde kann nachbessern.
- Audio wird nicht gespeichert. Nur der geglättete Text landet in der Antwort. Fehlerfall (Netz, Dienst nicht erreichbar): Hinweis „Aufnahme konnte nicht umgewandelt werden, bitte tippen oder erneut versuchen“, das Textfeld bleibt nutzbar.

## 5. Erfolgsrad und Punkte

- Jedes Kapitel vom Typ `faktor` bildet ein Segment. Punkte je Faktor = Summe der Skala-Antworten, normiert auf 100: `Summe / (Anzahl Skala-Fragen × 10) × 100`, gerundet. Bei den heutigen zehn Aussagen ist das die einfache Summe (10–100), genau wie im Word-Workbook.
- Reihenfolge der Segmente im Uhrzeigersinn ab 12 Uhr = Kapitel-Reihenfolge: Unternehmerpersönlichkeit · Finanzen & wirtschaftliche Lage · Ziele & Strategie · Leadership & Team · Fulfillment & Leistungserbringung · Marketing · Sales (Vertrieb).
- Darstellung: SVG, zehn Ringe (10–100), Segmentfüllung in Orange von der Mitte nach außen, Wert als Zahl im Segment, Name außen. Dieselbe SVG-Funktion rendert Web und PDF (hell/dunkel als Parameter).
- Unbeantwortete Skala-Fragen gibt es nicht (Pflichtfeld). Ein Kapitel ohne Skala-Fragen erscheint nicht im Rad.

## 6. PDF · das fertige Workbook

Erzeugt serverseitig mit `@react-pdf/renderer` (reines JavaScript, läuft in Vercel-Funktionen ohne Browser). Montserrat aus den CI-Assets eingebettet. Helles Dokument-CI: Weiß/Paper, Dunkelblau `#0F1B23` für Text, Orange `#ED7A02` als einziger Akzent, JR-Logo (Full, schwarz) im Kopf, Fußzeile „Copyright © 2026 · Jörg Roos“ mit Seitenzahl. Logo in Original-Proportion 7,87:1.

Seitenfolge, angelehnt an das Word-Workbook:

1. Deckblatt: „360° Business-Analyse · Das Workbook“, Name, Firma, Datum.
2. Schön, dass du dabei bist (Einleitung, persönliche Ansprache mit Vorname).
3. Bestandteile der 360° Business-Analyse (Vorbereitung · Gemeinsamer Tag · Nachbereitung).
4. Dein Finanzcheck (benötigte Unterlagen, Übermittlung an `controlling@joerg-roos.com`).
5. Ein paar Fakten zum Einstieg: jede Frage mit Antwort, Mitarbeiter-Tabelle, Steuerberater-Skala als Zahl.
6. Die 7 Erfolgsfaktoren: Einleitungsseite, dann je Faktor eine Seite mit Kurzbeschreibung, Tabelle „Aussage · Wert“ und Gesamtpunkten.
7. Dein Ergebnis: Erfolgsrad, Punktwerte, kurzer Fazit-Text.
8. Aha-Momente: die Antwort des Kunden.
9. Jörg Roos – dein Personal CFO: aktualisierter Text (Vita-Klammer 25+ Jahre CFO/Controller, Konzern-Stationen Medion · Deutsche Bank · Lenovo, heute Personal CFO für Handwerksunternehmer), Foto aus dem Word-Workbook.
10. Rückseite mit Kontakt (Zum Stadtgraben 5 · 45721 Haltern am See · joerg-roos.com).

Alle Texte der Seiten 2, 3, 4, 6 (Einleitung), 7 (Fazit) und 9 kommen aus der Tabelle `wb_texte` und sind im Admin änderbar. Die Startfassung wird aus dem Word-Workbook übernommen und an Brand Voice und Vita-Regeln angepasst (Du-Form, verbotene Wörter raus, „7 Erfolgsfaktoren“ statt der im Word-Text noch stehenden „zwölf“).

Ablage: Supabase Storage, privater Bucket `workbooks`, Pfad `<session-id>/360BA-Workbook-<Nachname>-<Datum>.pdf`. Download nur über signierte Adresse (1 Stunde gültig) für Kunde und Admin.

## 7. E-Mail

Über Resend, Absender `noreply@joerg-roos.com` (Domain ist bereits verifiziert, JOERG AI sendet darüber). Drei Mails:

| Mail | Empfänger | Inhalt |
|---|---|---|
| Fortsetzungs-Link | Kunde | Persönlicher Link, Hinweis auf Pausieren, Dauer. |
| Fertiges Workbook | Kunde und `controlling@joerg-roos.com` | Kurzer Text in Jörg-Stimme, PDF als Anhang, zusätzlich Download-Link. |
| Link erneut | Kunde | Auf Knopf des Kunden oder aus dem Admin. |

Mails in Du-Form, Jörg-Stimme, Brand-Voice-Regeln, HTML schlicht (Text, Logo, ein Knopf). Reply-To `office@joerg-roos.com`.

## 8. Admin-Bereich

`/admin`, Anmeldung mit `ADMIN_PASSWORD` (Cookie-Sitzung, 12 Stunden, Fehlversuche gebremst wie in JOERG AI). Drei Bereiche:

1. **Fragebogen**: Kapitel-Liste links, Fragen des gewählten Kapitels rechts. Kapitel anlegen (Titel, Untertitel, Einleitungstext, Typ `fakten` oder `faktor`), umbenennen, verschieben (hoch/runter), aktiv/inaktiv, löschen (nur wenn ohne Fragen). Fragen anlegen, bearbeiten (Fragetext, Hinweis, Typ, bei Tabelle Zeilen/Spalten), verschieben, aktiv/inaktiv, löschen. Entwürfe (inaktiv) erscheinen nicht im Interview.
2. **Texte**: Alle festen Texte aus Abschnitt 6 plus Start-Text, Aha-Frage und Mail-Texte. Ein Feld je Text, Speichern je Feld.
3. **Workbooks**: Liste aller Sitzungen (Name, Firma, E-Mail, Start, Fortschritt in Prozent, Status, Abschlussdatum). Je Zeile: Antworten ansehen, PDF öffnen (signierte Adresse), Link erneut senden, PDF neu erzeugen (nach Textänderung), Sitzung löschen (Datenschutz-Auskunft/-Löschung).
   Zusätzlich „Vorschau als Kunde“: startet eine Test-Sitzung, die als `test` markiert ist und keine Mail an controlling schickt.

Regel: Änderungen am Fragebogen gelten für neue Sitzungen. Laufende Sitzungen arbeiten mit ihrem Fragen-Snapshot weiter (siehe Datenmodell).

## 9. Datenmodell (Supabase, Präfix `wb_`)

```sql
wb_chapters   id uuid, position int, titel text, untertitel text, einleitung text,
              typ text check (typ in ('fakten','faktor')), aktiv bool, created_at, updated_at
wb_questions  id uuid, chapter_id uuid → wb_chapters, position int, text text, hinweis text,
              typ text check (typ in ('text','skala','tabelle')), optionen jsonb, aktiv bool, created_at, updated_at
wb_texte      key text primary key, wert text, updated_at
wb_sessions   id uuid, token text unique (32 Byte zufällig, base64url), vorname, nachname, firma, telefon, email,
              status text check (status in ('laufend','ergebnis','abgeschlossen')), test bool default false,
              fragen_snapshot jsonb, antworten jsonb default '{}', aha text, aktuelle_frage int default 0,
              pdf_path text, created_at, updated_at, abgeschlossen_at
```

- `fragen_snapshot`: beim Start die aktiven Kapitel und Fragen als Liste eingefroren. Das Interview liest nur daraus. Deshalb bleiben laufende Sitzungen stabil, wenn Jörg im Admin ändert.
- `antworten`: `{ "<question_id>": <string | number | {zeilen: {…}}> }`.
- `optionen` bei Tabelle: `{ "zeilen": ["Vollzeit","Teilzeit","Minijob","Azubi"], "spalten": ["Dezember {jahr-2}","Dezember {jahr-1}","Aktuell"] }`, Platzhalter werden beim Snapshot aufgelöst.
- Zugriff nur serverseitig mit dem Service-Role-Key. Kein Row-Level-Zugriff aus dem Browser, der Browser spricht nur mit den API-Routen der App.
- Start-Inhalt kommt aus `data/fragen-seed.json` (extrahiert aus dem Word-Workbook) über `scripts/seed.mjs`; Skript ist wiederholbar und legt nur an, was noch fehlt.

## 10. API-Routen

| Route | Zweck |
|---|---|
| `POST /api/start` | Sitzung anlegen, Snapshot ziehen, Link-Mail senden. Bremse: 10 Starts je IP und Stunde. |
| `GET /api/w/[token]` | Snapshot, Antworten, Position. |
| `PUT /api/w/[token]/antwort` | Eine Antwort speichern, Position fortschreiben. Nur bei Status `laufend` oder `ergebnis`. |
| `POST /api/w/[token]/link` | Fortsetzungs-Link erneut senden (Bremse 3 je Stunde). |
| `POST /api/w/[token]/abschluss` | Aha speichern, Punkte rechnen, PDF erzeugen und ablegen, Mails senden, Status `abgeschlossen`. Idempotent: zweiter Aufruf liefert die vorhandene PDF. |
| `GET /api/w/[token]/pdf` | Signierte Download-Adresse (nur `abgeschlossen`). |
| `POST /api/transkribieren` | Audio → Text → Glättung. Token-Header Pflicht, 25 MB Grenze. |
| `/api/admin/*` | Login, Kapitel, Fragen, Texte, Sitzungen, PDF neu erzeugen. Cookie-geprüft. |

## 11. Technik und Struktur

- Next.js (App Router), React, TypeScript, Tailwind. Gleiche Versionen wie JOERG AI, damit Wissen übertragbar bleibt.
- Abhängigkeiten über Next hinaus: `@supabase/supabase-js`, `resend`, `openai` (nur Transkription), `@anthropic-ai/sdk`, `@react-pdf/renderer`. Nichts weiter. Kein Drag-and-drop, kein Formular-Framework, keine UI-Bibliothek.
- Ordner: `app/` (Seiten und Routen), `lib/` (`db.ts`, `punkte.ts`, `erfolgsrad.tsx`, `pdf/`, `mail.ts`, `stt.ts`, `glaettung.ts`, `admin-auth.ts`), `data/fragen-seed.json`, `supabase/migrations/001_workbook.sql`, `scripts/` (Seed und Prüfskripte), `public/` (Logo, Schriften), `docs/`.
- Code liegt in `04-360BA-Workbook/` auf dem Synology-Laufwerk (Repo `JOERGROOS/360BA-WORKBOOK`). Bauen und Dev-Server laufen wie bei JOERG AI in einer lokalen Kopie außerhalb des Laufwerks (`~/dev/360ba-workbook`, per `rsync` angeglichen), weil Turbopack auf dem Laufwerk abbricht. Eintrag in `.claude/launch.json` des Projekts.
- Vercel: eigenes Projekt, Region `fra1`, verbunden mit dem GitHub-Repo, Domain `360ba.joerg-roos.com` (Vorschlag).
- Umgebungsvariablen: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (bestehendes Projekt), `OPENAI_API_KEY` (neu), `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `ADMIN_PASSWORD` (eigenes, nicht das von JOERG AI), `APP_URL`. Lokal in `~/.config/360ba-workbook/.env.local`, per Symlink eingebunden, außerhalb des Syncs.

## 12. Datenschutz

- Personenbezogene Daten: Name, Firma, Telefon, E-Mail, Antworten. Speicherung Supabase (Projekt von JOERG AI) und Vercel Frankfurt.
- Sprachaufnahmen gehen zur Umwandlung an OpenAI (USA), werden dort nicht gespeichert (API-Standard ohne Trainingsnutzung), bei uns gar nicht. Hinweis dazu am Mikrofon-Knopf beim ersten Klick und ein Absatz in der Datenschutzerklärung von joerg-roos.com (Jörg/Finja).
- Glättung über Anthropic wie bei JOERG AI bereits abgedeckt.
- Löschung einer Sitzung im Admin entfernt Datensatz und PDF.
- Token ist der einzige Schlüssel zur Sitzung. Er steht nur in der Mail und in der Adresse. Kein Login für Kunden, bewusst einfach.

## 13. Fehlerverhalten

- Speichern einer Antwort scheitert: Feld bleibt gefüllt, Hinweis „Nicht gespeichert, erneut versuchen“, Weiter blockiert bis erfolgreich.
- Transkription scheitert: siehe Abschnitt 4, Tippen bleibt immer möglich.
- PDF oder Mail scheitert beim Abschluss: Antworten sind gespeichert, Status bleibt `ergebnis`, Kunde sieht „Wir konnten dein Workbook gerade nicht erstellen. Deine Antworten sind sicher. Bitte in einer Minute erneut versuchen.“ Fehler wird serverseitig protokolliert. Im Admin kann Jörg „PDF neu erzeugen“ auslösen.
- Ungültiger Token: neutrale Seite „Dieser Link ist ungültig“ mit Hinweis auf `office@joerg-roos.com`.

## 14. Prüfung

Kleine Prüfskripte ohne Testrahmen, wie bei JOERG AI:

- `scripts/check-punkte.mjs`: Punkteberechnung (Summe, Normierung, Rundung, Kapitel ohne Skala).
- `scripts/check-seed.mjs`: Seed enthält 8 Kapitel, 7 Faktoren × 10 Skala-Aussagen, alle Fakten-Fragen, keine leeren Texte.
- `scripts/check-pdf.mjs`: erzeugt eine Beispiel-PDF aus Musterdaten nach `docs/beispiel/`, prüft Seitenzahl und Dateigröße. Sichtprüfung durch Jörg.
- `scripts/check-glaettung.mjs`: Prompt gegen drei Rohtexte, prüft dass Zahlen und Namen erhalten bleiben (nur mit Schlüssel, sonst übersprungen).
- Browser-Durchlauf im lokalen Dev-Server: Start, drei Fragetypen, Zurück, Ergebnis, Abschluss mit Test-Sitzung.

## 15. Nicht im Umfang

- Anbindung an Pipedrive oder ClickUp (Deal-Notiz, Aufgabe). Später möglich über den Abschluss-Aufruf.
- Mehrsprachigkeit, Team-Logins, Rollen im Admin.
- Ziele- und Organigramm-Fragen (Kickoff-Notiz) — kommen über den Admin.
- Nachträgliches Bearbeiten durch den Kunden nach Abschluss.
- Auswertungs-Statistik über alle Kunden.

## 16. Externe Schritte für Jörg

1. OpenAI-Konto anlegen (oder vorhandenes nutzen), API-Schlüssel mit kleinem Guthaben (20 € reichen für Monate).
2. GitHub-Repo `JOERGROOS/360BA-WORKBOOK` anlegen (leer, privat) — oder mir sagen, dass ich es über deine bestehende Git-Anmeldung anlegen soll.
3. Vercel-Projekt aus dem Repo anlegen, Region Frankfurt, Umgebungsvariablen eintragen (Liste kommt fertig von mir), Domain `360ba.joerg-roos.com` per DNS-Eintrag.
4. Datenschutzerklärung um den Absatz zur Sprachumwandlung ergänzen (Textvorschlag kommt von mir).

## 17. Aufwand

- Claude-Code-Arbeit: 10–14 Stunden über 3–4 Sitzungen (Gerüst und Datenbank 2 h · Interview 3 h · Sprache 2 h · Ergebnis und PDF 3 h · Admin 3 h · Mail, Prüfskripte, Doku 1 h).
- Externe Abhängigkeiten: etwa 1 Stunde Jörg (Abschnitt 16), Latenz 1 Tag.
- Quality-Gate: zwei Testdurchläufe von Jörg als Kunde, danach PDF-Feinschliff.
- Realistische Lieferung: 3–5 Arbeitstage nach Freigabe dieses Papiers, Engpass sind Jörgs Konten-Schritte und Testdurchläufe.
