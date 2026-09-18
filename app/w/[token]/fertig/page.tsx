import { redirect } from 'next/navigation';
import { sitzungLaden } from '@/lib/sitzung';
import { punkteJeFaktor } from '@/lib/punkte';
import { ErfolgsradSvg } from '@/components/ErfolgsradSvg';
import { FertigKnopf } from '@/components/FertigKnopf';

export default async function FertigSeite({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ mail?: string }> }) {
  const { token } = await params;
  const { mail } = await searchParams;
  const s = await sitzungLaden(token);
  if (!s) {
    return (
      <main className="max-w-[620px] mx-auto px-8 py-24 text-center">
        <p className="fine">Dieser Link ist ungültig. Schreib uns an <a className="underline" href="mailto:office@joerg-roos.com">office@joerg-roos.com</a>.</p>
      </main>
    );
  }
  if (s.status !== 'abgeschlossen') redirect(`/w/${token}/ergebnis`);
  const punkte = punkteJeFaktor(s.fragen_snapshot, s.antworten);

  return (
    <main className="max-w-[620px] mx-auto px-8 pb-24 text-center">
      <div className="flex items-center justify-center py-6"><img src="/logo-full-white.svg" alt="JOERG ROOS" className="h-6" /></div>
      <div className="flex justify-center my-8"><ErfolgsradSvg werte={punkte} groesse={260} /></div>
      <div className="eyebrow">Fertig</div>
      <h1 className="font-semibold text-[32px] leading-[1.2] my-4">Dein Workbook ist unterwegs, {s.vorname}.</h1>
      <p className="text-[16px] leading-relaxed text-[#C9CFD3] font-light">
        Du bekommst es in den nächsten Minuten per E-Mail an {s.email}. Jörg hat dieselbe Fassung und bereitet damit euren gemeinsamen Tag vor. Denk an deine Finanzdaten für den Finanzcheck – spätestens vier Arbeitstage vor dem Treffen an controlling@joerg-roos.com.
      </p>
      {mail === 'fehler' && (
        <p className="text-[16px] leading-relaxed text-[#ff7a52] mt-4">
          Die E-Mail konnte gerade nicht verschickt werden – lade dein Workbook hier herunter. Wir schicken es dir nach.
        </p>
      )}
      <div className="flex justify-center mt-8"><FertigKnopf token={token} /></div>
    </main>
  );
}
