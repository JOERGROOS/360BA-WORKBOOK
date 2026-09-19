'use client';
import { useEffect, useRef, useState } from 'react';
import { Ring } from './Ring';

export type RingZustand = 'laeuft' | 'fertig' | 'fehler';

const SCHRITTE = ['Antworten sammeln', 'Erfolgsrad zeichnen', 'Workbook setzen', 'Versenden'];

// Der Server meldet keinen echten Fortschritt — der Ring nähert sich deshalb weich 88 % an,
// solange die Anfrage läuft, und springt erst mit der Antwort auf 100. Bewusst nie vorher,
// sonst stünde 100 % da, während noch gerechnet wird.
export function Fortschrittsring({ zustand, fehler, schliessen }: { zustand: RingZustand; fehler?: string; schliessen?: () => void }) {
  const [ruhig, setRuhig] = useState(false);
  const [prozent, setProzent] = useState(0);
  const kasten = useRef<HTMLDivElement>(null);

  useEffect(() => { setRuhig(window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);

  // Fokus wandert ins Fenster, damit Tastatur und Screenreader nicht hinter dem Overlay
  // weiterlaufen; die Tabulatortaste bleibt danach drin (siehe onKeyDown).
  useEffect(() => { kasten.current?.focus(); }, []);

  useEffect(() => {
    if (zustand !== 'laeuft' || ruhig) return;
    const t = setInterval(() => setProzent((p) => (p < 88 ? p + (88 - p) * 0.035 + 0.35 : p)), 90);
    return () => clearInterval(t);
  }, [zustand, ruhig]);

  useEffect(() => { if (zustand === 'fertig') setProzent(100); }, [zustand]);

  const gezeigt = Math.min(100, Math.round(prozent));
  const schritt = zustand === 'fehler'
    ? 'Abgebrochen'
    : zustand === 'fertig'
      ? 'Fertig'
      : ruhig
        ? 'Workbook wird erstellt'
        : SCHRITTE[Math.min(SCHRITTE.length - 1, Math.floor(gezeigt / 25))];
  // Beim Fehler bleibt der Ring stehen und wird stumpf; im Ruhemodus zeigt er einen festen Bogen.
  const anteil = zustand === 'fehler' ? gezeigt : ruhig && zustand === 'laeuft' ? 25 : gezeigt;

  function aufTaste(e: React.KeyboardEvent) {
    // Abbrechen nur im Fehlerfall — während der Erzeugung würde Escape das Fenster
    // schließen, obwohl die Anfrage weiterläuft.
    if (e.key === 'Escape') {
      if (zustand === 'fehler' && schliessen) schliessen();
      return;
    }
    if (e.key !== 'Tab') return;
    const ziele = kasten.current?.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!ziele?.length) { e.preventDefault(); return; }
    const erste = ziele[0], letzte = ziele[ziele.length - 1];
    if (e.shiftKey && document.activeElement === erste) { e.preventDefault(); letzte.focus(); }
    else if (!e.shiftKey && document.activeElement === letzte) { e.preventDefault(); erste.focus(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm">
      <div ref={kasten} role="dialog" aria-modal="true" aria-label="Workbook wird erstellt" tabIndex={-1} onKeyDown={aufTaste}
        className="glas erscheint w-full max-w-[430px] text-center px-8 py-12">
        {/* Die tickende Zahl ist nur fürs Auge — vorgelesen wird der Schritt darunter. */}
        <div className="mx-auto w-[150px]">
          <Ring prozent={anteil} groesse={150} strich={9} tempo={ruhig ? '0s' : '.25s'}
            farbe={zustand === 'fehler' ? 'rgba(175,179,181,.45)' : undefined}
            kinder={zustand === 'fertig' ? (
              <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="#ED7A02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 12.5 5.5 5.5L20 7" /></svg>
            ) : (
              <span aria-hidden="true" className="font-semibold text-[38px] leading-none tabular-nums">{gezeigt}<span className="text-[20px] text-muted"> %</span></span>
            )} />
        </div>

        <div className="eyebrow mt-8">{zustand === 'fehler' ? 'Fehler' : 'Dein Workbook entsteht'}</div>
        <p className="text-[17px] font-medium mt-2.5" aria-live="polite">{schritt}</p>
        {zustand === 'fehler' ? (
          <>
            <p className="text-[15px] leading-relaxed text-[#ff7a52] mt-4">{fehler}</p>
            <button type="button" className="btn btn-ghost mt-7" onClick={schliessen}>Zurück zum Ergebnis</button>
          </>
        ) : (
          <p className="fine mt-4">Das dauert bis zu einer Minute. Lass das Fenster so lange offen.</p>
        )}
      </div>
    </div>
  );
}
