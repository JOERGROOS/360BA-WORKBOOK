import Link from 'next/link';

// Kurze, eigenständige Datenschutzerklärung nur für dieses Workbook (Sie-Form,
// wie bei Rechtstexten auf joerg-roos.com üblich). Verantwortlicher-Angaben stehen
// bewusst nicht hier verdoppelt, sondern verlinkt — das Impressum auf joerg-roos.com
// bleibt die einzige Quelle dafür.
export const metadata = { title: 'Datenschutz · 360° Business-Analyse', robots: { index: false, follow: false } };

function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="font-semibold text-[18px] mb-2.5">{titel}</h2>
      <div className="text-[15px] leading-[1.7] text-[#C9CFD3] font-light [&>p+p]:mt-3">{children}</div>
    </div>
  );
}

export default function DatenschutzSeite() {
  return (
    <main className="max-w-[720px] mx-auto px-6 md:px-8 pb-24 pt-14 erscheint">
      <Link href="/" className="text-[13px] text-white/40 hover:text-white/70 transition-colors">← Zurück</Link>
      <div className="eyebrow mt-6">360° Business-Analyse</div>
      <h1 className="font-semibold text-[30px] md:text-[36px] leading-[1.16] mt-3 mb-2">
        <span className="text-o">Datenschutz</span>erklärung
      </h1>
      <p className="fine">Ergänzend zur Datenschutzerklärung auf joerg-roos.com — nur für dieses Online-Workbook.</p>

      <Abschnitt titel="Was wir verarbeiten und wozu">
        <p>
          Wenn Sie sich für eine 360° Business-Analyse anmelden, bearbeiten Sie im Vorfeld dieses
          Online-Workbook. Dabei erfassen wir Ihre Kontaktdaten, Ihre Antworten auf die Fragen zu
          Ihrem Unternehmen sowie – wenn Sie sie hochladen – Ihre Finanzdaten. Zweck der
          Verarbeitung ist ausschließlich die Vorbereitung der 360° Business-Analyse.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, zur Durchführung vorvertraglicher
          Maßnahmen auf Ihre Anfrage hin.
        </p>
      </Abschnitt>

      <Abschnitt titel="Speicherort">
        <p>
          Ihre Angaben speichern wir bei Supabase, einem Anbieter mit Serverstandort in der EU. Der
          Betrieb dieses Workbooks selbst läuft über Vercel, mit Serverstandort Frankfurt am Main.
        </p>
      </Abschnitt>

      <Abschnitt titel="Sprachaufnahmen">
        <p>
          Beantworten Sie eine Frage per Spracheingabe, wird die Aufnahme zur Umwandlung in Text an
          OpenAI (USA) übertragen. Die Aufnahme selbst speichern wir nicht, und sie wird von OpenAI
          nicht zum Training von KI-Modellen verwendet – gespeichert wird ausschließlich der daraus
          erzeugte Text.
        </p>
        <p>
          Diesen Text glätten wir anschließend sprachlich mithilfe von Anthropic (USA), damit er
          sich flüssig liest – auch hierbei wird nur Text verarbeitet, keine Audiodaten, ebenfalls
          ohne Verwendung zum KI-Training. Beide Übermittlungen in die USA sind über
          EU-Standardvertragsklauseln gemäß Art. 46 Abs. 2 lit. c DSGVO abgesichert.
        </p>
      </Abschnitt>

      <Abschnitt titel="Videobotschaft">
        <p>
          Auf der Startseite ist optional eine Videobotschaft eingebunden. Sie wird über Vimeo
          ausgespielt; dabei überträgt Ihr Browser technische Daten (u. a. Ihre IP-Adresse) an
          Vimeo. Näheres dazu in der Datenschutzerklärung von Vimeo.
        </p>
      </Abschnitt>

      <Abschnitt titel="Interne Auswertung Ihrer Antworten">
        <p>
          Nach Abschluss des Workbooks erstellen wir – ebenfalls mithilfe von Anthropic (USA), unter
          denselben Bedingungen wie oben – zusätzlich eine interne Kurzanalyse Ihrer Antworten. Sie
          dient uns ausschließlich zur Vorbereitung auf den gemeinsamen Tag und geht nicht an Sie,
          sondern ausschließlich intern an unser Controlling.
        </p>
      </Abschnitt>

      <Abschnitt titel="E-Mail-Versand">
        <p>
          Den Link zu Ihrem Workbook sowie Ihr fertiges Workbook als PDF versenden wir über den
          Dienstleister Resend. Eine Kopie geht dabei jeweils an unser eigenes Controlling.
        </p>
      </Abschnitt>

      <Abschnitt titel="Speicherdauer und Löschung">
        <p>
          Wir speichern Ihre Angaben, solange die Zusammenarbeit mit uns besteht. Auf Anfrage an{' '}
          <a className="underline text-o" href="mailto:office@joerg-roos.com">office@joerg-roos.com</a>{' '}
          löschen wir Ihre Daten vorzeitig.
        </p>
      </Abschnitt>

      <Abschnitt titel="Ihre Rechte">
        <p>
          Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der
          Verarbeitung Ihrer Daten sowie ein Widerspruchsrecht, und Sie können sich bei einer
          Datenschutz-Aufsichtsbehörde beschweren. Wenden Sie sich dazu an{' '}
          <a className="underline text-o" href="mailto:office@joerg-roos.com">office@joerg-roos.com</a>.
        </p>
      </Abschnitt>

      <Abschnitt titel="Verantwortlicher">
        <p>
          Verantwortlich für diese Verarbeitung ist Jörg Roos. Alle Angaben dazu finden Sie im{' '}
          <a className="underline text-o" href="https://joerg-roos.com/impressum" target="_blank" rel="noopener noreferrer">
            Impressum auf joerg-roos.com
          </a>
          .
        </p>
      </Abschnitt>
    </main>
  );
}
