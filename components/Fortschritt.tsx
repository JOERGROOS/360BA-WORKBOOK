export function Fortschritt({ kapitel, aktuellesKapitel, prozent }: { kapitel: { titel: string }[]; aktuellesKapitel: number; prozent: number }) {
  const kurz = (t: string) => t.replace('Ein paar Fakten zum Einstieg', 'Ein paar Fakten').replace('Unternehmerpersönlichkeit', 'Persönlichkeit').replace(' & wirtschaftliche Lage', '').replace(' & Leistungserbringung', '').replace(' (Vertrieb)', '');
  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-10 pt-5">
      <div className="h-1 rounded-full bg-white/[.07] overflow-hidden">
        <i className="block h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${prozent}%`, background: 'linear-gradient(90deg,#9F3C07,#F0902C)', boxShadow: '0 0 12px rgba(237,122,2,.45)' }} />
      </div>
      <div className="flex gap-1.5 mt-3.5">
        {[...kapitel, { titel: 'Ergebnis' }].map((k, i) => {
          const fertig = i < aktuellesKapitel, jetzt = i === aktuellesKapitel;
          return (
            <b key={i} className="flex-1 h-1.5 rounded-full relative"
              style={{
                background: fertig ? '#ED7A02' : jetzt ? 'linear-gradient(90deg,#F0902C 60%,rgba(255,255,255,.08) 60%)' : 'rgba(255,255,255,.08)',
                boxShadow: jetzt ? '0 0 14px rgba(237,122,2,.5)' : 'none',
              }}>
              {/* Beschriftung bleibt im eigenen Abschnitt — sonst laufen lange Kapitelnamen ineinander. */}
              <span className={`absolute top-3 left-0 right-1.5 text-[10px] font-medium uppercase tracking-wider truncate hidden md:block ${jetzt ? 'text-o' : 'text-muted'}`}>{kurz(k.titel)}</span>
            </b>
          );
        })}
      </div>
    </div>
  );
}
