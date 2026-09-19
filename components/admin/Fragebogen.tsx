'use client';
import { useState } from 'react';
import type { Kapitel, Frage, FrageTyp } from '@/lib/db';
import { AufrufFehler, fehlertext } from '@/lib/fehlertext';
import { KapitelFormular } from './KapitelFormular';
import { FrageFormular } from './FrageFormular';

type Ziel = { art: 'kapitel'; id: string | null } | { art: 'frage'; id: string | null; chapterId: string };

const FRAGE_TYP_LABEL: Record<FrageTyp, string> = { text: 'Freitext', skala: 'Skala 1–10', tabelle: 'Tabelle' };

export { AufrufFehler, fehlertext };

export async function aufruf(url: string, methode: string, body?: unknown) {
  const r = await fetch(url, { method: methode, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new AufrufFehler(d.error ?? 'Das hat nicht geklappt.', r.status); }
  return r.json();
}

export function Fragebogen({ kapitel, fragen, neuLaden }: { kapitel: Kapitel[]; fragen: Frage[]; neuLaden: () => Promise<void> }) {
  const [ziel, setZiel] = useState<Ziel | null>(null);
  const [fehler, setFehler] = useState('');
  const aktiveFragen = fragen.filter((f) => f.aktiv).length;
  const kapitelSortiert = kapitel.slice().sort((a, b) => a.position - b.position);

  async function frageVerschieben(id: string, richtung: 'hoch' | 'runter') {
    try { await aufruf(`/api/admin/fragen/${id}`, 'PUT', { richtung }); setFehler(''); await neuLaden(); }
    catch (e) { setFehler(fehlertext(e)); }
  }
  async function frageUmschalten(f: Frage) {
    try { await aufruf(`/api/admin/fragen/${f.id}`, 'PUT', { aktiv: !f.aktiv }); setFehler(''); await neuLaden(); }
    catch (e) { setFehler(fehlertext(e)); }
  }

  return (
    <div className={`grid ${ziel ? 'grid-cols-[1fr_420px]' : 'grid-cols-1'}`}>
      <main className="p-8 max-w-[900px]">
        <div className="eyebrow">Admin · Fragebogen</div>
        {fehler && <p className="text-[#ff7a52] mt-3 text-sm">{fehler}</p>}
        <div className="grid grid-cols-2 gap-3.5 mt-5 max-w-md">
          <div className="card !p-4">
            <div className="text-[12px] tracking-[.12em] uppercase text-muted">Fragen aktiv</div>
            <div className="text-[34px] font-semibold mt-1.5">{aktiveFragen} <small className="text-[14px] text-muted font-normal">von {fragen.length}</small></div>
          </div>
          <div className="card !p-4">
            <div className="text-[12px] tracking-[.12em] uppercase text-muted">Kapitel</div>
            <div className="text-[34px] font-semibold mt-1.5">{kapitel.length} <small className="text-[14px] text-muted font-normal">{kapitel.filter((k) => k.aktiv).length} aktiv</small></div>
          </div>
        </div>

        {kapitelSortiert.map((k, ki) => {
          const kFragen = fragen.filter((f) => f.chapter_id === k.id).sort((a, b) => a.position - b.position);
          return (
            <div key={k.id} id={`kapitel-${k.id}`}>
              <div className="flex items-center gap-3 mt-11 flex-wrap">
                <h3 className="font-semibold text-[18px]">Kapitel {ki + 1} · {k.titel}</h3>
                {k.typ === 'faktor' && <span className="text-[11px] tracking-[.08em] uppercase px-2.5 py-1 rounded-full border border-o text-o">Skala 1–10 · fließt ins Erfolgsrad</span>}
                {!k.aktiv && <span className="text-[11px] tracking-[.08em] uppercase px-2.5 py-1 rounded-full border border-line text-muted">Inaktiv</span>}
                <span className="flex-1" />
                <button className="text-o text-[13px] font-medium" onClick={() => setZiel({ art: 'kapitel', id: k.id })}>Kapitel bearbeiten</button>
                <button className="text-o text-[13px] font-medium" onClick={() => setZiel({ art: 'frage', id: null, chapterId: k.id })}>+ Neue Frage</button>
              </div>
              <div className="flex flex-col gap-2 mt-4.5">
                {kFragen.map((f, fi) => (
                  <div key={f.id} className={`grid grid-cols-[44px_1fr_110px_44px_90px] gap-3.5 items-center bg-surf border border-line rounded-xl px-4 py-3 text-sm ${!f.aktiv ? 'opacity-60' : ''}`}>
                    <span className="flex gap-1.5 text-muted">
                      <button disabled={fi === 0} onClick={() => frageVerschieben(f.id, 'hoch')} className="disabled:opacity-25">↑</button>
                      <button disabled={fi === kFragen.length - 1} onClick={() => frageVerschieben(f.id, 'runter')} className="disabled:opacity-25">↓</button>
                    </span>
                    <span>{f.text}{!f.aktiv && <em className="text-muted"> (Entwurf)</em>}</span>
                    <span className="text-[11px] uppercase tracking-[.08em] px-2 py-1 rounded-full border border-line text-[#C9CFD3] text-center">{FRAGE_TYP_LABEL[f.typ]}</span>
                    <button onClick={() => frageUmschalten(f)} className={`w-[38px] h-[22px] rounded-full relative shrink-0 ${f.aktiv ? 'bg-o' : 'bg-line'}`}>
                      <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white ${f.aktiv ? 'right-[3px]' : 'left-[3px]'}`} />
                    </button>
                    <button className="text-o text-[13px] font-medium" onClick={() => setZiel({ art: 'frage', id: f.id, chapterId: k.id })}>Bearbeiten</button>
                  </div>
                ))}
                {kFragen.length === 0 && <p className="fine">Noch keine Fragen in diesem Kapitel.</p>}
              </div>
            </div>
          );
        })}
        <button className="mt-11 mb-4 text-o text-sm font-medium block" id="kapitel-neu" onClick={() => setZiel({ art: 'kapitel', id: null })}>+ Neues Kapitel</button>
      </main>
      {ziel?.art === 'kapitel' && (
        <KapitelFormular kapitel={kapitel.find((k) => k.id === ziel.id) ?? null} hatFragen={ziel.id ? fragen.some((f) => f.chapter_id === ziel.id) : false} schliessen={() => setZiel(null)} neuLaden={neuLaden} />
      )}
      {ziel?.art === 'frage' && (
        <FrageFormular frage={fragen.find((f) => f.id === ziel.id) ?? null} chapterId={ziel.chapterId} schliessen={() => setZiel(null)} neuLaden={neuLaden} />
      )}
    </div>
  );
}
