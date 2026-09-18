import type { Snapshot, SnapshotKapitel, SnapshotFrage, Antworten, Antwort } from './db';

export type Faktorwert = { kapitelId: string; titel: string; punkte: number; summe: number; maximum: number };
export type FlacheFrage = { kapitelIndex: number; frageIndex: number; kapitel: SnapshotKapitel; frage: SnapshotFrage; ersteImKapitel: boolean };

export function istBeantwortet(frage: SnapshotFrage, wert: Antwort | undefined): boolean {
  if (wert === undefined || wert === null) return false;
  if (frage.typ === 'skala') return typeof wert === 'number' && wert >= 1 && wert <= 10;
  if (frage.typ === 'text') return typeof wert === 'string' && wert.trim().length > 0;
  if (frage.typ === 'tabelle') return typeof wert === 'object' && Object.values(wert as Record<string, Record<string, string>>).some((z) => Object.values(z).some((v) => String(v).trim() !== ''));
  return false;
}

export function flach(snapshot: Snapshot): FlacheFrage[] {
  const aus: FlacheFrage[] = [];
  snapshot.kapitel.forEach((kapitel, kapitelIndex) => {
    kapitel.fragen.forEach((frage, frageIndex) => aus.push({ kapitelIndex, frageIndex, kapitel, frage, ersteImKapitel: frageIndex === 0 }));
  });
  return aus;
}

export function fortschritt(snapshot: Snapshot, antworten: Antworten) {
  const alle = flach(snapshot);
  const beantwortet = alle.filter((f) => istBeantwortet(f.frage, antworten[f.frage.id])).length;
  const gesamt = alle.length;
  return { beantwortet, gesamt, prozent: gesamt ? Math.round((beantwortet / gesamt) * 100) : 0 };
}

// Punkte je Erfolgsfaktor: Summe der Skala-Antworten, auf 100 normiert.
// Bei zehn Aussagen ist das die einfache Summe wie im Word-Workbook.
export function punkteJeFaktor(snapshot: Snapshot, antworten: Antworten): Faktorwert[] {
  return snapshot.kapitel
    .filter((k) => k.typ === 'faktor')
    .map((k) => {
      const skala = k.fragen.filter((f) => f.typ === 'skala');
      const summe = skala.reduce((s, f) => s + (typeof antworten[f.id] === 'number' ? (antworten[f.id] as number) : 0), 0);
      const maximum = skala.length * 10;
      return { kapitelId: k.id, titel: k.titel, summe, maximum, punkte: maximum ? Math.round((summe / maximum) * 100) : 0 };
    })
    .filter((w) => w.maximum > 0);
}
