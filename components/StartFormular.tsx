'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function StartFormular() {
  const r = useRouter();
  const [f, setF] = useState({ vorname: '', nachname: '', firma: '', telefon: '', email: '' });
  const [fehler, setFehler] = useState(''); const [laeuft, setLaeuft] = useState(false);
  async function starten(e: React.FormEvent) {
    e.preventDefault(); setLaeuft(true); setFehler('');
    const res = await fetch('/api/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const d = await res.json();
    if (!res.ok) { setFehler(d.error ?? 'Das hat nicht geklappt.'); setLaeuft(false); return; }
    r.push(`/w/${d.token}`);
  }
  const feld = (k: keyof typeof f, label: string, typ = 'text') => (
    <div><label htmlFor={k}>{label}</label><input id={k} type={typ} required={k !== 'telefon'} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );
  return (
    <form className="card" onSubmit={starten}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {feld('vorname', 'Vorname')}{feld('nachname', 'Nachname')}
        <div className="md:col-span-2">{feld('firma', 'Firmenname')}</div>
        {feld('telefon', 'Telefon', 'tel')}{feld('email', 'E-Mail', 'email')}
      </div>
      {fehler && <p className="mt-4 text-[#ff7a52]">{fehler}</p>}
      <div className="flex flex-wrap items-center gap-4 mt-6">
        <button className="btn text-[17px] px-9 py-5" disabled={laeuft}>{laeuft ? 'Einen Moment …' : 'Interview starten →'}</button>
        <span className="fine max-w-[300px]">Deine Angaben nutzen wir nur für die 360° Business-Analyse. <a className="underline" href="https://joerg-roos.com/datenschutz" target="_blank" rel="noreferrer">Datenschutz</a></span>
      </div>
    </form>
  );
}
