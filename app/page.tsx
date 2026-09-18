import { texteLaden } from '@/lib/texte';
import { StartFormular } from '@/components/StartFormular';

export default async function Start() {
  const t = await texteLaden();
  const [vor, nach] = t.start_titel.split('360°');
  const hinweise = t.start_hinweise.split(' · ');
  return (
    <main>
      <div className="flex items-center justify-between px-12 py-6">
        <img src="/logo-full-white.svg" alt="JOERG ROOS" className="h-6" />
        <span className="text-[13px] tracking-[.14em] uppercase text-muted">360° Business-Analyse · Workbook</span>
      </div>
      <div className="max-w-[820px] mx-auto px-8 pb-20 pt-10">
        <div className="eyebrow">Schön, dass du dabei bist</div>
        <h1 className="font-semibold text-[44px] leading-[1.12] my-4">
          {vor}<br /><span className="text-o">360°{nach}</span>
        </h1>
        <p className="text-[17px] leading-relaxed text-[#C9CFD3] font-light max-w-[620px]">{t.start_text}</p>
        <div className="flex flex-wrap gap-6 my-8">
          {hinweise.map((h) => <span key={h} className="fine">{h}</span>)}
        </div>
        <StartFormular />
      </div>
    </main>
  );
}
