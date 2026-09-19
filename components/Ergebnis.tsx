'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Snapshot, Antworten, TabellenWert } from '@/lib/db';
import { flach, punkteJeFaktor, istBeantwortet } from '@/lib/punkte';
import { ErfolgsradSvg } from './ErfolgsradSvg';
import { Mikro, type MikroStatus } from './Mikro';
import { Kopf } from './Kopf';
import { Zweifarbig } from './Zweifarbig';
import { Fortschrittsring, type RingZustand } from './Fortschrittsring';

function MiniTabelle({ optionen, wert }: { optionen: { zeilen: string[]; spalten: string[] }; wert: TabellenWert }) {
  return (
    <table className="w-full text-[14px] border-separate border-spacing-y-1.5">
      <thead>
        <tr><th />{optionen.spalten.map((s) => <th key={s} className="text-[11px] uppercase tracking-wider text-muted font-medium text-left px-2">{s}</th>)}</tr>
      </thead>
      <tbody>
        {optionen.zeilen.map((z) => (
          <tr key={z}>
            <td className="text-[#C9CFD3] pr-3 whitespace-nowrap">{z}</td>
            {optionen.spalten.map((s) => <td key={s} className="px-2">{wert[z]?.[s] || '–'}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Faktor-Balken füllt sich beim Einblenden — Bewegung nur einmal, nicht bei jedem Rendern.
function FaktorBalken({ titel, punkte, verzoegerung }: { titel: string; punkte: number; verzoegerung: number }) {
  const [breite, setBreite] = useState(0);
  useEffect(() => { const t = setTimeout(() => setBreite(punkte), 80 + verzoegerung); return () => clearTimeout(t); }, [punkte, verzoegerung]);
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] text-[#C9CFD3] mb-2 truncate">{titel}</div>
        <div className="h-2 rounded-full bg-white/[.07] overflow-hidden">
          <div className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${breite}%`, background: 'linear-gradient(90deg,#9F3C07,#F0902C)' }} />
        </div>
      </div>
      <div className="text-[22px] font-semibold w-10 text-right tabular-nums">{punkte}</div>
    </div>
  );
}

export function Ergebnis({ token, snapshot, antworten, aha: ahaStart, vorname, texte }: {
  token: string; snapshot: Snapshot; antworten: Antworten; aha: string; vorname: string; texte: Record<string, string>;
}) {
  const router = useRouter();
  const alle = useMemo(() => flach(snapshot), [snapshot]);
  const punkte = useMemo(() => punkteJeFaktor(snapshot, antworten), [snapshot, antworten]);
  const fehlend = useMemo(() => alle.filter((f) => f.frage.typ === 'skala' && !istBeantwortet(f.frage, antworten[f.frage.id])), [alle, antworten]);

  const [aha, setAha] = useState(ahaStart);
  const [offen, setOffen] = useState<Record<string, boolean>>({});
  const [mikroStatus, setMikroStatus] = useState<MikroStatus>({ z: 'bereit', sek: 0, fehler: '', pegel: 0 });
  const [speichertAb, setSpeichertAb] = useState(false);
  const [ring, setRing] = useState<RingZustand | null>(null);
  const [fehler, setFehler] = useState('');

  async function speichereAha(wert: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/w/${token}/antwort`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ frageId: '__aha', wert, position: alle.length }) });
      return res.ok;
    } catch { return false; /* Aha-Text bleibt lokal, nächster Speicherversuch übernimmt ihn */ }
  }

  function mikroStatusZeile(s: MikroStatus) {
    if (s.z === 'nimmt-auf') {
      const mm = `${Math.floor(s.sek / 60)}:${String(s.sek % 60).padStart(2, '0')}`;
      return <span><span className="inline-block w-2 h-2 rounded-full bg-[#ff5a4a] mr-2 animate-pulse" />Aufnahme läuft · {mm} · Stopp mit Klick oder Leertaste.</span>;
    }
    if (s.z === 'wandelt-um') return <span>Wandle deine Antwort in Text um …</span>;
    if (s.z === 'fehler') return <span className="text-[#ff7a52]">{s.fehler}</span>;
    return null;
  }

  const FEHLERTEXT = 'Wir konnten dein Workbook gerade nicht erstellen. Deine Antworten sind sicher. Bitte in einer Minute erneut versuchen.';

  function abbrechen() {
    setRing(null); setSpeichertAb(false); setFehler(FEHLERTEXT);
  }

  async function abschliessen() {
    if (fehlend.length > 0 || speichertAb) return;
    if (!confirm('Wollen wir dein Ergebnis so festhalten? Danach sind die Antworten nicht mehr änderbar.')) return;
    setFehler(''); setSpeichertAb(true); setRing('laeuft');
    if (!(await speichereAha(aha))) { setRing('fehler'); return; }
    try {
      const res = await fetch(`/api/w/${token}/abschluss`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const { mailFehler } = await res.json();
      setRing('fertig');
      // Kurz stehen lassen, damit der Haken sichtbar ist, bevor die nächste Seite kommt.
      setTimeout(() => router.push(`/w/${token}/fertig${mailFehler ? '?mail=fehler' : ''}`), 900);
    } catch {
      setRing('fehler');
    }
  }

  const angezeigt = new Set<string>();

  return (
    <main>
      <Kopf kinder={<span className="text-[13px] tracking-[.14em] uppercase text-muted">Ergebnis</span>} />
      <div className="max-w-[1100px] mx-auto px-6 md:px-8 pb-24 pt-6 erscheint">
        <div className="eyebrow">Geschafft, {vorname}</div>
        <h1 className="font-semibold text-[34px] md:text-[44px] leading-[1.14] mt-3 mb-4">
          <Zweifarbig text={texte.ergebnis_titel} wort="Erfolgsrad" />
        </h1>
        <p className="text-[16px] md:text-[17px] leading-relaxed text-[#C9CFD3] font-light max-w-[660px]">{texte.ergebnis_text}</p>

        {fehlend.length > 0 && (
          <div className="glas glas--betont mt-8 !py-5">
            <p className="text-[15.5px]">Dir fehlen noch {fehlend.length} Skala-Antwort{fehlend.length === 1 ? '' : 'en'} — <a className="underline text-o" href={`/w/${token}/interview?frage=${alle.indexOf(fehlend[0])}`}>zur ersten offenen</a></p>
          </div>
        )}

        {/* Bento: Rad groß links, Faktoren rechts */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_.85fr] gap-5 mt-10 items-stretch">
          <div className="glas flex items-center justify-center py-10">
            <span aria-hidden="true" className="pointer-events-none absolute inset-0"
              style={{ background: 'radial-gradient(circle at 50% 50%,rgba(237,122,2,.14),transparent 62%)' }} />
            <div className="relative w-full max-w-[440px]"><ErfolgsradSvg werte={punkte} /></div>
          </div>
          <div className="glas flex flex-col justify-center gap-5">
            <div className="eyebrow">Deine Erfolgsfaktoren</div>
            {punkte.map((p, i) => <FaktorBalken key={p.kapitelId} titel={p.titel} punkte={p.punkte} verzoegerung={i * 70} />)}
          </div>
        </div>

        <div className="glas mt-5">
          <div className="eyebrow mb-5">Deine Antworten im Überblick</div>
          {alle.map((eintrag, i) => {
            const { frage, kapitel } = eintrag;
            if (frage.typ === 'skala' && kapitel.typ === 'faktor') {
              if (angezeigt.has(kapitel.id)) return null;
              angezeigt.add(kapitel.id);
              const fw = punkte.find((p) => p.kapitelId === kapitel.id);
              const aussagen = kapitel.fragen.filter((f) => f.typ === 'skala');
              return (
                <div key={kapitel.id} className="border-t border-white/[.07] py-4 first:border-t-0 first:pt-0">
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div className="text-[15.5px]">Faktor · {kapitel.titel}</div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="fine">{aussagen.length} Aussagen · {fw?.summe ?? 0} von {fw?.maximum ?? 0} Punkten</span>
                      <button type="button" className="underline text-o text-[13px]" onClick={() => setOffen((o) => ({ ...o, [kapitel.id]: !o[kapitel.id] }))}>{offen[kapitel.id] ? 'einklappen' : 'Details'}</button>
                      <a className="underline text-o text-[13px]" href={`/w/${token}/interview?frage=${i}`}>bearbeiten</a>
                    </div>
                  </div>
                  {offen[kapitel.id] && (
                    <ul className="mt-3 space-y-1.5">
                      {aussagen.map((a) => { const w = antworten[a.id]; return (
                        <li key={a.id} className="flex justify-between gap-4 text-[14px] text-[#C9CFD3]"><span>{a.text}</span><span className="text-white font-medium shrink-0">{typeof w === 'number' ? w : '–'}</span></li>
                      ); })}
                    </ul>
                  )}
                </div>
              );
            }
            return (
              <div key={frage.id} className="border-t border-white/[.07] py-4 first:border-t-0 first:pt-0">
                <div className="text-[15.5px]">{frage.text}</div>
                <div className="flex justify-between items-start gap-4 mt-1.5">
                  {frage.typ === 'text' ? (
                    <p className="text-[14.5px] leading-relaxed text-[#C9CFD3] flex-1 whitespace-pre-line">{istBeantwortet(frage, antworten[frage.id]) ? (antworten[frage.id] as string) : <span className="text-muted">– keine Antwort –</span>}</p>
                  ) : frage.typ === 'skala' ? (
                    <p className="text-[14.5px] text-[#C9CFD3] flex-1">{(() => { const w = antworten[frage.id]; return typeof w === 'number' ? w : <span className="text-muted">– keine Antwort –</span>; })()}</p>
                  ) : frage.optionen ? (
                    <div className="flex-1 min-w-0 overflow-x-auto"><MiniTabelle optionen={frage.optionen} wert={(antworten[frage.id] as TabellenWert) ?? {}} /></div>
                  ) : null}
                  <a className="underline text-o text-[13px] shrink-0" href={`/w/${token}/interview?frage=${i}`}>bearbeiten</a>
                </div>
              </div>
            );
          })}
        </div>

        <div className="glas glas--betont mt-5">
          <div className="eyebrow">{texte.aha_titel}</div>
          <p className="text-[22px] md:text-[24px] font-medium mt-2.5 mb-5">{texte.aha_frage}</p>
          <div className="relative">
            <textarea
              value={aha}
              onChange={(e) => setAha(e.target.value)}
              onBlur={() => speichereAha(aha)}
              style={{ minHeight: 140, paddingRight: 80, paddingTop: 18 }}
              placeholder="Tippen oder einsprechen …"
            />
            <div className="absolute right-4 bottom-4">
              <Mikro token={token} onText={(t) => { const neu = aha ? aha.trimEnd() + '\n\n' + t : t; setAha(neu); void speichereAha(neu); }} onStatus={setMikroStatus} />
            </div>
          </div>
          <div className="mt-3.5 text-[14px] text-[#C9CFD3] min-h-[22px]">{mikroStatusZeile(mikroStatus)}</div>

          <div className="flex flex-wrap items-center gap-5 mt-8">
            <button type="button" className="btn text-[16.5px] px-9 py-5" disabled={fehlend.length > 0 || speichertAb} onClick={abschliessen}>
              Ergebnis speichern &amp; Workbook erhalten →
            </button>
            <span className="fine max-w-[320px]">Du bekommst dein fertiges Workbook per E-Mail. Jörg erhält es zeitgleich zur Vorbereitung eures Tages.</span>
          </div>
          {fehler && <p className="mt-4 text-[#ff7a52]">{fehler}</p>}
        </div>
      </div>

      {ring && <Fortschrittsring zustand={ring} fehler={FEHLERTEXT} schliessen={abbrechen} />}
    </main>
  );
}
