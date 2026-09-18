'use client';
export function FrageSkala({ wert, onChange }: { wert?: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2.5 mt-4">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} aria-pressed={wert === n}
            className={`aspect-square rounded-[14px] border text-xl font-semibold ${wert === n ? 'bg-o border-o' : 'bg-blue border-line hover:border-o'}`}>{n}</button>
        ))}
      </div>
      <div className="flex justify-between text-[13px] text-muted mt-2.5"><span>1 · trifft überhaupt nicht zu</span><span>10 · trifft voll und ganz zu</span></div>
    </div>
  );
}
