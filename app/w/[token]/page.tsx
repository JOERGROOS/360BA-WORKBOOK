import { redirect } from 'next/navigation';
import { sitzungLaden } from '@/lib/sitzung';
import { Interview } from '@/components/Interview';

export default async function InterviewSeite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) {
    return (
      <main className="max-w-[620px] mx-auto px-8 py-24 text-center">
        <p className="fine">Dieser Link ist ungültig. Schreib uns an <a className="underline" href="mailto:office@joerg-roos.com">office@joerg-roos.com</a>.</p>
      </main>
    );
  }
  if (s.status === 'abgeschlossen') redirect(`/w/${token}/fertig`);
  return <Interview token={token} snapshot={s.fragen_snapshot} antworten={s.antworten} start={s.aktuelle_frage} vorname={s.vorname} />;
}
