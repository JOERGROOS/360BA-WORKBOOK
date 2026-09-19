'use client';
import { useState } from 'react';
import type { Frage, FrageTyp } from '@/lib/db';
import { aufruf, fehlertext } from './Fragebogen';

const TYP_LABEL: Record<FrageTyp, string> = { text: 'Freitext', skala: 'Skala 1–10', tabelle: 'Tabelle' };

export function FrageFormular({ frage, chapterId, schliessen, neuLaden }: {
  frage: Frage | null; chapterId: string; schliessen: () => void; neuLaden: () => Promise<void>;
}) {
  const [f, setF] = useState({
    text: frage?.text ?? '', hinweis: frage?.hinweis ?? '', typ: (frage?.typ ?? 'text') as FrageTyp, aktiv: frage?.aktiv ?? false,
    zeilen: (frage?.optionen?.zeilen ?? []).join('\n'), spalten: (frage?.optionen?.spalten ?? []).join('\n'),
  });
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);

  async function speichern() {
    setLaeuft(true); setFehler('');
    const zeilen = f.zeilen.split('\n').map((z) => z.trim()).filter(Boolean);
    const spalten = f.spalten.split('\n').map((s) => s.trim()).filter(Boolean);
    if (f.typ === 'tabelle' && (!zeilen.length || !spalten.length)) { setFehler('Zeilen und Spalten dürfen nicht leer sein.'); setLaeuft(false); return; }
    const optionen = f.typ === 'tabelle' ? { zeilen, spalten } : {};
    try {
      if (frage) await aufruf(`/api/admin/fragen/${frage.id}`, 'PUT', { text: f.text, hinweis: f.hinweis, typ: f.typ, optionen, aktiv: f.aktiv });
      else await aufruf('/api/admin/fragen', 'POST', { chapter_id: chapterId, text: f.text, hinweis: f.hinweis, typ: f.typ, optionen });
      await neuLaden(); schliessen();
    } catch (e) { setFehler(fehlertext(e)); } finally { setLaeuft(false); }
  }
  async function loeschen() {
    if (!frage || !confirm('Frage wirklich löschen?')) return;
    setLaeuft(true); setFehler('');
    try { await aufruf(`/api/admin/fragen/${frage.id}`, 'DELETE'); await neuLaden(); schliessen(); }
    catch (e) { setFehler(fehlertext(e)); } finally { setLaeuft(false); }
  }

  return (
    <aside className="bg-[rgba(11,20,27,.55)] backdrop-blur-xl border-l border-white/10 p-7">
      <h3 className="text-[18px] font-semibold mb-5">{frage ? 'Frage bearbeiten' : 'Neue Frage'}</h3>
      <div className="mb-4.5"><label htmlFor="ft">Fragetext</label><textarea id="ft" style={{ minHeight: 90 }} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} /></div>
      <div className="mb-4.5"><label htmlFor="fh">Hinweis für den Kunden (optional)</label><input id="fh" value={f.hinweis} onChange={(e) => setF({ ...f, hinweis: e.target.value })} /></div>
      <div className="mb-4.5">
        <label>Antwort-Typ</label>
        <div className="flex gap-1.5">
          {(['text', 'skala', 'tabelle'] as FrageTyp[]).map((t) => (
            <span key={t} onClick={() => setF({ ...f, typ: t })} className={`flex-1 text-center border rounded-[10px] py-2.5 text-[13px] cursor-pointer ${f.typ === t ? 'border-o bg-o/15 text-white' : 'border-line text-[#C9CFD3]'}`}>{TYP_LABEL[t]}</span>
          ))}
        </div>
      </div>
      {f.typ === 'tabelle' && (
        <>
          <div className="mb-4.5"><label htmlFor="fz">Zeilen (eine je Zeile)</label><textarea id="fz" placeholder={'z. B. Umsatz {jahr-1}'} style={{ minHeight: 90 }} value={f.zeilen} onChange={(e) => setF({ ...f, zeilen: e.target.value })} /></div>
          <div className="mb-4.5"><label htmlFor="fs">Spalten (eine je Zeile)</label><textarea id="fs" placeholder={'z. B. {jahr-1}'} style={{ minHeight: 90 }} value={f.spalten} onChange={(e) => setF({ ...f, spalten: e.target.value })} /></div>
        </>
      )}
      {frage ? (
        <div className="mb-4.5 flex items-center justify-between">
          <label className="mb-0">Sichtbar im Interview</label>
          <button onClick={() => setF({ ...f, aktiv: !f.aktiv })} className={`w-[38px] h-[22px] rounded-full relative ${f.aktiv ? 'bg-o' : 'bg-line'}`}>
            <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white ${f.aktiv ? 'right-[3px]' : 'left-[3px]'}`} />
          </button>
        </div>
      ) : (
        <p className="fine mb-4.5">Neue Fragen starten als Entwurf (inaktiv) und erscheinen erst nach dem Aktivieren im Interview.</p>
      )}
      {fehler && <p className="text-[#ff7a52] mb-3 text-sm">{fehler}</p>}
      <div className="flex items-center gap-3 mt-7">
        <button className="btn" disabled={laeuft || !f.text.trim()} onClick={speichern}>Speichern</button>
        <button className="btn btn-ghost" onClick={schliessen}>Abbrechen</button>
        <span className="flex-1" />
        {frage && <button className="text-[13px] font-medium text-[#ff7a52]" onClick={loeschen}>Löschen</button>}
      </div>
      <p className="fine mt-6">Änderungen gelten für neue Interviews. Laufende Interviews behalten ihren Fragestand.</p>
    </aside>
  );
}
