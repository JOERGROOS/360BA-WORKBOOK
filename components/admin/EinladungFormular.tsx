'use client';
import { useState } from 'react';

type Feld = { vorname: string; nachname: string; firma: string; telefon: string; email: string };
const LEER: Feld = { vorname: '', nachname: '', firma: '', telefon: '', email: '' };

export function EinladungFormular({ angelegt }: { angelegt: () => void }) {
  const [f, setF] = useState(LEER);
  const [fehler, setFehler] = useState(''); const [laeuft, setLaeuft] = useState(false);
  const [ergebnis, setErgebnis] = useState<{ id: string; link: string } | null>(null);
  const [kopiert, setKopiert] = useState(false);
  const [mailStatus, setMailStatus] = useState<'laeuft' | 'ok' | 'fehler' | null>(null);
  const [mailFehler, setMailFehler] = useState('');

  async function anlegen(e: React.FormEvent) {
    e.preventDefault(); setLaeuft(true); setFehler('');
    const r = await fetch('/api/admin/sitzungen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const d = await r.json().catch(() => ({}));
    setLaeuft(false);
    if (!r.ok) { setFehler(d.error ?? 'Das hat nicht geklappt.'); return; }
    setErgebnis(d);
    angelegt();
  }

  async function linkKopieren() {
    if (!ergebnis) return;
    await navigator.clipboard.writeText(ergebnis.link);
    setKopiert(true); setTimeout(() => setKopiert(false), 2000);
  }

  async function mailSenden() {
    if (!ergebnis) return;
    setMailStatus('laeuft'); setMailFehler('');
    const r = await fetch(`/api/admin/sitzungen/${ergebnis.id}/link`, { method: 'POST' });
    if (!r.ok) { const d = await r.json().catch(() => ({})); setMailFehler(d.error ?? 'Das hat nicht geklappt.'); setMailStatus('fehler'); return; }
    setMailStatus('ok');
  }

  const feld = (k: keyof Feld, label: string, typ = 'text') => (
    <div><label htmlFor={k}>{label}</label><input id={k} type={typ} required={k !== 'telefon'} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );

  if (ergebnis) {
    return (
      <div className="card">
        <div className="eyebrow">Einladung angelegt</div>
        <p className="text-[17px] font-medium break-all my-3">{ergebnis.link}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn" onClick={linkKopieren}>{kopiert ? 'Kopiert ✓' : 'Link kopieren'}</button>
          <button className="btn" disabled={mailStatus === 'laeuft'} onClick={mailSenden}>{mailStatus === 'laeuft' ? 'Einen Moment …' : 'Einladung per Mail senden'}</button>
        </div>
        {mailStatus === 'ok' && <p className="fine text-o mt-3">Mail verschickt.</p>}
        {mailStatus === 'fehler' && <p className="text-[#ff7a52] text-sm mt-3">{mailFehler}</p>}
        <button className="fine underline mt-5" onClick={() => { setErgebnis(null); setF(LEER); setMailStatus(null); }}>Weitere Einladung anlegen</button>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={anlegen}>
      <div className="eyebrow mb-4">Neue Einladung</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {feld('vorname', 'Vorname')}{feld('nachname', 'Nachname')}
        <div className="md:col-span-2">{feld('firma', 'Firmenname')}</div>
        {feld('telefon', 'Telefon', 'tel')}{feld('email', 'E-Mail', 'email')}
      </div>
      {fehler && <p className="mt-4 text-[#ff7a52]">{fehler}</p>}
      <button className="btn mt-6" disabled={laeuft}>{laeuft ? 'Einen Moment …' : 'Einladung anlegen'}</button>
    </form>
  );
}
