'use client';

export function FrageText({ wert, onChange, onWeiter, mikro }: { wert: string; onChange: (v: string) => void; onWeiter?: () => void; mikro?: React.ReactNode }) {
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter macht Zeilenumbruch (Standardverhalten), Strg/Cmd+Enter geht weiter.
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onWeiter?.(); }
  }
  return (
    <div className="relative">
      <textarea autoFocus value={wert} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} style={{ minHeight: 170 }} />
      <div id="mikro-slot" className="absolute right-3.5 bottom-3.5">{mikro}</div>
    </div>
  );
}
