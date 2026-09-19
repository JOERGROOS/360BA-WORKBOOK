import { redirect } from 'next/navigation';
import { sitzungLaden } from '@/lib/sitzung';
import { UngueltigerLink } from '@/components/Mitteilung';
import { punkteJeFaktor } from '@/lib/punkte';
import { ErfolgsradSvg } from '@/components/ErfolgsradSvg';
import { FertigKnopf } from '@/components/FertigKnopf';
import { Kopf } from '@/components/Kopf';
import { Zweifarbig } from '@/components/Zweifarbig';

export default async function FertigSeite({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ mail?: string }> }) {
  const { token } = await params;
  const { mail } = await searchParams;
  const s = await sitzungLaden(token);
  if (!s) {
    return <UngueltigerLink />;
  }
  if (s.status === 'eingeladen') redirect(`/w/${token}`);
  // Ohne PDF nichts zu zeigen — auch bei status "abgeschlossen" (gestrandete Zeile) zurück zum Ergebnis.
  if (s.status !== 'abgeschlossen' || !s.pdf_path) redirect(`/w/${token}/ergebnis`);
  const punkte = punkteJeFaktor(s.fragen_snapshot, s.antworten);

  return (
    <main>
      <Kopf />
      <div className="max-w-[720px] mx-auto px-6 md:px-8 pb-24 pt-4 text-center erscheint">
        <div className="w-[88px] h-[88px] rounded-full mx-auto flex items-center justify-center"
          style={{ background: 'radial-gradient(circle,rgba(237,122,2,.30),rgba(237,122,2,.06) 70%)', boxShadow: '0 0 44px rgba(237,122,2,.22)' }}>
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#ED7A02" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m4 12.5 5.5 5.5L20 7" /></svg>
        </div>
        <div className="eyebrow mt-8">Fertig</div>
        <h1 className="font-semibold text-[30px] md:text-[38px] leading-[1.16] mt-3 mb-4">
          <Zweifarbig text={`Dein Workbook ist unterwegs, ${s.vorname}.`} wort="ist unterwegs" />
        </h1>
        <p className="text-[16px] leading-relaxed text-[#C9CFD3] font-light max-w-[600px] mx-auto">
          Du bekommst es in den nächsten Minuten per E-Mail an {s.email}. Jörg hat dieselbe Fassung und bereitet damit euren gemeinsamen Tag vor. Denk an deine Finanzdaten für den Finanzcheck – spätestens vier Arbeitstage vor dem Treffen an controlling@joerg-roos.com.
        </p>
        {mail === 'fehler' && (
          <p className="text-[15.5px] leading-relaxed text-[#ff7a52] mt-4 max-w-[600px] mx-auto">
            Die E-Mail konnte gerade nicht verschickt werden – lade dein Workbook hier herunter. Wir schicken es dir nach.
          </p>
        )}
        <div className="glas mt-9 flex flex-col items-center gap-6">
          <FertigKnopf token={token} />
          <div className="w-full max-w-[220px] opacity-90"><ErfolgsradSvg werte={punkte} groesse={220} /></div>
        </div>
      </div>
    </main>
  );
}
