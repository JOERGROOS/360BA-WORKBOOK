import { texteLaden } from '@/lib/texte';
import { Mitteilung } from '@/components/Mitteilung';

// Admin-Textänderungen sollen sofort sichtbar sein, nicht erst nach dem nächsten Build-Cache-Ablauf.
export const dynamic = 'force-dynamic';

export default async function Start() {
  const t = await texteLaden();
  return (
    // Das Produkt steht im Fokus (große Überschrift), die Phase ist der kleine Hinweis
    // darüber — nicht umgekehrt. So bleibt „360° Business-Analyse" immer einzeilig.
    <Mitteilung eyebrow="Phase 1 · Interview & Finanzdaten" titel={<>360° <span className="text-o">Business-Analyse</span></>}>
      <div className="flex flex-col gap-4">
        {t.zugang_text.split('\n').filter((a) => a.trim()).map((a, i) => <p key={i}>{a}</p>)}
      </div>
    </Mitteilung>
  );
}
