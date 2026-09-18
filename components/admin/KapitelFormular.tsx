'use client';
import { useState } from 'react';
import type { Kapitel, KapitelTyp } from '@/lib/db';
import { aufruf } from './Fragebogen';

const TYP_LABEL: Record<KapitelTyp, string> = { fakten: 'Fakten', faktor: 'Erfolgsfaktor' };

export function KapitelFormular({ kapitel, hatFragen, schliessen, neuLaden }: {
  kapitel: Kapitel | null; hatFragen: boolean; schliessen: () => void; neuLaden: () => Promise<void>;
}) {
  const [f, setF] = useState({
    titel: kapitel?.titel ?? '', untertitel: kapitel?.untertitel ?? '', einleitung: kapitel?.einleitung ?? '',
    typ: (kapitel?.typ ?? 'fakten') as KapitelTyp, aktiv: kapitel?.aktiv ?? true,
  });
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);

  async function speichern() {
    setLaeuft(true); setFehler('');
    try {
      if (kapitel) await aufruf(`/api/admin/kapitel/${kapitel.id}`, 'PUT', f);
      else await aufruf('/api/admin/kapitel', 'POST', f);
      await neuLaden(); schliessen();
    } catch (e) { setFehler(e instanceof Error ? e.message : 'Das hat nicht geklappt.'); } finally { setLaeuft(false); }
  }
  async function loeschen() {
    if (!kapitel || !confirm('Kapitel wirklich löschen?')) return;
    setLaeuft(true); setFehler('');
    try { await aufruf(`/api/admin/kapitel/${kapitel.id}`, 'DELETE'); await neuLaden(); schliessen(); }
    catch (e) { setFehler(e instanceof Error ? e.message : 'Das hat nicht geklappt.'); } finally { setLaeuft(false); }
  }

  return (
    <aside className="bg-blue border-l border-line p-7">
      <h3 className="text-[18px] font-semibold mb-5">{kapitel ? 'Kapitel bearbeiten' : 'Neues Kapitel'}</h3>
      <div className="mb-4.5"><label htmlFor="kt">Titel</label><input id="kt" value={f.titel} onChange={(e) => setF({ ...f, titel: e.target.value })} /></div>
      <div className="mb-4.5"><label htmlFor="ku">Untertitel</label><input id="ku" value={f.untertitel} onChange={(e) => setF({ ...f, untertitel: e.target.value })} /></div>
      <div className="mb-4.5"><label htmlFor="ke">Einleitung</label><textarea id="ke" style={{ minHeight: 110 }} value={f.einleitung} onChange={(e) => setF({ ...f, einleitung: e.target.value })} /></div>
      <div className="mb-4.5">
        <label>Typ</label>
        <div className="flex gap-1.5">
          {(['fakten', 'faktor'] as KapitelTyp[]).map((t) => (
            <span key={t} onClick={() => setF({ ...f, typ: t })} className={`flex-1 text-center border rounded-[10px] py-2.5 text-[13px] cursor-pointer ${f.typ === t ? 'border-o bg-o/15 text-white' : 'border-line text-[#C9CFD3]'}`}>{TYP_LABEL[t]}</span>
          ))}
        </div>
      </div>
      <div className="mb-4.5 flex items-center justify-between">
        <label className="mb-0">Aktiv</label>
        <button onClick={() => setF({ ...f, aktiv: !f.aktiv })} className={`w-[38px] h-[22px] rounded-full relative ${f.aktiv ? 'bg-o' : 'bg-line'}`}>
          <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white ${f.aktiv ? 'right-[3px]' : 'left-[3px]'}`} />
        </button>
      </div>
      {fehler && <p className="text-[#ff7a52] mb-3 text-sm">{fehler}</p>}
      <div className="flex items-center gap-3 mt-7">
        <button className="btn" disabled={laeuft || !f.titel.trim()} onClick={speichern}>Speichern</button>
        <button className="btn btn-ghost" onClick={schliessen}>Abbrechen</button>
        <span className="flex-1" />
        {kapitel && <button className="text-[13px] font-medium text-[#ff7a52] disabled:opacity-40" disabled={hatFragen} title={hatFragen ? 'Kapitel hat noch Fragen' : ''} onClick={loeschen}>Löschen</button>}
      </div>
    </aside>
  );
}
