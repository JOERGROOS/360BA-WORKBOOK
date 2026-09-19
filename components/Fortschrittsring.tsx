'use client';
import { useEffect, useState } from 'react';

export type RingZustand = 'laeuft' | 'fertig' | 'fehler';

const SCHRITTE = ['Antworten sammeln', 'Erfolgsrad zeichnen', 'Workbook setzen', 'Versenden'];
const R = 54;
const UMFANG = 2 * Math.PI * R;

// Der Server meldet keinen echten Fortschritt — der Ring nähert sich deshalb weich 88 % an,
// solange die Anfrage läuft, und springt erst mit der Antwort auf 100. Bewusst nie vorher,
// sonst stünde 100 % da, während noch gerechnet wird.
export function Fortschrittsring({ zustand, fehler, schliessen }: { zustand: RingZustand; fehler?: string; schliessen?: () => void }) {
  const [ruhig, setRuhig] = useState(false);
  const [prozent, setProzent] = useState(0);

  useEffect(() => { setRuhig(window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);

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

  return (
    <div role="dialog" aria-modal="true" aria-live="polite" aria-label="Workbook wird erstellt"
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm">
      <div className="glas erscheint w-full max-w-[430px] text-center px-8 py-12">
        <div className="relative w-[150px] h-[150px] mx-auto">
          <svg viewBox="0 0 150 150" className="w-full h-full -rotate-90">
            <defs>
              <linearGradient id="ring-verlauf" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#9F3C07" /><stop offset="55%" stopColor="#ED7A02" /><stop offset="100%" stopColor="#F0902C" />
              </linearGradient>
            </defs>
            <circle cx="75" cy="75" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="9" />
            <circle cx="75" cy="75" r={R} fill="none"
              stroke={zustand === 'fehler' ? 'rgba(175,179,181,.45)' : 'url(#ring-verlauf)'}
              strokeWidth="9" strokeLinecap="round"
              strokeDasharray={UMFANG} strokeDashoffset={UMFANG * (1 - anteil / 100)}
              style={{ transition: ruhig ? 'none' : 'stroke-dashoffset .25s ease-out' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {zustand === 'fertig' ? (
              <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="#ED7A02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 12.5 5.5 5.5L20 7" /></svg>
            ) : (
              <span className="font-semibold text-[38px] leading-none tabular-nums">{gezeigt}<span className="text-[20px] text-muted"> %</span></span>
            )}
          </div>
        </div>

        <div className="eyebrow mt-8">{zustand === 'fehler' ? 'Fehler' : 'Dein Workbook entsteht'}</div>
        <p className="text-[17px] font-medium mt-2.5">{schritt}</p>
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
