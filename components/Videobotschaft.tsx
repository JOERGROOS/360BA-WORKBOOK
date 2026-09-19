import { videoQuelle } from '@/lib/video';

// Videobotschaft über den Kacheln. Liegt in `video_url` (Admin → Texte) eine Vimeo- oder
// MP4-Adresse, wird sie eingebettet; sonst steht ein Platzhalter im Seiten-Look.
export function Videobotschaft({ adresse, hinweis }: { adresse: string; hinweis: string }) {
  const quelle = videoQuelle(adresse);
  return (
    <div className="glas mt-9 p-3 md:p-4">
      <div className="relative rounded-[14px] overflow-hidden bg-[#0B141B]" style={{ aspectRatio: '16 / 9' }}>
        {quelle?.art === 'vimeo' && (
          <iframe
            className="absolute inset-0 w-full h-full"
            src={quelle.adresse}
            title="Videobotschaft von Jörg Roos"
            allow="fullscreen; picture-in-picture"
            loading="lazy"
          />
        )}
        {quelle?.art === 'mp4' && (
          <video className="absolute inset-0 w-full h-full object-cover" src={quelle.adresse} controls preload="metadata" />
        )}
        {!quelle && <Platzhalter hinweis={hinweis} />}
      </div>
    </div>
  );
}

function Platzhalter({ hinweis }: { hinweis: string }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
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
        className="relative w-[70px] h-[70px] md:w-[84px] md:h-[84px] rounded-full flex items-center justify-center border border-o/35"
        style={{ background: 'radial-gradient(circle,rgba(237,122,2,.26),rgba(237,122,2,.06) 70%)', boxShadow: '0 0 42px rgba(237,122,2,.22)' }}
      >
        <svg viewBox="0 0 24 24" width="30" height="30" fill="#ED7A02" aria-hidden="true">
          <path d="M9 6.5v11l9-5.5-9-5.5Z" />
        </svg>
      </span>
      <div className="eyebrow relative mt-5">Videobotschaft</div>
      <p className="relative fine mt-2 max-w-[420px]">{hinweis}</p>
    </div>
  );
}
