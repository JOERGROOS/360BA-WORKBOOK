'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Snapshot, Antworten, Antwort, TabellenWert } from '@/lib/db';
import { flach, fortschritt } from '@/lib/punkte';
import { Fortschritt } from './Fortschritt';
import { FrageText } from './FrageText';
import { FrageSkala } from './FrageSkala';
import { FrageTabelle } from './FrageTabelle';

function introKey(token: string, kapitelId: string): string {
  return `wb-intro-${token}-${kapitelId}`;
}

// vorname wird von Task 6/9 für Personalisierung erwartet, hier noch ungenutzt.
export function Interview({ token, snapshot, antworten: antwortenStart, start }: { token: string; snapshot: Snapshot; antworten: Antworten; start: number; vorname: string }) {
  const router = useRouter();
  const alle = useMemo(() => flach(snapshot), [snapshot]);
  const [pos, setPos] = useState(() => Math.min(Math.max(start, 0), Math.max(alle.length - 1, 0)));
  const [antworten, setAntworten] = useState<Antworten>(antwortenStart);
  const [zeigeEinleitung, setZeigeEinleitung] = useState(false);
  const [fehler, setFehler] = useState('');
  const [speichertGerade, setSpeichertGerade] = useState(false);
  const [linkHinweis, setLinkHinweis] = useState('');
  const zeitgeberRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (pos + 1 >= alle.length) { router.push(`/w/${token}/ergebnis`); return; }
    setPos(pos + 1);
  }, [eintrag, antworten, pos, alle.length, token, router]);

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
      if ((typ === 'skala' || typ === 'tabelle') && e.key === 'Enter') { e.preventDefault(); weiter(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [eintrag, zeigeEinleitung, skalaWaehlen, weiter]);

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

  return (
    <main>
      <div className="flex items-center justify-between px-12 py-6 gap-4 flex-wrap">
        <img src="/logo-full-white.svg" alt="JOERG ROOS" className="h-6" />
        <div className="flex items-center gap-5">
          {linkHinweis && <span className="fine">{linkHinweis}</span>}
          <button type="button" className="text-[12.5px] text-muted border border-line rounded-lg px-3 py-1.5 hover:border-o" onClick={spaeter}>Später weitermachen</button>
          <span className="text-[13px] tracking-[.14em] uppercase text-muted whitespace-nowrap">Frage {pos + 1} von {alle.length} · {prozentInfo.prozent} %</span>
        </div>
      </div>
      <Fortschritt kapitel={snapshot.kapitel} aktuellesKapitel={kapitelIndex} prozent={prozentInfo.prozent} />

      {zeigeEinleitung ? (
        <div className="max-w-[820px] mx-auto px-8 pt-16 pb-20">
          <div className="eyebrow">{kapitel.untertitel}</div>
          <h1 className="font-semibold text-[44px] leading-[1.12] my-4">{kapitel.titel}</h1>
          <p className="text-[17px] leading-relaxed text-[#C9CFD3] font-light max-w-[620px]">{kapitel.einleitung}</p>
          <button type="button" className="btn mt-8" onClick={losGehts}>Los geht&apos;s →</button>
        </div>
      ) : (
        <div className="max-w-[820px] mx-auto px-8 pb-20">
          <div className="text-[14px] text-muted mt-14">Kapitel {kapitelIndex + 1} · {kapitel.titel}</div>
          {kapitel.typ === 'faktor' && (
            <div className="inline-flex items-center rounded-full border border-o/35 bg-o/10 px-3.5 py-1.5 text-[13px] font-medium mt-4">
              Erfolgsfaktor · {kapitel.titel} · Aussage {frageIndex + 1} von {kapitel.fragen.length}
            </div>
          )}
          <div className="font-medium text-[34px] leading-[1.28] mt-3.5 mb-2">{frage.text}</div>
          {frage.hinweis && <p className="text-[15px] text-[#C9CFD3] font-light mb-7 leading-relaxed">{frage.hinweis}</p>}

          {frage.typ === 'text' && (
            <FrageText wert={(antworten[frage.id] as string) ?? ''} onChange={setzeWert} onWeiter={() => weiter()} />
          )}
          {frage.typ === 'skala' && (
            <FrageSkala wert={antworten[frage.id] as number | undefined} onChange={skalaWaehlen} />
          )}
          {frage.typ === 'tabelle' && frage.optionen && (
            <FrageTabelle optionen={frage.optionen} wert={(antworten[frage.id] as TabellenWert) ?? {}} onChange={setzeWert} />
          )}

          {fehler && <p className="mt-4 text-[#ff7a52]">{fehler}</p>}

          <div className="flex justify-between items-center mt-9 gap-4 flex-wrap">
            <button type="button" className="btn btn-ghost" disabled={pos === 0} onClick={zurueck}>← Zurück</button>
            <span className="text-[12.5px] text-muted">{tastenhinweis}</span>
            <button type="button" className="btn" disabled={speichertGerade} onClick={() => weiter()}>{istLetzte ? 'Abschließen →' : 'Weiter →'}</button>
          </div>
        </div>
      )}
    </main>
  );
}
