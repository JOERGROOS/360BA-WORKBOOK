if (!process.env.ANTHROPIC_API_KEY) { console.log('übersprungen (kein ANTHROPIC_API_KEY)'); process.exit(0); }
const { glaette } = await import('../lib/glaettung.ts');
const faelle = [
  { roh: 'ähm also wir haben so ungefähr äh zwölf Leute und der Umsatz war letztes Jahr so bei eins Komma vier Millionen also 1,4 Millionen ja', muss: ['12', '1,4'] },
  { roh: 'unser größter Wettbewerber ist die Firma Kortmann aus Haltern die sind größer und ähm fahren halt über den Preis', muss: ['Kortmann', 'Haltern'] },
];
for (const f of faelle) {
  const t = await glaette(f.roh);
  for (const m of f.muss) if (!t.includes(m)) throw new Error(`"${m}" fehlt in: ${t}`);
  if (/ähm|äh /i.test(t)) throw new Error(`Füllwort geblieben: ${t}`);
  console.log('·', t);
}
console.log('ok');
