import { sitzungLaden } from '@/lib/sitzung';
import { UngueltigerLink } from '@/components/Mitteilung';
import { texteLaden } from '@/lib/texte';
import { fortschritt } from '@/lib/punkte';
import { KundenStart } from '@/components/KundenStart';

// Landeseite für JEDEN Sitzungsstatus: zwei Kacheln, Workbook und Finanzdaten-Upload.
// Das Interview selbst (inkl. Einladungsbestätigung) liegt unter /interview.
export default async function LandeSeite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await sitzungLaden(token);
  if (!s) {
    return <UngueltigerLink />;
  }
  const texte = await texteLaden();
  const prozent = fortschritt(s.fragen_snapshot, s.antworten).prozent;
  // Der Prozentwert steht jetzt als eigener Chip auf der Kachel, nicht mehr im Knopftext.
  const workbook = s.status === 'eingeladen'
    ? { text: 'Interview starten', href: `/w/${token}/interview`, prozent, zeigtFortschritt: false }
    : s.status === 'laufend'
      ? { text: 'Weitermachen', href: `/w/${token}/interview`, prozent, zeigtFortschritt: true }
      : s.status === 'ergebnis'
        ? { text: 'Zum Ergebnis', href: `/w/${token}/ergebnis`, prozent, zeigtFortschritt: true }
        : s.pdf_path
          ? { text: 'Workbook herunterladen', href: `/w/${token}/fertig`, prozent, zeigtFortschritt: false }
          : { text: 'Zum Ergebnis', href: `/w/${token}/ergebnis`, prozent, zeigtFortschritt: true };
  return <KundenStart token={token} vorname={s.vorname} workbook={workbook} texte={texte} />;
}
