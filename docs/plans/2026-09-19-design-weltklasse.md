# Design auf Weltklasse-Niveau — App und PDF

**Auftrag (Jörg, 19.09.2026):** Technisch läuft alles, optisch ist es „Schulklasse“. Ziel ist das Niveau der Webseite joerg-roos.com und des B-OS: dunkler Verlaufshintergrund mit orangem Glow und Plexus-Linien, Glaskacheln, spürbare Interaktion, großzügige Typografie. Zwei bis drei Stunden Workbook müssen sich leicht anfühlen. Dazu eine Fortschrittsanzeige (Kreis 0→100 % mit Zahl) beim Erzeugen des Workbooks. Das PDF wird ebenfalls neu gestaltet: Deckblatt mit dem Webseiten-Hintergrund und dem Logo mit orangem Verlaufs-Emblem (nie das flache weiße), Inhaltsverzeichnis mit Seitenzahlen und Sprungmarken, Fragen und Antworten optisch getrennt, locker und modern.

## Referenzen (Pflicht-Lektüre für die Umsetzung)
- Webseite `https://joerg-roos.com` (dunkel, Glow oben links, Plexus, Pillen-Knöpfe, Headline zweifarbig weiß/orange)
- B-OS Glas-Karte: `01-CoWork/03-Cockpit/joerg-os.html` Klassen `.pv-glass`, `.pv-glow`, `.pv-kpi` (Zeilen ~10609–10627)
- Modern Dashboard Standard 2026: `01-CoWork/01-ATLAS/memory/context/visual-design-standard.md`
- CI-Tokens: `01-CoWork/01-ATLAS/memory/context/ci-design.md` (Farben, Schriften, Logo-Proportionen 7,87:1, Verlauf 33°)
- Assets: `01-CoWork/01-ATLAS/Ressourcen/CI-Asssets/Background-Plexus-Glow.svg` · `Titelfolie_Hintergrund.png` · `202608-Folienhintergrund-Plexus-4K.png` · `JOERGROOS-Logo-Full-white-gradiant.svg/.png` · `3 - Icons/`
- Freigegebenes Mockup: `docs/mockup/index.html`

## Leitplanken
- EIN Akzent Orange, diszipliniert. Flächen transluzent, Radius 20 px, 1 px Rand `rgba(255,255,255,.06–.1)`, weicher Schatten, Top-Highlight, `backdrop-filter: blur`.
- Bewegung dezent: Ein-/Ausblenden zwischen Fragen (200–300 ms), Hover/Active auf Knöpfen, Fokus-Ringe sichtbar, `prefers-reduced-motion` respektieren.
- Fließtext ≥ 14 px, Kontrast WCAG AA, mobil vollständig nutzbar.
- Keine neuen npm-Abhängigkeiten (CSS, SVG, React).
- PDF: Deckblatt dunkel (Hintergrund-Asset), Innenseiten hell; Logo-Proportion strikt; zwei Render-Durchläufe für Seitenzahlen im Inhaltsverzeichnis; Sprungmarken per `Link`/`id`.

## Arbeitsteilung
- Agent A: App (globals.css Design-System, alle Kundenseiten, Upload-Overlay, Admin-Rahmen, PDF-Erzeugungs-Overlay mit Fortschrittsring). Screenshots nach `docs/design/` (klein, ≤ 200 KB je Bild).
- Agent B: PDF (`lib/pdf/*`, Assets in `public/`). Beispiel-PDF nach `docs/beispiel/beispiel.pdf` (gitignored) + gerenderte Seiten nach `docs/design/pdf-*.png`.
