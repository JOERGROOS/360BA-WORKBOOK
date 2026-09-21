'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Snapshot, Antworten, Antwort, TabellenWert } from '@/lib/db';
import { flach, fortschritt } from '@/lib/punkte';
import { Fortschritt } from './Fortschritt';
import { FrageText } from './FrageText';
import { Mikro, type MikroStatus } from './Mikro';
import { FrageSkala } from './FrageSkala';
import { FrageTabelle } from './FrageTabelle';
import { Kopf } from './Kopf';
import { Ring } from './Ring';

function introKey(token: string, kapitelId: string): string {
  return `wb-intro-${token}-${kapitelId}`;
}

// vorname wird von Task 6/9 für Personalisierung erwartet, hier noch ungenutzt.
export function Interview({ token, snapshot, antworten: antwortenStart, start, zurueckZumErgebnis = false }: { token: string; snapshot: Snapshot; antworten: Antworten; start: number; vorname: string; zurueckZumErgebnis?: boolean }) {
  const router = useRouter();
  const alle = useMemo(() => flach(snapshot), [snapshot]);
  const [pos, setPos] = useState(() => Math.min(Math.max(start, 0), Math.max(alle.length - 1, 0)));
  const [antworten, setAntworten] = useState<Antworten>(antwortenStart);
  const [zeigeEinleitung, setZeigeEinleitung] = useState(false);
  const [fehler, setFehler] = useState('');
  const [speichertGerade, setSpeichertGerade] = useState(false);
  const [linkHinweis, setLinkHinweis] = useState('');
  const [mikroStatus, setMikroStatus] = useState<MikroStatus>({ z: 'bereit', sek: 0, fehler: '', pegel: 0 });
  const [keinTonHinweis, setKeinTonHinweis] = useState(false);
  const keinTonSeitRef = useRef<number | null>(null);
  const zeitgeberRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Beleg für "Mikro nimmt auf, aber es kommt kein Ton an": 6 Sekunden am Stück Pegel ~0.
  // Schwelle bewusst sehr tief: In Jörgs Chrome lag das Grundrauschen des Shure MV6 bei 0,0063
  // gemessen — die frühere Schwelle 0,01 hätte bei jeder Denkpause falschen Alarm ausgelöst.
  useEffect(() => {
    if (mikroStatus.z !== 'nimmt-auf') {
      keinTonSeitRef.current = null;
      if (keinTonHinweis) setKeinTonHinweis(false);
      return;
    }
    if (mikroStatus.pegel < 0.002) {
      if (keinTonSeitRef.current === null) keinTonSeitRef.current = Date.now();
      if (Date.now() - keinTonSeitRef.current > 6000 && !keinTonHinweis) setKeinTonHinweis(true);
    } else {
      keinTonSeitRef.current = null;
      if (keinTonHinweis) setKeinTonHinweis(false);
    }
  }, [mikroStatus.z, mikroStatus.pegel, keinTonHinweis]);

  const eintrag = alle[pos];

  // Einleitungs-Bildschirm zeigen, solange Kapitel eine Einleitung hat und sie diese Sitzung noch nicht weggeklickt wurde.
  useEffect(() => {
    if (eintrag?.ersteImKapitel && eintrag.kapitel.einleitung && sessionStorage.getItem(introKey(token, eintrag.kapitel.id)) !== '1') {
      setZeigeEinleitung(true);
    } else {
      setZeigeEinleitung(false);
    }
  }, [eintrag, token]);

  const weiter = useCallback(async (ueberschreibung?: Antwort) => {
    if (!eintrag) return;
    const frage = eintrag.frage;
    const aktuell = ueberschreibung !== undefined ? ueberschreibung : antworten[frage.id];
    if (frage.typ === 'skala' && typeof aktuell !== 'number') { setFehler('Bitte wähle einen Wert.'); return; }
    if (frage.typ === 'text') {
      const leer = typeof aktuell !== 'string' || aktuell.trim() === '';
      if (leer && !window.confirm('Ohne Antwort weiter?')) return;
    }
    const wert: Antwort = aktuell ?? '';
    setFehler('');
    setSpeichertGerade(true);
    let ok = false;
    try {
      const res = await fetch(`/api/w/${token}/antwort`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frageId: frage.id, wert, position: pos + 1 }),
      });
      ok = res.ok;
    } catch { ok = false; }
    setSpeichertGerade(false);
    if (!ok) { setFehler('Nicht gespeichert, bitte erneut versuchen'); return; }
    setAntworten((a) => ({ ...a, [frage.id]: wert }));
    if (zurueckZumErgebnis || pos + 1 >= alle.length) { router.push(`/w/${token}/ergebnis`); return; }
    setPos(pos + 1);
  }, [eintrag, antworten, pos, alle.length, token, router, zurueckZumErgebnis]);

  const skalaWaehlen = useCallback((n: number) => {
    if (!eintrag) return;
    const frage = eintrag.frage;
    setAntworten((a) => ({ ...a, [frage.id]: n }));
    setFehler('');
    if (zeitgeberRef.current) clearTimeout(zeitgeberRef.current);
    zeitgeberRef.current = setTimeout(() => weiter(n), 450);
  }, [eintrag, weiter]);

  // Ausstehenden Auto-Weiter verwerfen, sobald die Frage wechselt (z. B. durch Zurück).
  useEffect(() => () => { if (zeitgeberRef.current) clearTimeout(zeitgeberRef.current); }, [pos]);

  // Zifferntasten (Skala) und Enter (Skala/Tabelle) global abfangen.
  useEffect(() => {
    if (!eintrag || zeigeEinleitung) return;
    const typ = eintrag.frage.typ;
    function onKey(e: KeyboardEvent) {
      if (typ === 'skala') {
        if (e.key >= '1' && e.key <= '9') { skalaWaehlen(Number(e.key)); return; }
        if (e.key === '0') { skalaWaehlen(10); return; }
      }
      // Hat ein Skala-Knopf den Fokus, soll Enter ihn normal aktivieren (Klick übernimmt das automatische Weiter) statt Weiter zu erzwingen.
      if (e.target instanceof HTMLButtonElement) return;
      if ((typ === 'skala' || typ === 'tabelle') && e.key === 'Enter') {
        if (speichertGerade) return;
        e.preventDefault();
        weiter();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [eintrag, zeigeEinleitung, skalaWaehlen, weiter, speichertGerade]);

  function zurueck() {
    setFehler('');
    setPos((p) => Math.max(0, p - 1));
  }

  function losGehts() {
    if (eintrag) sessionStorage.setItem(introKey(token, eintrag.kapitel.id), '1');
    setZeigeEinleitung(false);
  }

  async function spaeter() {
    const res = await fetch(`/api/w/${token}/link`, { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    setLinkHinweis(res.ok ? 'Link ist unterwegs an deine E-Mail.' : (d.error ?? 'Das hat nicht geklappt.'));
  }

  if (!eintrag) return <main className="max-w-[620px] mx-auto px-8 py-24 text-center fine">Kein aktiver Fragebogen.</main>;

  const { kapitel, frage, kapitelIndex, frageIndex } = eintrag;
  // Das Wasserzeichen zeigt die Nummer des Erfolgsfaktors, nicht die Kapitelnummer —
  // sonst stünde über „Erfolgsfaktor 1 von 7" eine 02. Andere Kapitel bekommen keines.
  const faktorNummer = kapitel.typ === 'faktor'
    ? snapshot.kapitel.filter((k, i) => k.typ === 'faktor' && i <= kapitelIndex).length
    : 0;
  const prozentInfo = fortschritt(snapshot, antworten);
  const istLetzte = pos === alle.length - 1;
  const tastenhinweis = frage.typ === 'text'
    ? 'Strg/Cmd + Enter Weiter · Enter Zeilenumbruch'
    : frage.typ === 'skala'
    ? 'Tippe eine Zahl 1–0 · geht automatisch weiter'
    : '⏎ Weiter';

  function setzeWert(v: Antwort) {
    setAntworten((a) => ({ ...a, [frage.id]: v }));
  }

  function mikroStatusZeile(s: MikroStatus) {
    if (s.z === 'startet') return <span>Mikrofon wird geöffnet …</span>;
    if (s.z === 'nimmt-auf') {
      const mm = `${Math.floor(s.sek / 60)}:${String(s.sek % 60).padStart(2, '0')}`;
      const gefuellt = Math.min(8, Math.round(s.pegel * 30));
      return (
        <span className="flex items-center flex-wrap gap-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#ff5a4a] mr-1 animate-pulse" />
          Aufnahme läuft · {mm} ·
          <span className="inline-flex items-end gap-[2px] h-3" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <i key={i} className={`inline-block w-[3px] rounded-sm transition-all duration-150 ${i < gefuellt ? 'bg-o' : 'bg-white/15'}`} style={{ height: `${4 + i}px`, opacity: i < gefuellt ? 1 : .6 }} />
            ))}
          </span>
          {keinTonHinweis ? (
            <span className="text-[#ff7a52]">Kein Ton – Mikrofon prüfen</span>
          ) : (
            <span>Stopp mit Klick oder Leertaste. Danach wandeln wir deine Antwort in Text um und glätten sie – du kannst sie noch anpassen.</span>
          )}
        </span>
      );
    }
    if (s.z === 'wandelt-um') return <span>Wandle deine Antwort in Text um …</span>;
    if (s.z === 'fehler') return <span className="text-[#ff7a52]">{s.fehler}</span>;
    return null;
  }

  return (
    <main>
      <div className="sticky top-0 z-30 border-b border-white/[.07] bg-[rgba(11,20,27,.72)] backdrop-blur-xl pb-7 md:pb-8">
        <Kopf kinder={
          <div className="flex items-center gap-4 md:gap-5 flex-wrap">
            {linkHinweis && <span className="fine">{linkHinweis}</span>}
            <button type="button" className="text-[12.5px] text-muted border border-white/10 rounded-lg px-3 py-1.5 hover:border-o/60 hover:text-white transition-colors" onClick={spaeter}>Später weitermachen</button>
            <span className="flex items-center gap-3">
              <span className="text-[13px] tracking-[.14em] uppercase text-muted whitespace-nowrap">Frage {pos + 1} von {alle.length}</span>
              {/* Auf dem Handy steht der Gesamtfortschritt hier, auf dem Rechner in der Kapitel-Leiste. */}
              <span className="md:hidden">
                <Ring prozent={prozentInfo.prozent} groesse={44} strich={4}
                  kinder={<span className="text-[12px] font-semibold tabular-nums">{prozentInfo.prozent}</span>} />
              </span>
            </span>
          </div>
        } />
        <Fortschritt kapitel={snapshot.kapitel} aktuellesKapitel={kapitelIndex} prozent={prozentInfo.prozent} />
      </div>

      {zeigeEinleitung ? (
        <div className="max-w-[900px] mx-auto px-6 md:px-8 pt-12 pb-20">
          <div key={kapitel.id} className="glas erscheint px-7 py-12 md:px-14 md:py-16">
            {faktorNummer > 0 && (
              <span aria-hidden="true" className="pointer-events-none absolute right-4 md:right-10 -top-6 md:-top-10 font-semibold leading-none text-[150px] md:text-[220px] text-white/[.04] select-none">
                {String(faktorNummer).padStart(2, '0')}
              </span>
            )}
            <div className="relative">
              <div className="eyebrow">{kapitel.untertitel}</div>
              <h1 className="font-semibold text-[34px] md:text-[46px] leading-[1.12] mt-3 mb-5">{kapitel.titel}</h1>
              <p className="text-[16px] md:text-[17px] leading-relaxed text-[#C9CFD3] font-light max-w-[620px]">{kapitel.einleitung}</p>
              <button type="button" className="btn mt-9" onClick={losGehts}>Los geht&apos;s →</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-[900px] mx-auto px-6 md:px-8 pt-10 pb-20">
          <div key={frage.id} className="glas erscheint px-6 py-9 md:px-12 md:py-12">
            <div className="text-[14px] text-muted">Kapitel {kapitelIndex + 1} · {kapitel.titel}</div>
            {kapitel.typ === 'faktor' && (
              <div className="inline-flex items-center rounded-full border border-o/35 bg-o/10 px-3.5 py-1.5 text-[13px] font-medium mt-4">
                Erfolgsfaktor · {kapitel.titel} · Aussage {frageIndex + 1} von {kapitel.fragen.length}
              </div>
            )}
            <div className="font-medium text-[27px] md:text-[34px] leading-[1.26] mt-4 mb-2">{frage.text}</div>
            {frage.hinweis && <p className="text-[15px] text-[#C9CFD3] font-light mb-2 leading-relaxed">{frage.hinweis}</p>}

            {frage.typ === 'text' && (
              <>
                <FrageText
                  wert={(antworten[frage.id] as string) ?? ''}
                  onChange={setzeWert}
                  onWeiter={() => weiter()}
                  mikro={<Mikro key={frage.id} token={token} frageId={frage.id} onText={(t) => setAntworten((a) => { const alt = (a[frage.id] as string) ?? ''; return { ...a, [frage.id]: alt ? alt.trimEnd() + '\n\n' + t : t }; })} onStatus={setMikroStatus} />}
                />
                <div className="mt-3.5 text-[14px] text-[#C9CFD3] min-h-[22px]">{mikroStatusZeile(mikroStatus)}</div>
              </>
            )}
            {frage.typ === 'skala' && (
              <FrageSkala wert={antworten[frage.id] as number | undefined} onChange={skalaWaehlen} />
            )}
            {frage.typ === 'tabelle' && frage.optionen && (
              <FrageTabelle optionen={frage.optionen} wert={(antworten[frage.id] as TabellenWert) ?? {}} onChange={setzeWert} />
            )}

            {fehler && <p className="mt-4 text-[#ff7a52]">{fehler}</p>}

            <div className="flex justify-between items-center mt-10 gap-4 flex-wrap">
              <button type="button" className="btn btn-ghost" disabled={pos === 0} onClick={zurueck}>← Zurück</button>
              <span className="text-[12.5px] text-muted order-last w-full text-center md:order-none md:w-auto">{tastenhinweis}</span>
              <button type="button" className="btn" disabled={speichertGerade} onClick={() => weiter()}>{istLetzte ? 'Abschließen →' : 'Weiter →'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
