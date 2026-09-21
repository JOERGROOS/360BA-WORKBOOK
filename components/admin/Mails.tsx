'use client';
import { useEffect, useState } from 'react';

// Jede E-Mail, die das Tool im Kunden-Ablauf direkt versendet — Betreff + Text an einem
// Ort, mit vollen Anpassungsmöglichkeiten. Gleiches Speicher-Muster wie Texte.tsx
// (dieselbe Tabelle `wb_texte`, dieselbe API); Betreff und Text stehen bewusst als Paar
// nebeneinander, weil eine Mail ohne beides nicht vollständig ist.
const MAILS: { gruppe: string; wann: string; betreff: string; text: string; platzhalter: string }[] = [
  { gruppe: 'Link zum Workbook', wann: 'Beim Anlegen der Einladung und bei „Link erneut senden".', betreff: 'mail_link_betreff', text: 'mail_link_text', platzhalter: '{vorname}, {link}' },
  { gruppe: 'Erinnerung · 14 Tage vorher', wann: `Automatisch, sobald der Termin vor Ort in 14 Tagen oder weniger liegt und noch keine Erinnerung raus ist.`, betreff: 'mail_erinnerung_14_betreff', text: 'mail_erinnerung_14_text', platzhalter: '{vorname}, {firma}, {link}, {tage}' },
  { gruppe: 'Erinnerung · 10 Tage vorher', wann: 'Automatisch, sobald der Termin in 10 Tagen oder weniger liegt.', betreff: 'mail_erinnerung_10_betreff', text: 'mail_erinnerung_10_text', platzhalter: '{vorname}, {firma}, {link}, {tage}' },
  { gruppe: 'Erinnerung · 7 Tage vorher', wann: 'Automatisch, sobald der Termin in 7 Tagen oder weniger liegt — letzte Bitte um Workbook und Finanzdaten.', betreff: 'mail_erinnerung_7_betreff', text: 'mail_erinnerung_7_text', platzhalter: '{vorname}, {firma}, {link}, {tage}' },
  { gruppe: 'Workbook fertig', wann: 'Beim Abschluss, an den Kunden — mit dem PDF im Anhang.', betreff: 'mail_fertig_betreff', text: 'mail_fertig_text', platzhalter: '{vorname}, {link}' },
  { gruppe: 'Intern (an Jörg)', wann: 'Beim Abschluss, an controlling@joerg-roos.com — kein Betreff-Feld, feste Kopie mit den Kontaktdaten.', betreff: '', text: 'mail_intern_text', platzhalter: '{vorname}, {nachname}, {firma}, {email}, {telefon}' },
];

export function Mails() {
  const [texte, setTexte] = useState<Record<string, string> | null>(null);
  const [entwuerfe, setEntwuerfe] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, 'laeuft' | 'ok' | 'fehler'>>({});

  useEffect(() => { fetch('/api/admin/texte').then((r) => r.json()).then((d) => { setTexte(d); setEntwuerfe(d); }); }, []);

  async function speichern(key: string) {
    setStatus((s) => ({ ...s, [key]: 'laeuft' }));
    const r = await fetch('/api/admin/texte', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, wert: entwuerfe[key] }) });
    setStatus((s) => ({ ...s, [key]: r.ok ? 'ok' : 'fehler' }));
  }

  if (!texte) return null;
  return (
    <main className="p-8 max-w-[820px]">
      <div className="eyebrow">Admin · E-Mails</div>
      <p className="fine mt-3 mb-8">Alle Mails, die das Tool direkt an Kunden oder ans Team verschickt. Platzhalter wie {'{vorname}'} oder {'{link}'} bleiben stehen und werden beim Versand ersetzt.</p>
      <div className="flex flex-col gap-6">
        {MAILS.map((m) => (
          <div key={m.text} className="card">
            <div className="font-semibold text-[17px]">{m.gruppe}</div>
            <p className="fine mt-1 mb-4">{m.wann} Platzhalter: {m.platzhalter}</p>
            {m.betreff && (
              <>
                <label htmlFor={m.betreff}>Betreff</label>
                <input id={m.betreff} value={entwuerfe[m.betreff] ?? ''} onChange={(e) => setEntwuerfe({ ...entwuerfe, [m.betreff]: e.target.value })} />
              </>
            )}
            <label htmlFor={m.text} className="mt-3 block">Text</label>
            <textarea id={m.text} style={{ minHeight: 140 }} value={entwuerfe[m.text] ?? ''} onChange={(e) => setEntwuerfe({ ...entwuerfe, [m.text]: e.target.value })} />
            <div className="flex items-center gap-3 mt-3">
              <button className="btn" disabled={status[m.text] === 'laeuft'} onClick={() => { speichern(m.text); if (m.betreff) speichern(m.betreff); }}>Speichern</button>
              {(status[m.text] === 'ok' || (m.betreff && status[m.betreff] === 'ok')) && <span className="fine text-o">Gespeichert.</span>}
              {(status[m.text] === 'fehler' || (m.betreff && status[m.betreff] === 'fehler')) && <span className="text-[#ff7a52] text-sm">Fehler beim Speichern.</span>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
