import { sitzungLaden } from '@/lib/sitzung';
import { texteLaden } from '@/lib/texte';
import { fortschritt } from '@/lib/punkte';
import { KundenStart } from '@/components/KundenStart';

// Landeseite für JEDEN Sitzungsstatus: zwei Kacheln, Workbook und Finanzdaten-Upload.
// Das Interview selbst (inkl. Einladungsbestätigung) liegt unter /interview.
export default async function LandeSeite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) {
    return (
      <main className="max-w-[620px] mx-auto px-8 py-24 text-center">
        <p className="fine">Dieser Link ist ungültig. Schreib uns an <a className="underline" href="mailto:office@joerg-roos.com">office@joerg-roos.com</a>.</p>
      </main>
    );
  }
  const texte = await texteLaden();
  const prozent = fortschritt(s.fragen_snapshot, s.antworten).prozent;
  const workbook = s.status === 'eingeladen'
    ? { text: 'Interview starten →', href: `/w/${token}/interview` }
    : s.status === 'laufend'
      ? { text: `Weitermachen · ${prozent} % →`, href: `/w/${token}/interview` }
      : s.status === 'ergebnis'
        ? { text: 'Zum Ergebnis →', href: `/w/${token}/ergebnis` }
        : s.pdf_path
          ? { text: 'Fertig – Workbook herunterladen', href: `/w/${token}/fertig` }
          : { text: 'Zum Ergebnis →', href: `/w/${token}/ergebnis` };
  return <KundenStart token={token} vorname={s.vorname} workbook={workbook} texte={texte} />;
}
