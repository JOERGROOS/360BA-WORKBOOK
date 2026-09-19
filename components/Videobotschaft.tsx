'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { videoQuelle, type VideoQuelle } from '@/lib/video';

// Videobotschaft als schmale Kachel rechts im Einstiegstext (der Text läuft drum herum,
// mobil steht sie über dem Text). Liegt in `video_url` (Admin → Texte) eine Vimeo- oder
// MP4-Adresse, wird sie eingebettet; sonst steht ein Platzhalter im Seiten-Look.
// „Vergrößern“ öffnet dieselbe Fläche als Overlay auf zwei Drittel der Seitenbreite —
// per Portal am body, weil der Seitencontainer (Einblend-Animation) sonst als Bezugsrahmen
// für `fixed` wirkt und das Overlay auf 900 px einsperrt.
export function Videobotschaft({ adresse, hinweis }: { adresse: string; hinweis: string }) {
  const quelle = videoQuelle(adresse);
  const [gross, setGross] = useState(false);
  return (
    <>
      <div className="glas p-2.5 mb-5 md:float-right md:w-[42%] md:ml-7 md:mb-3 md:mt-1">
        <div className="relative rounded-[14px] overflow-hidden bg-[#0B141B]" style={{ aspectRatio: '16 / 9' }}>
          <VideoFlaeche quelle={quelle} hinweis={hinweis} klein />
          <button
            type="button"
            onClick={() => setGross(true)}
            aria-label="Video vergrößern"
            title="Video vergrößern"
            className="absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center bg-black/55 border border-white/15 text-white/85 hover:bg-o hover:border-o hover:text-white transition-colors"
          >
            <IconVergroessern />
          </button>
        </div>
      </div>
      {gross && createPortal(<VideoOverlay quelle={quelle} hinweis={hinweis} schliessen={() => setGross(false)} />, document.body)}
    </>
  );
}

function VideoOverlay({ quelle, hinweis, schliessen }: { quelle: VideoQuelle; hinweis: string; schliessen: () => void }) {
  const kasten = useRef<HTMLDivElement>(null);
  useEffect(() => { kasten.current?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={schliessen}>
      <div
        ref={kasten}
        role="dialog"
        aria-modal="true"
        aria-label="Videobotschaft von Jörg Roos"
        tabIndex={-1}
        className="glas p-3 md:p-4 w-full md:w-2/3 outline-none erscheint"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') schliessen(); }}
      >
        <div className="relative rounded-[14px] overflow-hidden bg-[#0B141B]" style={{ aspectRatio: '16 / 9' }}>
          <VideoFlaeche quelle={quelle} hinweis={hinweis} />
          <button
            type="button"
            onClick={schliessen}
            aria-label="Video schließen"
            title="Schließen"
            className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center bg-black/55 border border-white/15 text-white/85 hover:bg-o hover:border-o hover:text-white transition-colors"
          >
            <IconSchliessen />
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoFlaeche({ quelle, hinweis, klein }: { quelle: VideoQuelle; hinweis: string; klein?: boolean }) {
  if (quelle?.art === 'vimeo') {
    return (
      <iframe
        className="absolute inset-0 w-full h-full"
        src={quelle.adresse}
        title="Videobotschaft von Jörg Roos"
        allow="fullscreen; picture-in-picture"
        loading="lazy"
      />
    );
  }
  if (quelle?.art === 'mp4') {
    return <video className="absolute inset-0 w-full h-full object-cover" src={quelle.adresse} controls preload="metadata" />;
  }
  return <Platzhalter hinweis={hinweis} klein={klein} />;
}

function Platzhalter({ hinweis, klein }: { hinweis: string; klein?: boolean }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-5"
      style={{
        background:
          'radial-gradient(520px 340px at 50% 118%,rgba(237,122,2,.20),rgba(11,20,27,0) 70%),linear-gradient(180deg,#101C25 0%,#0B141B 100%)',
      }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 opacity-40"
        style={{ background: "url('/bg-plexus.svg') center/cover no-repeat" }}
      />
      <span
        aria-hidden="true"
        className={`relative rounded-full flex items-center justify-center border border-o/35 ${klein ? 'w-[52px] h-[52px]' : 'w-[70px] h-[70px] md:w-[84px] md:h-[84px]'}`}
        style={{ background: 'radial-gradient(circle,rgba(237,122,2,.26),rgba(237,122,2,.06) 70%)', boxShadow: '0 0 42px rgba(237,122,2,.22)' }}
      >
        <svg viewBox="0 0 24 24" width={klein ? 22 : 30} height={klein ? 22 : 30} fill="#ED7A02" aria-hidden="true">
          <path d="M9 6.5v11l9-5.5-9-5.5Z" />
        </svg>
      </span>
      <div className={`eyebrow relative ${klein ? 'mt-3' : 'mt-5'}`}>Videobotschaft</div>
      {!klein && <p className="relative fine mt-2 max-w-[420px]">{hinweis}</p>}
    </div>
  );
}

function IconVergroessern() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="m21 3-7 7" /><path d="m3 21 7-7" />
    </svg>
  );
}
function IconSchliessen() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12" /><path d="M18 6 6 18" />
    </svg>
  );
}
