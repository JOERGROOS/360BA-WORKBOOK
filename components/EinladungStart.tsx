'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Kontakt } from '@/lib/sitzung';

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
  return (
    <main>
      <div className="flex items-center justify-between px-12 py-6">
        <img src="/logo-full-white.svg" alt="JOERG ROOS" className="h-6" />
        <span className="text-[13px] tracking-[.14em] uppercase text-muted">360° Business-Analyse · Workbook</span>
      </div>
      <div className="max-w-[820px] mx-auto px-8 pb-20 pt-10">
        <div className="eyebrow">Schön, dass du dabei bist</div>
        <h1 className="font-semibold text-[44px] leading-[1.12] my-4">{fuelle(texte.einladung_titel, { vorname: kontakt.vorname })}</h1>
        <p className="text-[17px] leading-relaxed text-[#C9CFD3] font-light max-w-[620px]">{texte.einladung_text}</p>
        <form className="card mt-8" onSubmit={starten}>
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
      </div>
    </main>
  );
}
