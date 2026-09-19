import { texteLaden } from '@/lib/texte';
import { Mitteilung } from '@/components/Mitteilung';

// Admin-Textänderungen sollen sofort sichtbar sein, nicht erst nach dem nächsten Build-Cache-Ablauf.
export const dynamic = 'force-dynamic';

export default async function Start() {
  const t = await texteLaden();
  return (
    <Mitteilung eyebrow="360° Business-Analyse" titel={<>Dein <span className="text-o">Workbook</span></>}>
      {t.zugang_text}
    </Mitteilung>
  );
}
