'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Kontakt } from '@/lib/db';
import { Kopf } from './Kopf';

// Inline statt lib/texte-Import: lib/texte.ts zieht lib/db.ts nach, das serverseitige Umgebungsvariablen
// erwartet — ein Import hier würde das in den Browser-Bundle ziehen.
function fuelle(text: string, werte: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => werte[k] ?? '');
}

export function EinladungStart({ token, kontakt, texte }: { token: string; kontakt: Kontakt; texte: Record<string, string> }) {
  const r = useRouter();
  const [f, setF] = useState(kontakt);
  const [fehler, setFehler] = useState(''); const [laeuft, setLaeuft] = useState(false);

  async function starten(e: React.FormEvent) {
    e.preventDefault(); setLaeuft(true); setFehler('');
    const res = await fetch(`/api/w/${token}/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setFehler(d.error ?? 'Das hat nicht geklappt.'); setLaeuft(false); return; }
    r.refresh();
  }
  const feld = (k: keyof Kontakt, label: string, typ = 'text') => (
    <div><label htmlFor={k}>{label}</label><input id={k} type={typ} required={k !== 'telefon'} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );
  const titel = fuelle(texte.einladung_titel, { vorname: kontakt.vorname });
  return (
    <main>
      <Kopf kinder={<span className="text-[13px] tracking-[.14em] uppercase text-muted">360° Business-Analyse · Workbook</span>} />
      <div className="max-w-[900px] mx-auto px-6 md:px-8 pb-24 pt-8 erscheint">
        <div className="eyebrow">Schön, dass du dabei bist</div>
        <h1 className="font-semibold text-[34px] md:text-[46px] leading-[1.13] mt-3 mb-4">{titel}</h1>
        <p className="text-[16px] md:text-[17px] leading-relaxed text-[#C9CFD3] font-light max-w-[640px]">{texte.einladung_text}</p>
        <form className="glas mt-9" onSubmit={starten}>
          <div className="eyebrow mb-6">Deine Angaben</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {feld('vorname', 'Vorname')}{feld('nachname', 'Nachname')}
            <div className="md:col-span-2">{feld('firma', 'Firmenname')}</div>
            {feld('telefon', 'Telefon', 'tel')}{feld('email', 'E-Mail', 'email')}
          </div>
          {fehler && <p className="mt-4 text-[#ff7a52]">{fehler}</p>}
          <div className="flex flex-wrap items-center gap-5 mt-8">
            <button className="btn text-[17px] px-9 py-5" disabled={laeuft}>{laeuft ? 'Einen Moment …' : 'Interview starten →'}</button>
            <span className="fine max-w-[320px]">Deine Angaben nutzen wir nur für die 360° Business-Analyse. <a className="underline" href="https://joerg-roos.com/datenschutz" target="_blank" rel="noreferrer">Datenschutz</a></span>
          </div>
        </form>
      </div>
    </main>
  );
}
