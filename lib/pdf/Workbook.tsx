import path from 'node:path';
import { Document, Page, View, Text, Image, Link, Svg, Rect, Defs, LinearGradient, Stop, StyleSheet } from '@react-pdf/renderer';
import type { Sitzung, SnapshotFrage, TabellenWert } from '@/lib/db';
import { punkteJeFaktor } from '@/lib/punkte';
import { ErfolgsradPdf } from './ErfolgsradPdf';

const pub = (n: string) => path.join(process.cwd(), 'public', n);

// CI-Farben (01-ATLAS/memory/context/ci-design.md)
const O = '#ED7A02', BLAU = '#0F1B23', GRAU = '#5F676C', LINIE = '#E2E6E9';
const KARTE = '#F7F7F7', ZEBRA = '#FFFFFF', WASSER = '#F0F0F0', PILLE = '#FDEBD9';

// ---------------------------------------------------------------------------
// react-pdf-4.9-Eigenheiten (empirisch isoliert, bitte beim Umbau beachten)
//
// 1. Kein lineHeight auf Seitenebene (st.seite) — Yoga bringt sonst die feste
//    Fußzeile (position:'absolute', bottom) aus dem Takt, sie wird gar nicht
//    mehr gerendert. lineHeight deshalb nur an den Fließtext-Stilen.
// 2. lineHeight wirkt NUR, wenn am selben Element auch fontSize steht. Dann
//    gilt schlicht: Zeilenabstand = lineHeight × fontSize (mit pdftotext -bbox
//    nachgemessen: fontSize 11 + lineHeight 1.0 ergibt exakt 11,00 pt Abstand).
//    Fehlt fontSize, ignoriert react-pdf den Wert und nimmt die natürliche
//    Zeilenhöhe der Schrift — bei Montserrat rund 1,36 × Schriftgröße (10,8 pt
//    Fließtext ohne eigenes fontSize maß 14,7 pt). Daher trägt hier JEDER Stil
//    mit lineHeight auch ein fontSize. Der früher dokumentierte 12/7-Faktor
//    existiert nicht.
// 3. Kein fontStyle:'italic' — es liegt keine kursive Montserrat unter
//    public/fonts/, react-pdf bricht sonst mit "Could not resolve font" ab.
// ---------------------------------------------------------------------------
const GROESSE = 10.8;  // Fließtext
const ZH = 1.35;       // Zeilenabstand als Vielfaches der Schriftgröße

const st = StyleSheet.create({
  seite: { fontFamily: 'Montserrat', fontSize: 10.8, color: BLAU, paddingTop: 78, paddingBottom: 62, paddingHorizontal: 60 },
  dunkel: { fontFamily: 'Montserrat', color: '#FFFFFF', padding: 60 },

  kopf: { position: 'absolute', top: 34, left: 60, right: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { width: 96, height: 96 / 7.87 }, // Proportion 7,87 : 1 — nie unabhängig setzen
  kopfText: { fontSize: 7.5, letterSpacing: 1.4, color: GRAU, textTransform: 'uppercase', fontWeight: 500 },
  kopfLinie: { position: 'absolute', top: 54, left: 60, right: 60, height: 0.6, backgroundColor: LINIE },
  kopfAkzent: { position: 'absolute', top: 53, left: 60, width: 30, height: 2, backgroundColor: O },
  fuss: { position: 'absolute', bottom: 30, left: 60, right: 60, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: GRAU },

  eyebrow: { fontSize: 8.5, letterSpacing: 1.6, color: O, fontWeight: 600, textTransform: 'uppercase', marginBottom: 7 },
  h1: { fontSize: 24, fontWeight: 600, marginBottom: 16, lineHeight: 1.25 },
  h2: { fontSize: 12.5, fontWeight: 600, marginTop: 16, marginBottom: 5, lineHeight: 1.3 },
  absatz: { marginBottom: 9, fontSize: GROESSE, fontWeight: 300, lineHeight: ZH },

  // Frage & Antwort
  frageZeile: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 },
  punkt: { width: 15, height: 15, borderRadius: 7.5, backgroundColor: O, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  punktZahl: { fontSize: 7, color: '#FFFFFF', fontWeight: 600 },
  frageText: { flex: 1, fontSize: 8.8, letterSpacing: 0.7, color: BLAU, textTransform: 'uppercase', fontWeight: 600, lineHeight: 1.3, paddingTop: 1 },
  karte: { backgroundColor: KARTE, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: O, paddingVertical: 9, paddingHorizontal: 11, marginBottom: 13 },
  antwort: { fontSize: 11, fontWeight: 400, lineHeight: ZH },
  leer: { fontSize: 11, color: GRAU, fontWeight: 300, lineHeight: ZH },

  // Tabellen
  zeile: { flexDirection: 'row', paddingVertical: 5.5, paddingHorizontal: 7 },
  zelleText: { flex: 1, fontSize: 10.5, lineHeight: ZH },
  zelleWert: { width: 44, textAlign: 'right', fontSize: 10.5, fontWeight: 600, lineHeight: ZH },
  kopfzeile: { flexDirection: 'row', backgroundColor: BLAU, paddingVertical: 6, paddingHorizontal: 7, borderTopLeftRadius: 7, borderTopRightRadius: 7 },
  kopfzelle: { color: O, fontSize: 8.5, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 },

  // Inhaltsverzeichnis
  ivzZeile: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 11, textDecoration: 'none', color: BLAU },
  ivzTitel: { fontSize: 11.5, fontWeight: 400 },
  ivzFuehrung: { flex: 1, borderBottomWidth: 0.7, borderBottomColor: '#C9CFD3', borderBottomStyle: 'dotted', marginHorizontal: 7, marginBottom: 3 },
  ivzNummer: { width: 22, textAlign: 'right', fontSize: 11.5, fontWeight: 600, color: O },
});

// A4 in Punkt. Ganzseitige Hintergründe brauchen feste Maße UND `fixed`:
// mit height:'100%' rechnet react-pdf gegen den Inhaltsbereich (Seite minus
// Polsterung) und schiebt den Inhalt zusätzlich auf eine zweite Seite, weil die
// absolut gesetzten Kinder sonst im Umbruch mitzählen (in 4.9 nachgemessen).
const A4_B = 595.28, A4_H = 841.89;
const bild = (n: string) => <Image src={pub(n)} style={{ position: 'absolute', top: 0, left: 0, width: A4_B, height: A4_H }} fixed />;
const schleier = <View style={{ position: 'absolute', top: 0, left: 0, width: A4_B, height: A4_H, backgroundColor: 'rgba(10,17,24,0.32)' }} fixed />;

/** Merkt sich beim ersten Render-Durchlauf, auf welcher Seite ein Abschnitt beginnt,
 *  und setzt zugleich die Sprungmarke für die Verweise im Inhaltsverzeichnis. */
function Marke({ id, seiten }: { id: string; seiten: Map<string, number> }) {
  return (
    <Text
      id={id}
      style={{ height: 0, fontSize: 1 }}
      render={({ pageNumber }) => {
        seiten.set(id, pageNumber);
        return '';
      }}
    />
  );
}

function Rahmen({ children, kopf }: { children: React.ReactNode; kopf: string }) {
  return (
    <Page size="A4" style={st.seite}>
      <View style={st.kopf} fixed>
        <Image src={pub('logo-full.png')} style={st.logo} />
        <Text style={st.kopfText}>{kopf}</Text>
      </View>
      <View style={st.kopfLinie} fixed />
      <View style={st.kopfAkzent} fixed />
      {children}
      <View style={st.fuss} fixed>
        <Text>Copyright © {new Date().getFullYear()} · Jörg Roos</Text>
        <Text render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`} />
      </View>
    </Page>
  );
}

/** Dunkle Kapitelseite im Look des Deckblatts. */
function Kapiteltrenner({ nummer, titel, unter, id, seiten }: { nummer: string; titel: string; unter?: string; id: string; seiten: Map<string, number> }) {
  return (
    <Page size="A4" style={st.dunkel}>
      {bild('cover-dunkel.png')}
      {schleier}
      <Text style={{ position: 'absolute', top: 96, right: 54, fontSize: 150, fontWeight: 600, color: 'rgba(237,122,2,0.16)' }}>{nummer}</Text>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Marke id={id} seiten={seiten} />
        {unter ? <Text style={{ fontSize: 9, letterSpacing: 1.8, color: O, textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>{unter}</Text> : null}
        <Text style={{ fontSize: 32, fontWeight: 600, lineHeight: 1.25 }}>{titel}</Text>
        <View style={{ width: 54, height: 3, backgroundColor: O, marginTop: 18 }} />
      </View>
    </Page>
  );
}

function Absaetze({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\n+/).map((a, i) => {
        const [erste, ...rest] = a.split('\n');
        const istTitel = rest.length > 0 && erste.length < 60 && !/[.!?:]$/.test(erste);
        return istTitel ? (
          <View key={i}>
            <Text style={st.h2}>{erste}</Text>
            <Text style={st.absatz}>{rest.join('\n')}</Text>
          </View>
        ) : (
          <Text key={i} style={st.absatz}>{a}</Text>
        );
      })}
    </>
  );
}

function AntwortKarte({ frage, wert }: { frage: SnapshotFrage; wert: unknown }) {
  if (frage.typ === 'tabelle' && frage.optionen && typeof wert === 'object' && wert !== null) {
    const t = wert as TabellenWert;
    return (
      <View style={[st.karte, { paddingVertical: 6, paddingHorizontal: 6 }]}>
        <View style={[st.zeile, { paddingVertical: 3 }]}>
          <Text style={st.zelleText} />
          {frage.optionen.spalten.map((sp) => (
            <Text key={sp} style={{ width: 86, textAlign: 'right', fontWeight: 600, fontSize: 8.5, color: GRAU, textTransform: 'uppercase', letterSpacing: 0.6 }}>{sp}</Text>
          ))}
        </View>
        {frage.optionen.zeilen.map((z, i) => (
          <View key={z} style={[st.zeile, { backgroundColor: i % 2 === 0 ? ZEBRA : 'transparent', borderRadius: 4 }]}>
            <Text style={st.zelleText}>{z}</Text>
            {frage.optionen!.spalten.map((sp) => (
              <Text key={sp} style={{ width: 86, textAlign: 'right', fontWeight: 500 }}>{t[z]?.[sp] ?? '–'}</Text>
            ))}
          </View>
        ))}
      </View>
    );
  }
  const s = wert === undefined || wert === null || wert === '' ? '' : String(wert);
  return (
    <View style={st.karte}>
      <Text style={s ? st.antwort : st.leer}>{s || '– keine Antwort –'}</Text>
    </View>
  );
}

function FrageAntwort({ nr, frage, wert }: { nr: number; frage: SnapshotFrage; wert: unknown }) {
  const laenge = typeof wert === 'string' ? wert.length : 0;
  return (
    // Nur lange Antworten dürfen umbrechen — sonst würde die Karte über den
    // Seitenrand laufen. Alles andere bleibt als Block zusammen, damit keine
    // Frage ohne ihre Antwort am Seitenfuß steht.
    <View wrap={laenge > 500}>
      <View style={st.frageZeile}>
        <View style={st.punkt}><Text style={st.punktZahl}>{nr}</Text></View>
        <Text style={st.frageText}>{frage.text}</Text>
      </View>
      <AntwortKarte frage={frage} wert={wert} />
    </View>
  );
}

/** Balken mit Verlauf Orange → Hell für das Ergebnis. */
function Balken({ wert, breite = 168 }: { wert: number; breite?: number }) {
  const id = `bal${Math.round(wert * 100)}`;
  return (
    <Svg width={breite} height={8} style={{ marginHorizontal: 10, marginTop: 3.5 }}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={O} />
          <Stop offset="1" stopColor="#F9B665" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={breite} height={8} rx={4} ry={4} fill={WASSER} />
      {wert > 0 ? <Rect x={0} y={0} width={Math.max(8, (breite * wert) / 100)} height={8} rx={4} ry={4} fill={`url(#${id})`} /> : null}
    </Svg>
  );
}

export function Workbook({ s, texte, seiten }: { s: Sitzung; texte: Record<string, string>; seiten: Map<string, number> }) {
  const t = (k: string) => (texte[k] ?? '').replace(/\{vorname\}/g, s.vorname);
  const kapitel = s.fragen_snapshot.kapitel;
  const fakten = kapitel.filter((k) => k.typ === 'fakten');
  const faktoren = kapitel.filter((k) => k.typ === 'faktor');
  const punkte = punkteJeFaktor(s.fragen_snapshot, s.antworten);
  const datum = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' });
  const nr = (n: number) => String(n).padStart(2, '0');

  // Reihenfolge des Inhaltsverzeichnisses = Reihenfolge der Marken im Dokument.
  const ivz: { id: string; titel: string }[] = [
    { id: 'willkommen', titel: 'Willkommen' },
    { id: 'bestandteile', titel: t('bestandteile_titel') || 'Die Bestandteile' },
    { id: 'finanzcheck', titel: t('finanzcheck_titel') || 'Finanzcheck' },
    ...fakten.map((k) => ({ id: `kap-${k.id}`, titel: k.titel })),
    { id: 'faktoren', titel: t('faktoren_titel') || 'Die 7 Erfolgsfaktoren' },
    ...faktoren.map((k, i) => ({ id: `fak-${k.id}`, titel: `${i + 1}. ${k.titel}` })),
    { id: 'ergebnis', titel: t('ergebnis_titel') || 'Dein Ergebnis' },
    { id: 'aha', titel: t('aha_titel') || 'Aha-Momente' },
    { id: 'ueber', titel: t('ueber_titel') || 'Über Jörg Roos' },
    { id: 'kontakt', titel: 'Kontakt' },
  ];

  return (
    <Document title={`360° Business-Analyse · Workbook · ${s.vorname} ${s.nachname}`} author="Jörg Roos" language="de">
      {/* ---------------------------------------------------------------- Deckblatt */}
      <Page size="A4" style={st.dunkel}>
        {bild('cover-dunkel.png')}
        {schleier}
        <Image src={pub('logo-full-gradiant.png')} style={{ width: 172, height: 172 / 7.87 }} />
        <View style={{ flex: 1, justifyContent: 'center', marginTop: -20 }}>
          <Text style={{ fontSize: 60, fontWeight: 600, lineHeight: 1.75 }}>360°</Text>
          <Text style={{ fontSize: 25, fontWeight: 600, letterSpacing: 1.4, lineHeight: 1.5, marginTop: 0 }}>BUSINESS-ANALYSE</Text>
          <View style={{ width: 54, height: 3, backgroundColor: O, marginTop: 20, marginBottom: 16 }} />
          <Text style={{ fontSize: 19, color: O, fontWeight: 500 }}>Das Workbook</Text>
        </View>
        <View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, borderWidth: 0.7, borderColor: 'rgba(255,255,255,0.14)', paddingVertical: 15, paddingHorizontal: 18 }}>
            <Text style={{ fontSize: 8, letterSpacing: 1.6, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: 500, marginBottom: 7 }}>Vorbereitet für</Text>
            <Text style={{ fontSize: 16, fontWeight: 600 }}>{s.vorname} {s.nachname}</Text>
            <Text style={{ fontSize: 12, color: '#C9CFD3', marginTop: 3 }}>{s.firma}</Text>
            <Text style={{ fontSize: 9.5, color: '#9AA4AB', marginTop: 8 }}>{datum}</Text>
          </View>
          <Text style={{ fontSize: 10, color: O, marginTop: 20, fontWeight: 500 }}>{t('claim')}</Text>
        </View>
      </Page>

      {/* --------------------------------------------------- Inhaltsverzeichnis */}
      <Rahmen kopf="Inhalt">
        <Text style={st.eyebrow}>Überblick</Text>
        <Text style={st.h1}>Inhalt</Text>
        <View style={{ marginTop: 6 }}>
          {ivz.map((e) => (
            <Link key={e.id} src={`#${e.id}`} style={st.ivzZeile}>
              <Text style={st.ivzTitel}>{e.titel}</Text>
              <View style={st.ivzFuehrung} />
              <Text style={st.ivzNummer}>{seiten.get(e.id) ?? ''}</Text>
            </Link>
          ))}
        </View>
      </Rahmen>

      {/* ------------------------------------------------------------ Einführung */}
      <Rahmen kopf="Willkommen">
        <Marke id="willkommen" seiten={seiten} />
        <Text style={st.eyebrow}>{t('willkommen_titel')}</Text>
        <Text style={st.h1}>Hallo {s.vorname}</Text>
        <Absaetze text={t('willkommen_text')} />
      </Rahmen>

      <Rahmen kopf="Bestandteile">
        <Marke id="bestandteile" seiten={seiten} />
        <Text style={st.eyebrow}>Der Ablauf</Text>
        <Text style={st.h1}>{t('bestandteile_titel')}</Text>
        <Absaetze text={t('bestandteile_text')} />
      </Rahmen>

      <Rahmen kopf="Finanzcheck">
        <Marke id="finanzcheck" seiten={seiten} />
        <Text style={st.eyebrow}>Deine Zahlen</Text>
        <Text style={st.h1}>{t('finanzcheck_titel')}</Text>
        <Absaetze text={t('finanzcheck_text')} />
        <Text style={st.h2}>Benötigte Unterlagen</Text>
        <View style={{ backgroundColor: KARTE, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 13, marginTop: 4 }}>
          {t('finanzcheck_liste').split('\n').map((z, i) => (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 5 }}>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: O, marginTop: 5, marginRight: 9 }} />
              <Text style={{ flex: 1, fontSize: GROESSE, fontWeight: 300, lineHeight: ZH }}>{z}</Text>
            </View>
          ))}
        </View>
        <Text style={[st.absatz, { marginTop: 12, fontWeight: 500 }]}>{t('finanzcheck_uebermittlung')}</Text>
      </Rahmen>

      {/* ---------------------------------------------------------------- Fakten */}
      {fakten.length > 0 ? (
        <Kapiteltrenner nummer="01" unter={fakten[0].untertitel} titel={fakten[0].titel} id={`kap-${fakten[0].id}`} seiten={seiten} />
      ) : null}
      {fakten.map((k) => (
        <Rahmen key={k.id} kopf={k.titel}>
          <Text style={st.eyebrow}>{k.untertitel}</Text>
          <Text style={st.h1}>{k.titel}</Text>
          {k.fragen.map((f, i) => (
            <FrageAntwort key={f.id} nr={i + 1} frage={f} wert={s.antworten[f.id]} />
          ))}
        </Rahmen>
      ))}

      {/* ---------------------------------------------------------- Erfolgsfaktoren */}
      <Kapiteltrenner nummer="02" unter="Kapitel 2" titel={t('faktoren_titel') || 'Die 7 Erfolgsfaktoren'} id="faktoren" seiten={seiten} />
      <Rahmen kopf="Erfolgsfaktoren">
        <Text style={st.eyebrow}>Überblick</Text>
        <Text style={st.h1}>{t('faktoren_titel')}</Text>
        <Absaetze text={t('faktoren_einleitung')} />
        {faktoren.map((k, i) => (
          <View key={k.id} style={{ flexDirection: 'row', backgroundColor: KARTE, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 11, marginBottom: 7 }} wrap={false}>
            <Text style={{ width: 26, fontSize: 15, fontWeight: 600, color: O }}>{nr(i + 1)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 2 }}>{k.titel}</Text>
              <Text style={{ fontSize: 9.5, fontWeight: 300, color: GRAU, lineHeight: ZH }}>{k.einleitung}</Text>
            </View>
          </View>
        ))}
      </Rahmen>

      {faktoren.map((k, i) => {
        const p = punkte.find((x) => x.kapitelId === k.id);
        return (
          <Rahmen key={k.id} kopf={`Erfolgsfaktor ${i + 1}`}>
            <Text style={{ position: 'absolute', top: 62, right: 56, fontSize: 72, fontWeight: 600, color: WASSER }}>{nr(i + 1)}</Text>
            <Marke id={`fak-${k.id}`} seiten={seiten} />
            <Text style={st.eyebrow}>{k.untertitel}</Text>
            <Text style={[st.h1, { paddingRight: 80 }]}>{k.titel}</Text>
            <Text style={[st.absatz, { paddingRight: 80 }]}>{k.einleitung}</Text>

            <View style={{ marginTop: 18 }}>
              <View style={st.kopfzeile}>
                <Text style={{ width: 20, ...st.kopfzelle }}>Nr</Text>
                <Text style={[st.kopfzelle, { flex: 1 }]}>Aussage</Text>
                <Text style={[st.kopfzelle, { width: 44, textAlign: 'right' }]}>1–10</Text>
              </View>
              {k.fragen.map((f, j) => (
                <View key={f.id} style={[st.zeile, { backgroundColor: j % 2 === 0 ? '#FAFBFB' : '#FFFFFF' }]} wrap={false}>
                  <Text style={{ width: 20, color: GRAU, fontSize: 9.5, lineHeight: ZH }}>{j + 1}</Text>
                  <Text style={[st.zelleText, { fontSize: 10, fontWeight: 300, lineHeight: ZH, paddingRight: 8 }]}>{f.text}</Text>
                  <View style={{ width: 44, alignItems: 'flex-end' }}>
                    <View style={{ backgroundColor: PILLE, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 1.5 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: 600, color: '#9F3C07' }}>
                        {typeof s.antworten[f.id] === 'number' ? String(s.antworten[f.id]) : '–'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {p ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 16, paddingTop: 12, borderTopWidth: 0.6, borderTopColor: LINIE }} wrap={false}>
                <Text style={{ flex: 1, fontSize: 9, letterSpacing: 1.4, color: GRAU, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Gesamtpunkte</Text>
                <Text style={{ fontSize: 28, fontWeight: 600, color: O, lineHeight: 0.6 }}>{p.summe}</Text>
                <Text style={{ fontSize: 10, color: GRAU, marginLeft: 5, marginBottom: 3 }}>von {p.maximum}</Text>
              </View>
            ) : null}
          </Rahmen>
        );
      })}

      {/* -------------------------------------------------------------- Ergebnis */}
      <Kapiteltrenner nummer="03" unter="Kapitel 3" titel={t('ergebnis_titel') || 'Dein Ergebnis'} id="ergebnis" seiten={seiten} />
      <Rahmen kopf="Dein Ergebnis">
        <Text style={st.eyebrow}>Ergebnis</Text>
        <Text style={st.h1}>{t('ergebnis_titel')}</Text>
        <Text style={st.absatz}>{t('ergebnis_text')}</Text>
        <View style={{ alignItems: 'center', marginVertical: 2 }}>
          <ErfolgsradPdf werte={punkte} groesse={330} />
        </View>
        {punkte.map((p) => (
          <View key={p.kapitelId} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2.5 }}>
            <Text style={{ flex: 1, fontSize: 10, fontWeight: 400 }}>{p.titel}</Text>
            <Balken wert={p.punkte} />
            <Text style={{ width: 28, textAlign: 'right', fontSize: 11, fontWeight: 600, color: O }}>{p.punkte}</Text>
          </View>
        ))}
        <View style={[st.karte, { marginTop: 14 }]}>
          <Text style={st.antwort}>{t('ergebnis_fazit')}</Text>
        </View>
      </Rahmen>

      {/* ----------------------------------------------------------- Aha-Momente */}
      <Rahmen kopf="Aha-Momente">
        <Marke id="aha" seiten={seiten} />
        <Text style={st.eyebrow}>{t('aha_titel')}</Text>
        <Text style={st.h1}>{t('aha_frage')}</Text>
        <Text style={st.absatz}>{t('aha_text')}</Text>
        <View style={{ backgroundColor: KARTE, borderRadius: 10, paddingVertical: 16, paddingHorizontal: 20, marginTop: 10, flexDirection: 'row' }}>
          <Text style={{ fontSize: 40, color: O, fontWeight: 600, lineHeight: 0.52, marginRight: 12 }}>“</Text>
          <Text style={[s.aha ? st.antwort : st.leer, { flex: 1, fontSize: 12.5, lineHeight: ZH, paddingTop: 2 }]}>
            {s.aha || '– noch nicht festgehalten –'}
          </Text>
        </View>
      </Rahmen>

      {/* ------------------------------------------------------------ Über Jörg */}
      <Rahmen kopf="Über Jörg">
        <Marke id="ueber" seiten={seiten} />
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={st.eyebrow}>Finanzen im Fokus</Text>
            <Text style={st.h1}>{t('ueber_titel')}</Text>
            <Absaetze text={t('ueber_text')} />
            <Link src="https://joerg-roos.com" style={{ color: O, fontWeight: 600, fontSize: 10.5, textDecoration: 'none' }}>{t('ueber_web')}</Link>
          </View>
          <View style={{ width: 152 }}>
            {/* Orangener Versatz-Schatten hinter dem Bild */}
            <View style={{ position: 'absolute', top: 7, left: 7, width: 152, height: 228, borderRadius: 10, backgroundColor: O }} />
            <Image src={pub('joerg.jpg')} style={{ width: 152, height: 228, borderRadius: 10 }} />
          </View>
        </View>
      </Rahmen>

      {/* -------------------------------------------------------------- Kontakt */}
      <Page size="A4" style={st.dunkel}>
        {bild('cover-dunkel.png')}
        {schleier}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Marke id="kontakt" seiten={seiten} />
          <Image src={pub('logo-full-gradiant.png')} style={{ width: 190, height: 190 / 7.87, marginBottom: 34 }} />
          <View style={{ width: 54, height: 3, backgroundColor: O, marginBottom: 22 }} />
          <Text style={{ fontSize: 13, fontWeight: 300, lineHeight: ZH, color: '#E6EAED' }}>{t('kontakt')}</Text>
          <Link src="https://joerg-roos.com" style={{ color: O, fontWeight: 600, fontSize: 12, marginTop: 20, textDecoration: 'none' }}>{t('ueber_web')}</Link>
        </View>
        <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>Copyright © {new Date().getFullYear()} · Jörg Roos</Text>
      </Page>
    </Document>
  );
}
