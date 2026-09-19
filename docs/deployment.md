# Das Online-Workbook live schalten

Diese Anleitung führt Schritt für Schritt durch das erste Veröffentlichen des
Workbooks. Jeder Schritt ist eine Handlung, keine Entscheidung — du klickst
dich einfach durch.

## 1. GitHub-Repo anlegen

1. Auf github.com anmelden, oben rechts auf das Plus-Symbol, dann
   „New repository".
2. Name: `360BA-WORKBOOK`, Organisation/Konto: `JOERGROOS`.
3. Sichtbarkeit auf **Private** stellen.
4. Auf „Create repository" klicken.
5. Danach im Terminal, im Ordner `04-360BA-Workbook`:
   ```
   git remote add origin https://github.com/JOERGROOS/360BA-WORKBOOK.git
   git push -u origin main
   ```

## 2. Vercel-Projekt anlegen

1. Auf vercel.com anmelden, oben rechts auf „Add New…", dann „Project".
2. Das gerade angelegte Repo `360BA-WORKBOOK` auswählen und „Import" klicken.
3. Bei „Framework Preset" steht automatisch **Next.js** — nichts ändern.
4. Die Region (Frankfurt) muss nicht in der Vercel-Oberfläche eingestellt
   werden: Die Datei `vercel.json` im Repo legt das schon fest. Das wirkt
   aber nur auf einem bezahlten Vercel-Plan (Pro) — im kostenlosen
   Hobby-Plan laufen die Funktionen trotzdem in der US-Standardregion. Bitte
   prüfen, welcher Plan im JOERG-AI-Konto aktiv ist (dasselbe Konto zu
   nutzen ist in Ordnung).
5. Noch nicht auf „Deploy" klicken — zuerst die Umgebungsvariablen eintragen
   (nächster Schritt).

## 3. Umgebungsvariablen eintragen

Im Vercel-Projekt unter „Settings" → „Environment Variables" folgende sieben
Werte für **Production** eintragen. Die echten Werte liegen auf deinem Mac in
`~/.config/360ba-workbook/.env.local` (Textdatei, mit einem Editor zu öffnen).

| Name | Was das ist | Woher der Wert kommt |
|---|---|---|
| `SUPABASE_URL` | Adresse der Datenbank | aus `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Passwort für den vollen Datenbank-Zugriff | aus `.env.local` |
| `OPENAI_API_KEY` | Schlüssel für die Umwandlung von Sprache in Text | aus `.env.local` |
| `ANTHROPIC_API_KEY` | Schlüssel für die sprachliche Glättung der Antworten | aus `.env.local` |
| `RESEND_API_KEY` | Schlüssel für den E-Mail-Versand | im Resend-Dashboard unter „API Keys" — das JOERG-AI-Projekt in Vercel hat denselben Schlüssel bereits hinterlegt, dort kannst du ihn auch abschreiben |
| `ADMIN_PASSWORD` | Passwort für deinen Admin-Bereich `/admin` — **mindestens 24 zufällige Zeichen aus einem Passwort-Generator**, kein selbst ausgedachtes Wort | aus `.env.local` |
| `APP_URL` | Die öffentliche Adresse des Workbooks | fest eintragen: `https://360ba.joerg-roos.com` |

Danach auf „Deploy" klicken. Der erste Durchlauf dauert ein bis zwei Minuten.

## 4. Domain einrichten

1. Im Vercel-Projekt unter „Settings" → „Domains" die Adresse
   `360ba.joerg-roos.com` eintragen und bestätigen.
2. Vercel zeigt dir daraufhin einen CNAME-Eintrag an. Bei deinem
   DNS-Anbieter (dort, wo `joerg-roos.com` verwaltet wird) einen neuen
   CNAME-Eintrag anlegen: Name `workbook`, Ziel `cname.vercel-dns.com`.
3. Das kann bis zu einer Stunde dauern, bis es überall wirkt. Vercel zeigt
   auf der Domains-Seite ein grünes Häkchen, sobald es funktioniert.

## 5. Laufender Betrieb: Einladung anlegen

Das Workbook hat keine öffentliche Startseite mehr. Jede Sitzung entsteht im
Admin-Bereich: `/admin` → „Ausgefüllte Workbooks" → „Neue Einladung" → Kontaktdaten
eintragen → „Einladung anlegen". Danach den Link kopieren oder direkt per Mail
verschicken. In der Praxis: **Einladung anlegen → Link in die Mail nach
Zahlungseingang** für die 360° Business-Analyse.

## 6. Nach dem ersten Deploy testen

1. `https://360ba.joerg-roos.com/admin` öffnen und mit deinem
   Admin-Passwort anmelden.
2. Eine Test-Sitzung anlegen („Vorschau als Kunde").
3. Das Workbook einmal komplett durchklicken, bis zum Abschluss.
4. Prüfen: Ist das PDF vollständig und richtig formatiert angekommen?
5. Prüfen: Ist die Kunden-Mail mit dem Link angekommen, und die interne
   Mail an das Team auch?

## 6a. Abholprogramm auf deinem Mac einrichten

Damit hochgeladene Finanzdaten auch tatsächlich in deinem Ordner
`1-Uploads von Kunden` ankommen, muss auf deinem Mac einmalig das
Abholprogramm eingerichtet werden — Details, Installation und Prüfung:
`docs/abholer.md`.

## 7. Resend — nichts zu tun

Der Absender `noreply@joerg-roos.com` ist bei Resend bereits verifiziert
(über das JOERG-AI-Projekt). Für das Workbook ist hier kein weiterer Schritt
nötig.

## 8. Supabase — nichts zu tun

Die Datenbank-Migrationen sind bereits eingespielt, und die Speicherbereiche
(„Buckets") `workbooks` (PDFs) und `finanzdaten` (Finanzdaten-Upload der
Kunden, privat, 50 MB je Datei) existieren schon. Auch hier ist kein
weiterer Schritt nötig. Row Level Security ist auf allen `wb_*`-Tabellen aktiv
(Migrationen `002_rls.sql` und `005_finanzdaten.sql`) — nur der Server mit dem
Service-Role-Key kommt noch an die Daten, ein Browser-Zugriff mit dem
öffentlichen Anon-Key läuft ins Leere. Details zu den Migrationen:
`supabase/README.md`.
