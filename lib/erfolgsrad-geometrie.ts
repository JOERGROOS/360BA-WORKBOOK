export type RadWert = { titel: string; punkte: number };
export type RadSegment = { titel: string; wert: number; pfad: string; deckkraft: number; wertX: number; wertY: number; labelX: number; labelY: number; trennX: number; trennY: number };
export type RadGeometrie = { cx: number; cy: number; R: number; ringe: number[]; segmente: RadSegment[] };

// Reine Geometrie, keine Darstellung. Web-SVG und PDF-SVG zeichnen dieselben Pfade.
export function radGeometrie(werte: RadWert[], groesse = 520): RadGeometrie {
  const cx = groesse / 2, cy = groesse / 2, R = groesse * 0.365;
  const n = Math.max(werte.length, 1), luecke = 0.035;
  const pol = (a: number, r: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  const runde = (x: number) => Math.round(x * 100) / 100;
  const segmente = werte.map((w, i) => {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n + luecke;
    const a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / n - luecke;
    const am = (a0 + a1) / 2;
    const wert = Math.max(0, Math.min(100, Math.round(w.punkte)));
    const r = (R * wert) / 100;
    const [x0, y0] = pol(a0, r), [x1, y1] = pol(a1, r);
    const gross = a1 - a0 > Math.PI ? 1 : 0;
    const pfad = wert > 0 ? `M${runde(cx)},${runde(cy)} L${runde(x0)},${runde(y0)} A${runde(r)},${runde(r)} 0 ${gross} 1 ${runde(x1)},${runde(y1)} Z` : '';
    const [wertX, wertY] = pol(am, Math.max(r - groesse * 0.045, groesse * 0.08));
    const [labelX, labelY] = pol(am, R + groesse * 0.035);
    const [trennX, trennY] = pol(-Math.PI / 2 + (i * 2 * Math.PI) / n, R);
    return { titel: w.titel, wert, pfad, deckkraft: 0.32 + (0.68 * wert) / 100, wertX, wertY, labelX, labelY, trennX, trennY };
  });
  return { cx, cy, R, ringe: Array.from({ length: 10 }, (_, i) => (R * (i + 1)) / 10), segmente };
}
