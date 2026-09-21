import { db } from './db';
import type { Sitzung } from './db';
import { erinnerungMailSenden } from './mail';
import { heuteBerlin, tageBisTermin, faelligeStufe, fehlendeUnterlagen, type Stufe, type FehlendeUnterlagen } from './erinnerungen';

// Status allein entscheidet NICHT mehr, ob eine Erinnerung ausbleibt — ein abgeschlossenes
// Workbook ohne Finanzdaten (oder umgekehrt) bekommt weiter eine Erinnerung, nur eben gezielt
// auf die eine fehlende Sache. Erst wenn WIRKLICH beides da ist, bleibt sie ganz aus.
export async function erinnerungenPruefenUndSenden(): Promise<{ geprueft: number; gesendet: { id: string; firma: string; stufe: Stufe; fehlend: FehlendeUnterlagen }[]; fehler: { id: string; firma: string; fehler: string }[] }> {
  const { data, error } = await db.from('wb_sessions')
    .select('id,token,vorname,nachname,firma,telefon,email,status,test,termin_am,erinnerung_14_gesendet_at,erinnerung_10_gesendet_at,erinnerung_7_gesendet_at')
    .not('termin_am', 'is', null)
    .eq('test', false);
  if (error) throw new Error(`[erinnerungen] Sitzungen laden: ${error.message}`);
  const heute = heuteBerlin();
  const gesendet: { id: string; firma: string; stufe: Stufe; fehlend: FehlendeUnterlagen }[] = [];
  const fehler: { id: string; firma: string; fehler: string }[] = [];
  // Fehlertoleranz wie beim Abholer: eine Sitzung, deren Mail nicht rausgeht (falsche
  // Adresse, Resend-Ausfall, Zählfehler), stoppt nicht den Lauf für die übrigen Sitzungen.
  for (const s of data ?? []) {
    const stufe = faelligeStufe(tageBisTermin(s.termin_am as string, heute), s);
    if (!stufe) continue;
    try {
      const { count, error: eZaehlen } = await db.from('wb_dateien').select('id', { count: 'exact', head: true }).eq('session_id', s.id);
      if (eZaehlen) throw new Error(eZaehlen.message);
      const fehlend = fehlendeUnterlagen(s.status !== 'abgeschlossen', (count ?? 0) === 0);
      if (!fehlend) continue; // beides liegt schon vor — keine Erinnerung mehr nötig
      await erinnerungMailSenden(s as Sitzung, stufe, fehlend);
      const { error: eUpdate } = await db.from('wb_sessions').update({ [`erinnerung_${stufe}_gesendet_at`]: new Date().toISOString() }).eq('id', s.id);
      if (eUpdate) throw new Error(eUpdate.message);
      gesendet.push({ id: s.id, firma: s.firma, stufe, fehlend });
    } catch (e) {
      console.error(`[erinnerungen] Sitzung ${s.id} (${s.firma}) Stufe ${stufe}`, e);
      fehler.push({ id: s.id, firma: s.firma, fehler: e instanceof Error ? e.message : String(e) });
    }
  }
  return { geprueft: data?.length ?? 0, gesendet, fehler };
}
