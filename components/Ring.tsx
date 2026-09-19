'use client';

// Fortschritt als Kreis. Genutzt vom Gesamtfortschritt im Interview (klein) und vom
// Overlay beim Erzeugen des Workbooks (groß).
// Der Verlauf trägt eine feste Kennung: Stehen zwei Ringe auf einer Seite, greifen beide
// auf denselben, identischen Verlauf zu — das ist gewollt und spart eine zweite Definition.
// `prefers-reduced-motion` erledigt die globale Regel in `globals.css` (Übergänge ~0 ms).

export function Ring({
  prozent, groesse, strich, farbe = 'url(#wb-ring-verlauf)', tempo = '.4s', kinder,
}: {
  prozent: number; groesse: number; strich: number; farbe?: string; tempo?: string; kinder?: React.ReactNode;
}) {
  const r = (groesse - strich) / 2;
  const umfang = 2 * Math.PI * r;
  const anteil = Math.max(0, Math.min(100, prozent));
  return (
    <div className="relative shrink-0" style={{ width: groesse, height: groesse }}>
      <svg viewBox={`0 0 ${groesse} ${groesse}`} className="w-full h-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="wb-ring-verlauf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9F3C07" /><stop offset="55%" stopColor="#ED7A02" /><stop offset="100%" stopColor="#F0902C" />
          </linearGradient>
        </defs>
        <circle cx={groesse / 2} cy={groesse / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={strich} />
        <circle cx={groesse / 2} cy={groesse / 2} r={r} fill="none" stroke={farbe} strokeWidth={strich} strokeLinecap="round"
          strokeDasharray={umfang} strokeDashoffset={umfang * (1 - anteil / 100)}
          style={{ transition: `stroke-dashoffset ${tempo} ease-out` }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{kinder}</div>
    </div>
  );
}
