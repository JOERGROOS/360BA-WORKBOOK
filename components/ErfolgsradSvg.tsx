import { radGeometrie, type RadWert } from '@/lib/erfolgsrad-geometrie';

export function ErfolgsradSvg({ werte, groesse = 520, hell = false }: { werte: RadWert[]; groesse?: number; hell?: boolean }) {
  const g = radGeometrie(werte, groesse);
  const ring = hell ? '#D5D9DC' : '#2A353D', flaeche = hell ? '#FFFFFF' : '#16212A', trenn = hell ? '#AFB3B5' : '#3D4D5C', text = hell ? '#0F1B23' : '#EEEEEE';
  const kurz = (t: string) => t.replace(' & wirtschaftliche Lage', ' & Lage').replace(' & Leistungserbringung', '');
  return (
    <svg viewBox={`0 0 ${groesse} ${groesse}`} width="100%" role="img" aria-label="Erfolgsrad">
      <circle cx={g.cx} cy={g.cy} r={g.R + groesse * 0.065} fill={flaeche} stroke={ring} />
      {g.ringe.map((r) => <circle key={r} cx={g.cx} cy={g.cy} r={r} fill="none" stroke={ring} strokeWidth={1} />)}
      {g.segmente.map((s) => (
        <g key={s.titel}>
          {s.pfad && <path d={s.pfad} fill="#ED7A02" opacity={s.deckkraft} />}
          <line x1={g.cx} y1={g.cy} x2={s.trennX} y2={s.trennY} stroke={trenn} strokeWidth={1.5} />
          <text x={s.labelX} y={s.labelY} fill={text} fontSize={groesse * 0.023} fontWeight={500} textAnchor="middle" dominantBaseline="middle" fontFamily="Montserrat, Arial">{kurz(s.titel)}</text>
          {s.wert > 0 && <text x={s.wertX} y={s.wertY} fill="#fff" fontSize={groesse * 0.029} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fontFamily="Montserrat, Arial">{s.wert}</text>}
        </g>
      ))}
      <circle cx={g.cx} cy={g.cy} r={groesse * 0.027} fill={hell ? '#EEEEEE' : '#0F1B23'} stroke={trenn} />
    </svg>
  );
}
