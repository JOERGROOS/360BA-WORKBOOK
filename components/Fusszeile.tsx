// Klein, unten, auf jeder Seite (über das Root-Layout eingebunden) — Impressum
// verweist auf joerg-roos.com, Datenschutz ist eine eigene, kurze Seite hier.
export function Fusszeile() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-center gap-4 py-3 text-[11.5px] text-white/35 pointer-events-none">
      <a
        href="https://joerg-roos.com/impressum"
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto hover:text-white/65 transition-colors"
      >
        Impressum
      </a>
      <span aria-hidden="true">·</span>
      <a href="/datenschutz" className="pointer-events-auto hover:text-white/65 transition-colors">
        Datenschutz
      </a>
    </div>
  );
}
