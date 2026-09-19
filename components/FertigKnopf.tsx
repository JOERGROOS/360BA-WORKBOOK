'use client';
import { useState } from 'react';

export function FertigKnopf({ token }: { token: string }) {
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState('');

  async function herunterladen() {
    setFehler(''); setLaedt(true);
    try {
      const res = await fetch(`/api/w/${token}/pdf`);
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.open(url, '_blank');
    } catch {
      setFehler('Das Workbook ist gerade nicht abrufbar. Bitte in einer Minute erneut versuchen.');
    } finally {
      setLaedt(false);
    }
  }

  return (
    <div className="text-center">
      <button type="button" className="btn text-[17px] px-9 py-5" disabled={laedt} onClick={herunterladen}>
        {laedt ? 'Öffne dein Workbook …' : (
          <>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 20h16" /></svg>
            Workbook jetzt herunterladen
          </>
        )}
      </button>
      {fehler && <p className="mt-4 text-[#ff7a52]">{fehler}</p>}
    </div>
  );
}
