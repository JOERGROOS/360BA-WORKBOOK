// Ruhige Einzelseite: Logo, Überschrift, Text — für die neutrale Zugangsseite,
// „Diese Seite gibt es nicht" und ungültige Links. Eine Glaskarte, mittig, sonst nichts.
export function Mitteilung({ eyebrow, titel, children }: { eyebrow: string; titel: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-16">
      <div className="glas w-full max-w-[560px] text-center erscheint">
        <img src="/logo-full-white.svg" alt="JOERG ROOS" className="h-6 mx-auto" />
        <div className="eyebrow mt-8">{eyebrow}</div>
        <h1 className="font-semibold text-[30px] md:text-[34px] leading-[1.18] mt-3 mb-4">{titel}</h1>
        <div className="text-[16px] leading-relaxed text-[#C9CFD3] font-light">{children}</div>
      </div>
    </main>
  );
}

// Immer gleicher Text, wenn ein Link nicht (mehr) zu einer Sitzung gehört.
export function UngueltigerLink() {
  return (
    <Mitteilung eyebrow="360° Business-Analyse" titel={<>Dieser Link ist <span className="text-o">ungültig</span>.</>}>
      Schreib uns an <a className="underline text-o" href="mailto:office@joerg-roos.com">office@joerg-roos.com</a>, dann schicken wir dir einen neuen.
    </Mitteilung>
  );
}
