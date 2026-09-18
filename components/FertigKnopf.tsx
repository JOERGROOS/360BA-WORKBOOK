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
    <div>
      <button type="button" className="btn text-[16px] px-8 py-4" disabled={laedt} onClick={herunterladen}>
        {laedt ? 'Öffne dein Workbook …' : 'Workbook jetzt herunterladen'}
      </button>
      {fehler && <p className="mt-4 text-[#ff7a52]">{fehler}</p>}
    </div>
  );
}
