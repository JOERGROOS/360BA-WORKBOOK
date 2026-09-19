'use client';
export function FrageSkala({ wert, onChange }: { wert?: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2.5 md:gap-3 mt-5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const an = wert === n;
          return (
            <button key={n} type="button" onClick={() => onChange(n)} aria-pressed={an}
              className={`aspect-square rounded-[14px] border text-xl font-semibold transition-[transform,box-shadow,border-color,background] duration-150
                ${an
                  ? 'border-o text-white scale-105'
                  : 'border-white/10 bg-white/[.04] hover:border-o/60 hover:bg-o/10 hover:-translate-y-0.5'}`}
              style={an
                ? { background: 'linear-gradient(180deg,#F0902C,#ED7A02)', boxShadow: '0 8px 24px rgba(237,122,2,.4)' }
                : undefined}>
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between gap-3 text-[13px] text-muted mt-3"><span>1 · trifft überhaupt nicht zu</span><span className="text-right">10 · trifft voll und ganz zu</span></div>
    </div>
  );
}
