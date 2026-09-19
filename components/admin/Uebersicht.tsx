'use client';
import { useEffect, useState } from 'react';
import type { Statistik } from '@/lib/statistik';
import { EinladungFormular } from './EinladungFormular';
import { ErfolgsradSvg } from '../ErfolgsradSvg';
import { aufruf, fehlertext } from './Fragebogen';

function stunden(min: number): string {
  const h = Math.floor(min / 60), rest = Math.round(min % 60);
  return `${h}:${String(rest).padStart(2, '0')}`;
}

function Karte({ label, wert, hero = false }: { label: string; wert: string; hero?: boolean }) {
  return (
    <div className={`glas !p-5 ${hero ? 'glas--betont' : ''}`}>
      <div className="text-[11.5px] tracking-[.14em] uppercase text-muted font-semibold">{label}</div>
      <div className={`text-[38px] leading-none font-semibold mt-3 tabular-nums ${hero ? 'text-[#F0902C]' : ''}`}>{wert}</div>
    </div>
  );
}

export function Uebersicht() {
  const [s, setS] = useState<Statistik | null>(null);
  const [fehler, setFehler] = useState('');
  const [neueEinladung, setNeueEinladung] = useState(false);

  async function laden() {
    try { setS(await aufruf('/api/admin/statistik', 'GET')); setFehler(''); }
    catch (e) { setFehler(fehlertext(e)); }
  }
  useEffect(() => { laden(); }, []);

  if (fehler) return <main className="p-8 max-w-[1180px] erscheint"><p className="text-[#ff7a52]">{fehler}</p></main>;
  if (!s) return null;

  return (
    <main className="p-8 max-w-[1180px] erscheint">
      <div className="flex items-center justify-between">
        <div className="eyebrow">Admin · Übersicht</div>
        <button className="btn" onClick={() => setNeueEinladung((v) => !v)}>{neueEinladung ? 'Schließen' : 'Neue Einladung'}</button>
      </div>
      {neueEinladung && <div className="mt-4"><EinladungFormular angelegt={laden} /></div>}

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mt-8">
        <Karte label="Einladungen offen" wert={String(s.anzahl.eingeladen)} />
        <Karte label="In Arbeit" wert={String(s.anzahl.laufend + s.anzahl.ergebnis)} />
        <Karte label="Fertig" wert={String(s.anzahl.abgeschlossen)} hero />
        <Karte label="Ø Dauer" wert={s.dauerMinuten.median !== null ? stunden(s.dauerMinuten.median) : '—'} />
        <Karte label="Sprachanteil" wert={s.diktatAnteil !== null ? `${s.diktatAnteil} %` : '—'} />
      </div>

      {s.faktoren.length === 0 ? (
        <p className="fine mt-8">Noch keine abgeschlossenen Workbooks.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-4 mt-4 items-stretch">
            <div className="glas flex items-center justify-center">
              <ErfolgsradSvg werte={s.faktoren.map((f) => ({ titel: f.titel, punkte: f.mittel }))} groesse={360} />
            </div>
            <div className="glas flex flex-col justify-center gap-3.5">
              {s.faktoren.map((f) => (
                <div key={f.titel} className="flex items-center gap-3.5">
                  <span className="w-44 shrink-0 text-[13.5px] text-[#C9CFD3] break-words">{f.titel}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/[.07] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${f.mittel}%`, background: 'linear-gradient(90deg,#9F3C07,#F0902C)' }} /></div>
                  <span className="w-10 text-right text-[13.5px]">{f.mittel}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="fine mt-4">Schwächster Faktor: {s.schwaechster} · Stärkster: {s.staerkster}</p>
        </>
      )}

      <p className="fine mt-6">
        {s.fortschrittLaufend.n > 0 ? `Laufende Sitzungen: Ø Fortschritt ${s.fortschrittLaufend.mittelProzent} %` : 'Keine laufenden Sitzungen.'}
      </p>
    </main>
  );
}
