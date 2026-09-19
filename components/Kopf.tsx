// Gemeinsame Kopfzeile aller Kundenseiten: Logo links, freier Bereich rechts.
// `klebt` macht sie zur mitlaufenden Glasleiste (Interview).
export function Kopf({ kinder, klebt = false }: { kinder?: React.ReactNode; klebt?: boolean }) {
  return (
    <header
      className={
        klebt
          ? 'sticky top-0 z-30 border-b border-white/[.07] bg-[rgba(11,20,27,.72)] backdrop-blur-xl'
          : ''
      }
    >
      <div className="flex items-center justify-between gap-4 flex-wrap max-w-[1100px] mx-auto px-6 md:px-10 py-5">
        <img src="/logo-full-white.svg" alt="JOERG ROOS" className="h-[22px] md:h-6" />
        {kinder}
      </div>
    </header>
  );
}
