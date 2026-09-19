import type { Sitzung } from './db';
import { punkteJeFaktor, fortschritt } from './punkte.ts';

export type SitzungFuerStatistik = Pick<Sitzung, 'status' | 'test' | 'created_at' | 'gestartet_at' | 'abgeschlossen_at' | 'fragen_snapshot' | 'antworten' | 'diktate'>;

export type Statistik = {
  anzahl: { eingeladen: number; laufend: number; ergebnis: number; abgeschlossen: number; gesamt: number };
  dauerMinuten: { median: number | null; mittel: number | null; n: number };
  fortschrittLaufend: { mittelProzent: number | null; n: number };
  faktoren: { titel: string; mittel: number; n: number }[];
  schwaechster: string | null;
  staerkster: string | null;
  diktatAnteil: number | null;
  diktateGesamt: number;
};

function median(werte: number[]): number {
  const s = werte.slice().sort((a, b) => a - b);
  const mitte = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mitte - 1] + s[mitte]) / 2 : s[mitte];
}
function mittelwert(werte: number[]): number {
  return werte.reduce((a, b) => a + b, 0) / werte.length;
}

export function berechneStatistik(alle: SitzungFuerStatistik[]): Statistik {
  const sitzungen = alle.filter((s) => !s.test);

  const anzahl = { eingeladen: 0, laufend: 0, ergebnis: 0, abgeschlossen: 0, gesamt: sitzungen.length };
  for (const s of sitzungen) anzahl[s.status] += 1;

  const dauern = sitzungen
    .filter((s) => s.status === 'abgeschlossen' && s.gestartet_at && s.abgeschlossen_at)
    .map((s) => (new Date(s.abgeschlossen_at!).getTime() - new Date(s.gestartet_at!).getTime()) / 60000)
    .filter((min) => min >= 0);

  const laufendeProzente = sitzungen
    .filter((s) => s.status === 'laufend' || s.status === 'ergebnis')
    .map((s) => fortschritt(s.fragen_snapshot, s.antworten).prozent);

  const faktorSummen = new Map<string, { summe: number; n: number }>();
  for (const s of sitzungen) {
    if (s.status !== 'abgeschlossen') continue;
    for (const f of punkteJeFaktor(s.fragen_snapshot, s.antworten)) {
      const e = faktorSummen.get(f.titel) ?? { summe: 0, n: 0 };
      e.summe += f.punkte; e.n += 1;
      faktorSummen.set(f.titel, e);
    }
  }
  const faktoren = Array.from(faktorSummen, ([titel, e]) => ({ titel, mittel: Math.round(e.summe / e.n), n: e.n }));
  const schwaechster = faktoren.length ? faktoren.reduce((a, b) => (b.mittel < a.mittel ? b : a)).titel : null;
  const staerkster = faktoren.length ? faktoren.reduce((a, b) => (b.mittel > a.mittel ? b : a)).titel : null;

  const genutzt = sitzungen.filter((s) => s.status === 'laufend' || s.status === 'ergebnis' || s.status === 'abgeschlossen');
  const diktatAnteil = genutzt.length ? Math.round((genutzt.filter((s) => s.diktate > 0).length / genutzt.length) * 100) : null;
  const diktateGesamt = sitzungen.reduce((sum, s) => sum + s.diktate, 0);

  return {
    anzahl,
    dauerMinuten: { median: dauern.length ? Math.round(median(dauern)) : null, mittel: dauern.length ? Math.round(mittelwert(dauern)) : null, n: dauern.length },
    fortschrittLaufend: { mittelProzent: laufendeProzente.length ? Math.round(mittelwert(laufendeProzente)) : null, n: laufendeProzente.length },
    faktoren, schwaechster, staerkster, diktatAnteil, diktateGesamt,
  };
}
