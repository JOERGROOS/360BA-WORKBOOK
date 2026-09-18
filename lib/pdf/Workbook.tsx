import path from 'node:path';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { Sitzung, SnapshotFrage, TabellenWert } from '@/lib/db';
import { punkteJeFaktor } from '@/lib/punkte';
import { ErfolgsradPdf } from './ErfolgsradPdf';

const pub = (n: string) => path.join(process.cwd(), 'public', n);
const O = '#ED7A02', BLAU = '#0F1B23', GRAU = '#5F676C', LINIE = '#D5D9DC';

const st = StyleSheet.create({
  // ponytail: kein lineHeight hier auf Seitenebene — das bringt react-pdf/Yoga 4.9 bei der
  // fixed-Fußzeile (unten, position:'bottom') aus dem Takt, sie wird dann gar nicht mehr
  // gerendert, egal was die Fußzeile selbst für Styles trägt (empirisch isoliert). lineHeight
  // deshalb gezielt an den Fließtext-Stilen (absatz, antwort) statt global auf der Seite.
  seite: { fontFamily: 'Montserrat', fontSize: 10.5, color: BLAU, paddingTop: 64, paddingBottom: 60, paddingHorizontal: 56 },
  kopf: { position: 'absolute', top: 24, left: 56, right: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { width: 110, height: 110 / 7.87 }, // Proportion 7,87 : 1 — nie unabhängig setzen
  kopfText: { fontSize: 8, letterSpacing: 1.2, color: GRAU, textTransform: 'uppercase' },
  fuss: { position: 'absolute', bottom: 24, left: 56, right: 56, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: GRAU },
  eyebrow: { fontSize: 8.5, letterSpacing: 1.6, color: O, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 },
  h1: { fontSize: 22, fontWeight: 600, marginBottom: 14, lineHeight: 1.2 },
  h2: { fontSize: 13, fontWeight: 600, marginTop: 14, marginBottom: 4 },
  absatz: { marginBottom: 8, fontWeight: 300, lineHeight: 1.5 },
  frage: { fontSize: 8.5, letterSpacing: 0.8, color: GRAU, textTransform: 'uppercase', fontWeight: 500, marginTop: 10 },
  antwort: { marginTop: 2, marginBottom: 6, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: LINIE, lineHeight: 1.5 },
  leer: { color: GRAU, fontStyle: 'italic' },
  zeile: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: LINIE, paddingVertical: 4 },
  zelleText: { flex: 1 },
  zelleWert: { width: 40, textAlign: 'right', fontWeight: 600 },
  summe: { flexDirection: 'row', backgroundColor: '#FDEBD9', paddingVertical: 6, paddingHorizontal: 6, marginTop: 4, fontWeight: 600 },
  deck: { backgroundColor: BLAU, color: '#FFFFFF', padding: 56, justifyContent: 'space-between' },
});

function Rahmen({ children, kopf }: { children: React.ReactNode; kopf: string }) {
  return (
    <Page size="A4" style={st.seite} wrap>
      <View style={st.kopf} fixed>
        <Image src={pub('logo-full.png')} style={st.logo} />
        <Text style={st.kopfText}>{kopf}</Text>
      </View>
      {children}
      <View style={st.fuss} fixed>
        <Text>Copyright © {new Date().getFullYear()} · Jörg Roos</Text>
        <Text render={({ pageNumber }) => `Seite ${pageNumber}`} />
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

function Antwort({ frage, wert }: { frage: SnapshotFrage; wert: unknown }) {
  if (frage.typ === 'tabelle' && frage.optionen) {
    const t = (wert ?? {}) as TabellenWert;
    return (
      <View style={st.antwort}>
        <View style={st.zeile}>
          <Text style={st.zelleText} />
          {frage.optionen.spalten.map((sp) => (
            <Text key={sp} style={{ width: 90, textAlign: 'right', fontWeight: 500 }}>{sp}</Text>
          ))}
        </View>
        {frage.optionen.zeilen.map((z) => (
          <View key={z} style={st.zeile}>
            <Text style={st.zelleText}>{z}</Text>
            {frage.optionen!.spalten.map((sp) => (
              <Text key={sp} style={{ width: 90, textAlign: 'right' }}>{t[z]?.[sp] ?? '–'}</Text>
            ))}
          </View>
        ))}
      </View>
    );
  }
  const s = wert === undefined || wert === '' ? '' : String(wert);
  return <Text style={[st.antwort, ...(s ? [] : [st.leer])]}>{s || '– keine Antwort –'}</Text>;
}

export function Workbook({ s, texte }: { s: Sitzung; texte: Record<string, string> }) {
  const t = (k: string) => (texte[k] ?? '').replace(/\{vorname\}/g, s.vorname);
  const kapitel = s.fragen_snapshot.kapitel;
  const punkte = punkteJeFaktor(s.fragen_snapshot, s.antworten);
  const datum = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  return (
    <Document title={`360° Business-Analyse · Workbook · ${s.vorname} ${s.nachname}`} author="Jörg Roos" language="de">
      <Page size="A4" style={[st.seite, st.deck]}>
        <Image src={pub('logo-full-white.png')} style={{ width: 160, height: 160 / 7.87 }} />
        <View>
          <Text style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.15 }}>{'360°\nBUSINESS-ANALYSE'}</Text>
          <Text style={{ fontSize: 16, color: O, marginTop: 10 }}>Das Workbook</Text>
        </View>
        <View>
          <Text style={{ fontSize: 14, fontWeight: 500 }}>{s.vorname} {s.nachname}</Text>
          <Text style={{ fontSize: 12, color: '#C9CFD3' }}>{s.firma}</Text>
          <Text style={{ fontSize: 10, color: '#C9CFD3', marginTop: 6 }}>{datum}</Text>
          <Text style={{ fontSize: 10, color: O, marginTop: 20 }}>{t('claim')}</Text>
        </View>
      </Page>

      <Rahmen kopf="Willkommen">
        <Text style={st.eyebrow}>Schön, dass du dabei bist</Text>
        <Text style={st.h1}>Hallo {s.vorname}</Text>
        <Absaetze text={t('willkommen_text')} />
      </Rahmen>

      <Rahmen kopf="Bestandteile">
        <Text style={st.h1}>{t('bestandteile_titel')}</Text>
        <Absaetze text={t('bestandteile_text')} />
      </Rahmen>

      <Rahmen kopf="Finanzcheck">
        <Text style={st.h1}>{t('finanzcheck_titel')}</Text>
        <Absaetze text={t('finanzcheck_text')} />
        <Text style={st.h2}>Benötigte Unterlagen</Text>
        {t('finanzcheck_liste').split('\n').map((z, i) => (
          <View key={i} style={{ flexDirection: 'row', marginBottom: 4 }}>
            <Text style={{ color: O, width: 14 }}>■</Text>
            <Text style={{ flex: 1, fontWeight: 300 }}>{z}</Text>
          </View>
        ))}
        <Text style={[st.absatz, { marginTop: 10, fontWeight: 500 }]}>{t('finanzcheck_uebermittlung')}</Text>
      </Rahmen>

      {kapitel.filter((k) => k.typ === 'fakten').map((k) => (
        <Rahmen key={k.id} kopf={k.titel}>
          <Text style={st.eyebrow}>{k.untertitel}</Text>
          <Text style={st.h1}>{k.titel}</Text>
          {k.fragen.map((f) => (
            <View key={f.id} wrap={false}>
              <Text style={st.frage}>{f.text}</Text>
              <Antwort frage={f} wert={s.antworten[f.id]} />
            </View>
          ))}
        </Rahmen>
      ))}

      <Rahmen kopf="Erfolgsfaktoren">
        <Text style={st.h1}>{t('faktoren_titel')}</Text>
        <Absaetze text={t('faktoren_einleitung')} />
        {kapitel.filter((k) => k.typ === 'faktor').map((k) => (
          <View key={k.id} style={{ marginTop: 8 }}>
            <Text style={st.h2}>{k.titel}</Text>
            <Text style={st.absatz}>{k.einleitung}</Text>
          </View>
        ))}
      </Rahmen>

      {kapitel.filter((k) => k.typ === 'faktor').map((k, i) => {
        const p = punkte.find((x) => x.kapitelId === k.id);
        return (
          <Rahmen key={k.id} kopf={`Erfolgsfaktor ${i + 1}`}>
            <Text style={st.eyebrow}>{k.untertitel}</Text>
            <Text style={st.h1}>{k.titel}</Text>
            <Text style={st.absatz}>{k.einleitung}</Text>
            <View style={[st.zeile, { borderBottomWidth: 1, borderBottomColor: BLAU }]}>
              <Text style={[st.zelleText, { fontWeight: 600 }]}>Aussage</Text>
              <Text style={[st.zelleWert, { color: GRAU, fontWeight: 500 }]}>1–10</Text>
            </View>
            {k.fragen.map((f, j) => (
              <View key={f.id} style={st.zeile} wrap={false}>
                <Text style={{ width: 18, color: GRAU }}>{j + 1}</Text>
                <Text style={st.zelleText}>{f.text}</Text>
                <Text style={st.zelleWert}>{typeof s.antworten[f.id] === 'number' ? String(s.antworten[f.id]) : '–'}</Text>
              </View>
            ))}
            {p && (
              <View style={st.summe}>
                <Text style={{ flex: 1 }}>Gesamtpunkte</Text>
                <Text>{p.summe} von {p.maximum}</Text>
              </View>
            )}
          </Rahmen>
        );
      })}

      <Rahmen kopf="Dein Ergebnis">
        <Text style={st.eyebrow}>Ergebnis</Text>
        <Text style={st.h1}>{t('ergebnis_titel')}</Text>
        <Text style={st.absatz}>{t('ergebnis_text')}</Text>
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <ErfolgsradPdf werte={punkte} groesse={400} />
        </View>
        {punkte.map((p) => (
          <View key={p.kapitelId} style={st.zeile}>
            <Text style={st.zelleText}>{p.titel}</Text>
            <View style={{ width: 160, height: 5, backgroundColor: '#EEEEEE', marginHorizontal: 10, marginTop: 5 }}>
              <View style={{ width: `${p.punkte}%`, height: 5, backgroundColor: O }} />
            </View>
            <Text style={st.zelleWert}>{p.punkte}</Text>
          </View>
        ))}
        <Text style={[st.absatz, { marginTop: 12 }]}>{t('ergebnis_fazit')}</Text>
      </Rahmen>

      <Rahmen kopf="Aha-Momente">
        <Text style={st.eyebrow}>{t('aha_titel')}</Text>
        <Text style={st.h1}>{t('aha_frage')}</Text>
        <Text style={st.absatz}>{t('aha_text')}</Text>
        <View style={{ borderLeftWidth: 3, borderLeftColor: O, paddingLeft: 12, marginTop: 10 }}>
          <Text style={s.aha ? {} : st.leer}>{s.aha || '– noch nicht festgehalten –'}</Text>
        </View>
      </Rahmen>

      <Rahmen kopf="Über Jörg">
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <View style={{ flex: 1 }}>
            <Text style={st.eyebrow}>Finanzen im Fokus</Text>
            <Text style={st.h1}>{t('ueber_titel')}</Text>
            <Absaetze text={t('ueber_text')} />
            <Text style={{ color: O, fontWeight: 500 }}>{t('ueber_web')}</Text>
          </View>
          <Image src={pub('joerg.jpg')} style={{ width: 150, height: 225, borderRadius: 6 }} />
        </View>
        <Text style={{ marginTop: 30, fontSize: 9, color: GRAU, textAlign: 'center' }}>{t('kontakt')}</Text>
      </Rahmen>
    </Document>
  );
}
