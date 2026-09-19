'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FinanzdatenUpload } from './FinanzdatenUpload';

type Kachel = { text: string; href: string };

function IconWorkbook() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3h6v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V3Z" />
      <path d="M8.5 17.5 9 15l5-5 2 2-5 5-2.5.5Z" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function KundenStart({ token, vorname, workbook, texte }: { token: string; vorname: string; workbook: Kachel; texte: Record<string, string> }) {
  const [upload, setUpload] = useState(false);
  return (
    <main>
      <div className="flex items-center px-12 py-6"><img src="/logo-full-white.svg" alt="JOERG ROOS" className="h-6" /></div>
      <div className="max-w-[820px] mx-auto px-8 pb-20 pt-6">
        <div className="eyebrow">Hallo {vorname}</div>
        <h1 className="font-semibold text-[36px] leading-[1.15] my-4">{texte.kacheln_titel}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Link href={workbook.href} className="card min-h-[220px] flex flex-col justify-between hover:border-o transition-colors">
            <div className="w-14 h-14 rounded-full bg-o/15 flex items-center justify-center text-o"><IconWorkbook /></div>
            <div>
              <div className="font-semibold text-[24px] mt-6">{workbook.text}</div>
              <p className="fine mt-2">{texte.kachel_workbook}</p>
            </div>
          </Link>
          <button type="button" onClick={() => setUpload(true)} className="card min-h-[220px] flex flex-col justify-between text-left hover:border-o transition-colors">
            <div className="w-14 h-14 rounded-full bg-o/15 flex items-center justify-center text-o"><IconUpload /></div>
            <div>
              <div className="font-semibold text-[24px] mt-6">Finanzdaten senden</div>
              <p className="fine mt-2">{texte.kachel_finanzdaten}</p>
            </div>
          </button>
        </div>
      </div>
      {upload && <FinanzdatenUpload token={token} hinweis={texte.upload_hinweis} schliessen={() => setUpload(false)} />}
    </main>
  );
}
