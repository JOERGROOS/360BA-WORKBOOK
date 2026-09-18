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
   werden: Die Datei `vercel.json` im Repo legt das schon fest.
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
| `ADMIN_PASSWORD` | Passwort für deinen Admin-Bereich `/admin` | aus `.env.local` |
| `APP_URL` | Die öffentliche Adresse des Workbooks | fest eintragen: `https://workbook.joerg-roos.com` |

Danach auf „Deploy" klicken. Der erste Durchlauf dauert ein bis zwei Minuten.

## 4. Domain einrichten

1. Im Vercel-Projekt unter „Settings" → „Domains" die Adresse
   `workbook.joerg-roos.com` eintragen und bestätigen.
2. Vercel zeigt dir daraufhin einen CNAME-Eintrag an. Bei deinem
   DNS-Anbieter (dort, wo `joerg-roos.com` verwaltet wird) einen neuen
   CNAME-Eintrag anlegen: Name `workbook`, Ziel `cname.vercel-dns.com`.
3. Das kann bis zu einer Stunde dauern, bis es überall wirkt. Vercel zeigt
   auf der Domains-Seite ein grünes Häkchen, sobald es funktioniert.

## 5. Nach dem ersten Deploy testen

1. `https://workbook.joerg-roos.com/admin` öffnen und mit deinem
   Admin-Passwort anmelden.
2. Eine Test-Sitzung anlegen („Vorschau als Kunde").
3. Das Workbook einmal komplett durchklicken, bis zum Abschluss.
4. Prüfen: Ist das PDF vollständig und richtig formatiert angekommen?
5. Prüfen: Ist die Kunden-Mail mit dem Link angekommen, und die interne
   Mail an das Team auch?

## 6. Resend — nichts zu tun

Der Absender `noreply@joerg-roos.com` ist bei Resend bereits verifiziert
(über das JOERG-AI-Projekt). Für das Workbook ist hier kein weiterer Schritt
nötig.

## 7. Supabase — nichts zu tun

Die Datenbank-Migration ist bereits eingespielt, und der Speicherbereich
(„Bucket") `workbooks` für die PDFs existiert schon. Auch hier ist kein
weiterer Schritt nötig.
