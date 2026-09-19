'use client';
import { useEffect, useState } from 'react';
import type { Statistik } from '@/lib/statistik';
import { EinladungFormular } from './EinladungFormular';
import { ErfolgsradSvg } from '../ErfolgsradSvg';

function stunden(min: number): string {
  const h = Math.floor(min / 60), rest = Math.round(min % 60);
  return `${h}:${String(rest).padStart(2, '0')}`;
}

function Karte({ label, wert }: { label: string; wert: string }) {
  return (
    <div className="card !p-4">
      <div className="text-[12px] tracking-[.12em] uppercase text-muted">{label}</div>
      <div className="text-[34px] font-semibold mt-1.5">{wert}</div>
    </div>
  );
}

export function Uebersicht() {
  const [s, setS] = useState<Statistik | null>(null);
  const [neueEinladung, setNeueEinladung] = useState(false);

  async function laden() {
    const r = await fetch('/api/admin/statistik');
    if (r.ok) setS(await r.json());
  }
  useEffect(() => { laden(); }, []);

  if (!s) return null;

  return (
    <main className="p-8 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div className="eyebrow">Admin · Übersicht</div>
        <button className="btn" onClick={() => setNeueEinladung((v) => !v)}>{neueEinladung ? 'Schließen' : 'Neue Einladung'}</button>
      </div>
      {neueEinladung && <div className="mt-4"><EinladungFormular angelegt={laden} /></div>}

      <div className="grid grid-cols-5 gap-3.5 mt-8">
        <Karte label="Einladungen offen" wert={String(s.anzahl.eingeladen)} />
        <Karte label="In Arbeit" wert={String(s.anzahl.laufend + s.anzahl.ergebnis)} />
        <Karte label="Fertig" wert={String(s.anzahl.abgeschlossen)} />
        <Karte label="Ø Dauer" wert={s.dauerMinuten.median !== null ? stunden(s.dauerMinuten.median) : '—'} />
        <Karte label="Sprachanteil" wert={s.diktatAnteil !== null ? `${s.diktatAnteil} %` : '—'} />
      </div>

      {s.faktoren.length === 0 ? (
        <p className="fine mt-8">Noch keine abgeschlossenen Workbooks.</p>
      ) : (
        <>
          <div className="grid grid-cols-[360px_1fr] gap-8 mt-8 items-start">
            <ErfolgsradSvg werte={s.faktoren.map((f) => ({ titel: f.titel, punkte: f.mittel }))} groesse={360} />
            <div className="flex flex-col gap-3">
              {s.faktoren.map((f) => (
                <div key={f.titel} className="flex items-center gap-3.5">
                  <span className="w-40 shrink-0 text-[13.5px] text-[#C9CFD3]">{f.titel}</span>
                  <div className="flex-1 h-2 rounded-full bg-line overflow-hidden"><div className="h-full bg-o" style={{ width: `${f.mittel}%` }} /></div>
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
