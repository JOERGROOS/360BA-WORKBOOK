import { texteLaden } from '@/lib/texte';

// Admin-Textänderungen sollen sofort sichtbar sein, nicht erst nach dem nächsten Build-Cache-Ablauf.
export const dynamic = 'force-dynamic';

export default async function Start() {
  const t = await texteLaden();
  return (
    <main>
      <div className="flex items-center justify-between px-12 py-6">
        <img src="/logo-full-white.svg" alt="JOERG ROOS" className="h-6" />
        <span className="text-[13px] tracking-[.14em] uppercase text-muted">360° Business-Analyse</span>
      </div>
      <div className="max-w-[620px] mx-auto px-8 pb-20 pt-10 text-center">
        <div className="eyebrow">360° Business-Analyse</div>
        <h1 className="font-semibold text-[36px] leading-[1.2] my-4">Dein Workbook</h1>
        <p className="text-[17px] leading-relaxed text-[#C9CFD3] font-light">{t.zugang_text}</p>
      </div>
    </main>
  );
}
