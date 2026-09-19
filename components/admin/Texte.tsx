'use client';
import { useEffect, useState } from 'react';

const NAMEN: Record<string, string> = {
  zugang_text: 'Start · Zugangs-Hinweis (öffentliche Seite ohne Formular)',
  einladung_titel: 'Einladung · Titel', einladung_text: 'Einladung · Text',
  willkommen_titel: 'PDF · Titel Willkommen', willkommen_text: 'PDF · Schön, dass du dabei bist',
  bestandteile_titel: 'PDF · Titel Bestandteile', bestandteile_text: 'PDF · Bestandteile-Text',
  finanzcheck_titel: 'PDF · Titel Finanz-Check', finanzcheck_text: 'PDF · Finanz-Check Text',
  finanzcheck_liste: 'PDF · Finanz-Check Liste', finanzcheck_uebermittlung: 'PDF · Finanz-Check Übermittlung',
  faktoren_titel: 'PDF · Titel Erfolgsfaktoren', faktoren_einleitung: 'PDF · Erfolgsfaktoren Einleitung',
  ergebnis_titel: 'Ergebnis · Titel', ergebnis_text: 'Ergebnis · Einleitungstext', ergebnis_fazit: 'Ergebnis · Fazit',
  aha_titel: 'Aha-Moment · Titel', aha_frage: 'Aha-Moment · Frage', aha_text: 'Aha-Moment · Hinweistext',
  ueber_titel: 'Über Jörg · Titel', ueber_text: 'Über Jörg · Text', ueber_web: 'Über Jörg · Web-Hinweis',
  kontakt: 'Kontaktzeile', claim: 'Claim / Slogan',
  mail_link_betreff: 'Mail · Link · Betreff', mail_link_text: 'Mail · Link · Text',
  mail_fertig_betreff: 'Mail · Fertig · Betreff', mail_fertig_text: 'Mail · Fertig · Text',
  mail_intern_text: 'Mail · Intern (an Jörg) · Text',
};

export function Texte() {
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
      <div className="eyebrow">Admin · Texte</div>
      <p className="fine mt-3 mb-8">Platzhalter wie {'{vorname}'}, {'{link}'}, {'{firma}'} bleiben stehen und werden beim Versand oder Erzeugen der PDF ersetzt.</p>
      <div className="flex flex-col gap-6">
        {Object.keys(NAMEN).map((key) => (
          <div key={key} className="card">
            <label htmlFor={key}>{NAMEN[key]}</label>
            <textarea id={key} style={{ minHeight: 90 }} value={entwuerfe[key] ?? ''} onChange={(e) => setEntwuerfe({ ...entwuerfe, [key]: e.target.value })} />
            <div className="flex items-center gap-3 mt-3">
              <button className="btn" disabled={status[key] === 'laeuft'} onClick={() => speichern(key)}>Speichern</button>
              {status[key] === 'ok' && <span className="fine text-o">Gespeichert.</span>}
              {status[key] === 'fehler' && <span className="text-[#ff7a52] text-sm">Fehler beim Speichern.</span>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
