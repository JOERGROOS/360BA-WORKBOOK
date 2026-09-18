'use client';
import type { TabellenOptionen, TabellenWert } from '@/lib/db';

export function FrageTabelle({ optionen, wert, onChange }: { optionen: TabellenOptionen; wert: TabellenWert; onChange: (v: TabellenWert) => void }) {
  function setZelle(zeile: string, spalte: string, v: string) {
    onChange({ ...wert, [zeile]: { ...wert[zeile], [spalte]: v } });
  }
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-2">
        <thead>
          <tr>
            <th className="text-left" />
            {optionen.spalten.map((s) => (
              <th key={s} className="text-[12px] uppercase tracking-wider text-muted font-medium text-left px-2 pb-2">{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {optionen.zeilen.map((z) => (
            <tr key={z}>
              <td className="text-[15px] pr-4 whitespace-nowrap">{z}</td>
              {optionen.spalten.map((s) => (
                <td key={s} className="px-1">
                  <input inputMode="numeric" value={wert[z]?.[s] ?? ''} onChange={(e) => setZelle(z, s, e.target.value)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
