export function Fortschritt({ kapitel, aktuellesKapitel, prozent }: { kapitel: { titel: string }[]; aktuellesKapitel: number; prozent: number }) {
  const kurz = (t: string) => t.replace('Ein paar Fakten zum Einstieg', 'Ein paar Fakten').replace('Unternehmerpersönlichkeit', 'Persönlichkeit').replace(' & wirtschaftliche Lage', '').replace(' & Leistungserbringung', '').replace(' (Vertrieb)', '');
  return (
    <div className="px-12">
      <div className="h-1 rounded bg-line overflow-hidden"><i className="block h-full rounded" style={{ width: `${prozent}%`, background: 'linear-gradient(90deg,#9F3C07,#ED7A02)' }} /></div>
      <div className="flex gap-1.5 mt-3.5">
        {[...kapitel, { titel: 'Ergebnis' }].map((k, i) => (
          <b key={i} className="flex-1 h-1.5 rounded relative" style={{ background: i < aktuellesKapitel ? '#ED7A02' : i === aktuellesKapitel ? 'linear-gradient(90deg,#ED7A02 60%,#2A353D 60%)' : '#2A353D' }}>
            <span className="absolute top-3 left-0 text-[10px] font-medium uppercase tracking-wider text-muted whitespace-nowrap hidden md:block">{kurz(k.titel)}</span>
          </b>
        ))}
      </div>
    </div>
  );
}
