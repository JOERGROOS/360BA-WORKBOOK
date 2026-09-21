'use client';
import { useEffect, useRef, useState } from 'react';
import { CHECKLISTE, stand } from '@/lib/checkliste';
import { MUSTER, MUSTER_GRUPPEN } from '@/lib/muster';

// Fenster „Welche Unterlagen brauchen wir?" — erreichbar über die ersten Worte im Text der
// Finanzdaten-Kachel. Jeder Punkt lässt sich abhaken; der Haken liegt in der Datenbank an
// der Sitzung, nicht im Browser. Damit sieht der Kunde seinen Stand auf jedem Gerät, und
// Jörg sieht ihn im Admin (Jörg-Vorgabe 22.09.2026: „was er uns schon geschickt hat und
// was eben noch nicht").
export function Unterlagen({ token, start, texte, schliessen }: {
  token: string; start: Record<string, boolean>; texte: Record<string, string>; schliessen: () => void;
}) {
  const [haken, setHaken] = useState<Record<string, boolean>>(start ?? {});
  const [fehler, setFehler] = useState('');
  const kasten = useRef<HTMLDivElement>(null);
  useEffect(() => { kasten.current?.focus(); }, []);

  async function umschalten(id: string) {
    const an = !haken[id];
    setHaken((h) => ({ ...h, [id]: an }));   // sofort sichtbar, Speichern läuft daneben
    setFehler('');
    try {
      const res = await fetch(`/api/w/${token}/checkliste`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ punkt: id, an }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setHaken((h) => ({ ...h, [id]: !an }));  // zurückdrehen, sonst zeigt der Haken etwas Falsches
      setFehler('Der Haken konnte nicht gespeichert werden. Bitte noch einmal antippen.');
    }
  }

  const s = stand(haken);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-3 overflow-y-auto" onClick={schliessen}>
      <div ref={kasten} role="dialog" aria-modal="true" aria-labelledby="unterlagen-titel" tabIndex={-1}
        className="glas erscheint w-full max-w-[640px] my-6 outline-none" onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') schliessen(); }}>
        <div className="flex items-center justify-between gap-4">
          <div className="eyebrow" id="unterlagen-titel">Unterlagen für den Finanzcheck</div>
          <button type="button" aria-label="Schließen" className="text-muted text-2xl leading-none hover:text-white transition-colors" onClick={schliessen}>×</button>
        </div>

        <p className="text-[15.5px] leading-[1.65] text-[#C9CFD3] font-light mt-4">{texte.unterlagen_intro}</p>

        <div className="flex items-center gap-3 mt-6">
          <span className="text-[13px] tracking-[.14em] uppercase text-muted">{s.erledigt} von {s.gesamt} erledigt</span>
          <span className="relative block flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <i className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-200"
              style={{ width: `${(s.erledigt / s.gesamt) * 100}%`, background: 'linear-gradient(90deg,#9F3C07,#F0902C)' }} />
          </span>
        </div>

        <div className="flex flex-col gap-2.5 mt-4">
          {CHECKLISTE.map((p) => {
            const an = haken[p.id] === true;
            return (
              <button key={p.id} type="button" onClick={() => umschalten(p.id)} aria-pressed={an}
                className={`flex items-start gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-colors ${an ? 'border-o/45 bg-o/[.07]' : 'border-white/10 hover:border-o/40 hover:bg-white/[.03]'}`}>
                <span aria-hidden="true"
                  className={`mt-0.5 w-[22px] h-[22px] shrink-0 rounded-[7px] border flex items-center justify-center transition-colors ${an ? 'border-o bg-o' : 'border-white/25'}`}>
                  {an && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m4 12.5 5.5 5.5L20 7" /></svg>}
                </span>
                <span>
                  <span className={`block text-[15.5px] leading-snug ${an ? 'text-white/70 line-through decoration-white/25' : 'text-white'}`}>{p.titel}</span>
                  {p.hinweis && <span className="block fine mt-1">{p.hinweis}</span>}
                </span>
              </button>
            );
          })}
        </div>

        {fehler && <p className="mt-4 text-[#ff7a52] text-[14.5px]">{fehler}</p>}

        <p className="fine mt-7">{texte.unterlagen_muster}</p>
        <div className="flex flex-col gap-4 mt-3">
          {MUSTER_GRUPPEN.map((g) => (
            <div key={g}>
              <div className="text-[13px] tracking-[.14em] uppercase text-muted mb-2">{g}</div>
              <div className="flex flex-col gap-1.5">
                {MUSTER.filter((m) => m.gruppe === g).map((m) => (
                  <a key={m.datei} href={`/muster/${m.datei}`} download
                    className="flex items-center gap-3 rounded-xl border border-white/10 px-3.5 py-2.5 hover:border-o/45 hover:bg-white/[.03] transition-colors">
                    <span className="text-[11px] font-semibold text-o border border-o/40 rounded px-1.5 py-0.5 shrink-0">{m.art}</span>
                    <span className="text-[15px] flex-1">{m.titel}</span>
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="text-muted shrink-0" aria-hidden="true">
                      <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
