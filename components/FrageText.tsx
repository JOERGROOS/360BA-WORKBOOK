'use client';

export function FrageText({ wert, onChange, onWeiter, mikro }: { wert: string; onChange: (v: string) => void; onWeiter?: () => void; mikro?: React.ReactNode }) {
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter macht Zeilenumbruch (Standardverhalten), Strg/Cmd+Enter geht weiter.
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onWeiter?.(); }
  }
  return (
    <div className="relative mt-5">
      <textarea autoFocus value={wert} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
        placeholder="Tippen oder einsprechen …"
        style={{ minHeight: 190, paddingRight: 80, paddingTop: 18, paddingBottom: 18 }} />
      <div id="mikro-slot" className="absolute right-4 bottom-4">{mikro}</div>
    </div>
  );
}
