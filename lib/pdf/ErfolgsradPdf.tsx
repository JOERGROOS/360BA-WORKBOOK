import { Svg, Circle, Path, Line, Text as SvgText, G, Defs, RadialGradient, Stop } from '@react-pdf/renderer';
import { radGeometrie, type RadWert } from '@/lib/erfolgsrad-geometrie';

export function ErfolgsradPdf({ werte, groesse = 420 }: { werte: RadWert[]; groesse?: number }) {
  const g = radGeometrie(werte, groesse);
  const kurz = (t: string) => t.replace(' & wirtschaftliche Lage', ' & Lage').replace(' & Leistungserbringung', '');
  return (
    <Svg width={groesse} height={groesse} viewBox={`0 0 ${groesse} ${groesse}`}>
      {/* weicher oranger Schein hinter dem Rad — derselbe Glow wie auf der Webseite */}
      <Defs>
        <RadialGradient id="radSchein" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#ED7A02" stopOpacity={0.22} />
          <Stop offset="0.55" stopColor="#ED7A02" stopOpacity={0.07} />
          <Stop offset="1" stopColor="#ED7A02" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={g.cx} cy={g.cy} r={groesse * 0.5} fill="url(#radSchein)" />
      <Circle cx={g.cx} cy={g.cy} r={g.R + groesse * 0.065} fill="#FFFFFF" stroke="#E2E6E9" />
      {g.ringe.map((r) => (
        <Circle key={r} cx={g.cx} cy={g.cy} r={r} fill="none" stroke="#D5D9DC" strokeWidth={0.8} />
      ))}
      {g.segmente.map((s) => (
        <G key={s.titel}>
          {s.pfad ? <Path d={s.pfad} fill="#ED7A02" fillOpacity={s.deckkraft} /> : null}
          <Line x1={g.cx} y1={g.cy} x2={s.trennX} y2={s.trennY} stroke="#AFB3B5" strokeWidth={1.2} />
          <SvgText
            x={s.labelX}
            y={s.labelY}
            fill="#0F1B23"
            style={{ fontFamily: 'Montserrat', fontWeight: 500, fontSize: groesse * 0.024 }}
            textAnchor="middle"
          >
            {kurz(s.titel)}
          </SvgText>
          {s.wert > 0 ? (
            <SvgText
              x={s.wertX}
              y={s.wertY + groesse * 0.01}
              fill="#FFFFFF"
              style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: groesse * 0.03 }}
              textAnchor="middle"
            >
              {String(s.wert)}
            </SvgText>
          ) : null}
        </G>
      ))}
      <Circle cx={g.cx} cy={g.cy} r={groesse * 0.027} fill="#EEEEEE" stroke="#AFB3B5" />
    </Svg>
  );
}
