'use client';
import { useEffect, useState } from 'react';
import type { Kapitel, Frage } from '@/lib/db';
import { Fragebogen } from '@/components/admin/Fragebogen';
import { Texte } from '@/components/admin/Texte';
import { Sitzungen } from '@/components/admin/Sitzungen';
import { Uebersicht } from '@/components/admin/Uebersicht';

type Bereich = 'uebersicht' | 'fragebogen' | 'workbooks' | 'texte';

export default function AdminSeite() {
  const [angemeldet, setAngemeldet] = useState<boolean | null>(null);
  const [passwort, setPasswort] = useState('');
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const [bereich, setBereich] = useState<Bereich>('uebersicht');
  const [kapitel, setKapitel] = useState<Kapitel[]>([]);
  const [fragen, setFragen] = useState<Frage[]>([]);

  useEffect(() => { fetch('/api/admin/texte').then((r) => setAngemeldet(r.status !== 401)); }, []);

  async function kapitelLaden() {
    const r = await fetch('/api/admin/kapitel');
    if (!r.ok) return;
    const d = await r.json();
    setKapitel(d.kapitel); setFragen(d.fragen);
  }
  useEffect(() => { if (angemeldet) kapitelLaden(); }, [angemeldet]);

  async function anmelden(e: React.FormEvent) {
    e.preventDefault(); setLaeuft(true); setFehler('');
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passwort }) });
    setLaeuft(false);
    if (!r.ok) { setFehler('Passwort falsch.'); return; }
    setAngemeldet(true);
  }

  async function abmelden() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAngemeldet(false);
  }

  async function vorschauAlsKunde() {
    const kontakt = { vorname: 'Jörg', nachname: 'Test', firma: 'JOERG ROOS', telefon: '', email: 'office@joerg-roos.com' };
    const r = await fetch('/api/admin/sitzungen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...kontakt, test: true }) });
    const d = await r.json();
    if (r.ok) window.open(d.link, '_blank');
  }

  if (angemeldet === null) return null;

  if (!angemeldet) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <form className="glas erscheint w-full max-w-sm" onSubmit={anmelden}>
          <img src="/logo-full-white.svg" alt="JOERG ROOS" className="h-5 mb-7" />
          <div className="eyebrow mb-5">Admin · Anmeldung</div>
          <label htmlFor="pw">Passwort</label>
          <input id="pw" type="password" value={passwort} onChange={(e) => setPasswort(e.target.value)} autoFocus />
          {fehler && <p className="mt-3 text-[#ff7a52] text-sm">{fehler}</p>}
          <button className="btn mt-5 w-full justify-center" disabled={laeuft}>{laeuft ? 'Einen Moment …' : 'Anmelden'}</button>
        </form>
      </main>
    );
  }

  const BEREICHE: { key: Bereich; label: string }[] = [
    { key: 'uebersicht', label: 'Übersicht' },
    { key: 'workbooks', label: 'Ausgefüllte Workbooks' },
    { key: 'fragebogen', label: 'Fragebogen' },
    { key: 'texte', label: 'Texte (Einleitung · Über Jörg)' },
  ];

  return (
    <div className="grid grid-cols-[250px_1fr] min-h-screen">
      <aside className="bg-[rgba(11,20,27,.55)] backdrop-blur-xl border-r border-white/10 p-6">
        <img src="/logo-full-white.svg" alt="JOERG ROOS" className="h-6 mb-8" />
        <nav className="flex flex-col gap-1">
          {BEREICHE.map((b) => (
            <button key={b.key} onClick={() => setBereich(b.key)} className={`text-left text-sm px-3 py-2.5 rounded-[10px] transition-colors ${bereich === b.key ? 'bg-o/15 text-white font-medium border border-o/35' : 'text-[#C9CFD3] border border-transparent hover:bg-white/[.05]'}`}>{b.label}</button>
          ))}
          <button onClick={vorschauAlsKunde} className="text-left text-sm px-3 py-2.5 rounded-[10px] text-[#C9CFD3] hover:bg-white/[.05] transition-colors">Vorschau als Kunde</button>
        </nav>
        {bereich === 'fragebogen' && (
          <>
            <h4 className="text-[11px] tracking-[.16em] uppercase text-muted mt-7 mb-2.5">Kapitel</h4>
            <nav className="flex flex-col gap-1">
              {kapitel.slice().sort((a, b) => a.position - b.position).map((k, i) => (
                <a key={k.id} href={`#kapitel-${k.id}`} className="text-sm px-3 py-2.5 rounded-[10px] text-[#C9CFD3] flex justify-between gap-2">
                  <span className="truncate">{i + 1} · {k.titel}</span>
                  <span className="text-muted">{fragen.filter((f) => f.chapter_id === k.id).length}</span>
                </a>
              ))}
              <a href="#kapitel-neu" className="text-sm px-3 py-2.5 text-o">+ Neues Kapitel</a>
            </nav>
          </>
        )}
        <button onClick={abmelden} className="text-left text-sm px-3 py-2.5 mt-8 text-muted">Abmelden</button>
      </aside>
      <div>
        {bereich === 'uebersicht' && <Uebersicht />}
        {bereich === 'fragebogen' && <Fragebogen kapitel={kapitel} fragen={fragen} neuLaden={kapitelLaden} />}
        {bereich === 'workbooks' && <Sitzungen />}
        {bereich === 'texte' && <Texte />}
      </div>
    </div>
  );
}
