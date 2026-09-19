'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FinanzdatenUpload } from './FinanzdatenUpload';
import { Kopf } from './Kopf';
import { Zweifarbig } from './Zweifarbig';

type Kachel = { text: string; href: string; prozent: number; zeigtFortschritt: boolean };

function IconWorkbook() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3h6v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V3Z" />
      <path d="M8.5 17.5 9 15l5-5 2 2-5 5-2.5.5Z" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}
function IconPfeil() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function Symbolkreis({ kinder }: { kinder: React.ReactNode }) {
  return (
    <div className="w-16 h-16 rounded-full flex items-center justify-center text-o shrink-0"
      style={{ background: 'radial-gradient(circle,rgba(237,122,2,.26),rgba(237,122,2,.08) 70%)', boxShadow: '0 0 28px rgba(237,122,2,.18)' }}>
      {kinder}
    </div>
  );
}

export function KundenStart({ token, vorname, workbook, texte }: { token: string; vorname: string; workbook: Kachel; texte: Record<string, string> }) {
  const [upload, setUpload] = useState(false);
  const gruss = `Hallo ${vorname}, schön dass du da bist`;
  return (
    <main>
      <Kopf kinder={<span className="text-[13px] tracking-[.14em] uppercase text-muted">360° Business-Analyse</span>} />
      <div className="max-w-[900px] mx-auto px-6 md:px-8 pb-24 pt-8 erscheint">
        <div className="eyebrow">Dein Workbook</div>
        <h1 className="font-semibold text-[34px] md:text-[46px] leading-[1.14] mt-3 mb-3">
          <Zweifarbig text={gruss} wort="schön dass du da bist" />
        </h1>
        <p className="text-[16px] md:text-[17px] leading-relaxed text-[#C9CFD3] font-light max-w-[620px]">{texte.kacheln_titel}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 mt-9">
          <Link href={workbook.href} className="glas glas--hebt min-h-[250px] flex flex-col justify-between group">
            <div className="flex items-start justify-between gap-4">
              <Symbolkreis kinder={<IconWorkbook />} />
              {workbook.zeigtFortschritt && (
                <span className="inline-flex items-center gap-2 rounded-full border border-o/40 bg-o/10 px-3 py-1.5 text-[13px] font-medium">
                  <span className="relative block w-[26px] h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <i className="absolute inset-y-0 left-0 rounded-full bg-o" style={{ width: `${workbook.prozent}%` }} />
                  </span>
                  {workbook.prozent} %
                </span>
              )}
            </div>
            <div>
              <div className="font-semibold text-[26px] leading-tight mt-7 flex items-center gap-2.5">
                {workbook.text}
                <span className="text-o transition-transform duration-150 group-hover:translate-x-1"><IconPfeil /></span>
              </div>
              <p className="fine mt-2.5">{texte.kachel_workbook}</p>
            </div>
          </Link>

          <button type="button" onClick={() => setUpload(true)} className="glas glas--hebt min-h-[250px] flex flex-col justify-between text-left group">
            <Symbolkreis kinder={<IconUpload />} />
            <div>
              <div className="font-semibold text-[26px] leading-tight mt-7 flex items-center gap-2.5">
                Finanzdaten senden
                <span className="text-o transition-transform duration-150 group-hover:translate-x-1"><IconPfeil /></span>
              </div>
              <p className="fine mt-2.5">{texte.kachel_finanzdaten}</p>
            </div>
          </button>
        </div>
      </div>
      {upload && <FinanzdatenUpload token={token} hinweis={texte.upload_hinweis} schliessen={() => setUpload(false)} />}
    </main>
  );
}
