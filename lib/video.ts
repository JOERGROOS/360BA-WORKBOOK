// Deutet die im Admin gepflegte Adresse `video_url` und sagt, was die Landeseite zeigen soll.
// Bewusst abhängigkeitsfrei, damit `scripts/check-video.mjs` sie ohne Next.js prüfen kann.
// Nur https wird angenommen — alles andere (http, javascript:, data:, Unsinn) fällt auf den
// Platzhalter zurück, weil die Adresse aus einem Eingabefeld kommt und direkt in ein
// iframe/video-Element wandert.

export type VideoQuelle = { art: 'vimeo' | 'mp4'; adresse: string } | null;

export function videoQuelle(roh: string | undefined): VideoQuelle {
  const text = (roh ?? '').trim();
  if (!text) return null;

  let u: URL;
  try {
    u = new URL(text);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;

  const host = u.hostname.toLowerCase();
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
    // trägt sowohl vimeo.com/76979871 als auch player.vimeo.com/video/76979871
    // (mit Kanal-Präfix wie vimeo.com/channels/staffpicks/76979871 ebenfalls).
    const id = u.pathname.split('/').filter(Boolean).pop() ?? '';
    if (!/^\d+$/.test(id)) return null;
    return { art: 'vimeo', adresse: `https://player.vimeo.com/video/${id}?dnt=1&title=0&byline=0&portrait=0` };
  }
  if (/\.mp4$/i.test(u.pathname)) return { art: 'mp4', adresse: u.toString() };
  return null;
}
