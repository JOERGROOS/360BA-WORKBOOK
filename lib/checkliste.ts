// Die Unterlagen, die der Kunde vor dem gemeinsamen Tag schicken soll. Wortlaut von Jörg
// (22.09.2026), übernommen aus seiner Kickoff-Mail.
//
// Die Kennungen sind der Schlüssel in `wb_sessions.checkliste` — sie werden NIE geändert,
// sonst verlieren bestehende Kunden ihre Haken. Neue Punkte bekommen eine neue Kennung.
// Der Text darf sich ändern, die Kennung nicht.
export type ChecklistenPunkt = { id: string; titel: string; hinweis?: string };

export const CHECKLISTE: ChecklistenPunkt[] = [
  {
    id: 'jahresabschluss',
    titel: 'Jahresabschlussbericht der letzten beiden Geschäftsjahre als PDF-Datei',
    hinweis: 'Sollte der Jahresabschluss zum letzten Jahr noch nicht fertig sein, sende bitte die Daten, die den aktuellen Stand der Abschlussarbeiten darstellen.',
  },
  {
    id: 'fixkosten',
    titel: 'Auflistung der fixen Kosten',
    hinweis: 'Achtung: nur, wenn diese bereits vorliegt.',
  },
  {
    id: 'kontostand',
    titel: 'Kontostand Geschäftskonto',
    hinweis: 'Jeweils zum 31.12. der letzten beiden Geschäftsjahre sowie zum letzten Tag des Monats, zu dem eine BWA für das aktuelle Geschäftsjahr vorliegt. Reicht in Textform.',
  },
  {
    id: 'bwa',
    titel: 'BWA-Jahresübersicht als PDF oder Excel-Datei',
    hinweis: 'Für die letzten beiden Geschäftsjahre sowie die letzte vorliegende BWA des aktuellen Geschäftsjahres (siehe Muster „BWA-Jahresübersicht").',
  },
  {
    id: 'susa',
    titel: 'Summen- und Saldenliste als Jahresübersicht im XLSX- oder CSV-Format',
    hinweis: 'Für die letzten beiden abgeschlossenen Geschäftsjahre sowie für das aktuelle Geschäftsjahr (siehe Muster „DATEV-SUSA-Jahresübersicht").',
  },
];

export const CHECKLISTEN_IDS = CHECKLISTE.map((p) => p.id);

export function istPunkt(id: unknown): id is string {
  return typeof id === 'string' && CHECKLISTEN_IDS.includes(id);
}

// Zählt nur bekannte Kennungen — so verfälscht ein alter, inzwischen entfernter Punkt
// den Stand nicht, der in einer bestehenden Sitzung noch gespeichert sein kann.
export function stand(gesetzt: Record<string, boolean> | null | undefined): { erledigt: number; gesamt: number } {
  const g = gesetzt ?? {};
  return { erledigt: CHECKLISTEN_IDS.filter((id) => g[id] === true).length, gesamt: CHECKLISTEN_IDS.length };
}

// Erster Teil des Kacheltextes wird zum Link aufs Unterlagen-Fenster (Jörg-Vorgabe:
// „die ersten Worte direkt als Link"). Getrennt wird am Gedankenstrich, denn genau so
// ist der Text in `data/texte-seed.json` gebaut: Aufzählung – dann der erklärende Rest.
// Fehlt der Gedankenstrich, wird der ganze Text zum Link, statt hier zu raten.
export function teileKacheltext(text: string): { link: string; rest: string } {
  const i = text.indexOf('–');
  if (i < 0) return { link: text.trim(), rest: '' };
  return { link: text.slice(0, i).trim(), rest: text.slice(i).trim() };
}
