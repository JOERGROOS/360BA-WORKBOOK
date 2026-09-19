'use client';
import { useEffect, useState } from 'react';
import type { Sitzung } from '@/lib/db';
import type { DateiEintragAdmin } from '@/lib/dateien';
import { EinladungFormular } from './EinladungFormular';

type SitzungListe = Pick<Sitzung, 'id' | 'vorname' | 'nachname' | 'firma' | 'email' | 'status' | 'test' | 'created_at' | 'abgeschlossen_at' | 'abholen_angefordert'> & { prozent: number; link: string };

function uhrzeit(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
function abgeholtText(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
}
function alleAbgeholt(liste: DateiEintragAdmin[]): boolean {
  return liste.every((d) => d.abgeholt_at);
}

function antwortAnzeigen(a: unknown): string {
  if (a === undefined || a === null || a === '') return '—';
  if (typeof a === 'object') return JSON.stringify(a);
  return String(a);
}

async function fehlerAus(r: Response, standard: string): Promise<string> {
  if (r.status === 401) return 'Sitzung abgelaufen – bitte neu anmelden.';
  const d = await r.json().catch(() => ({}));
  return d.error ?? standard;
}

export function Sitzungen() {
  const [liste, setListe] = useState<SitzungListe[] | null>(null);
  const [offen, setOffen] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, Omit<Sitzung, 'token'>>>({});
  const [dateien, setDateien] = useState<Record<string, DateiEintragAdmin[]>>({});
  const [dateienOffen, setDateienOffen] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [fehler, setFehler] = useState('');
  const [neueEinladung, setNeueEinladung] = useState(false);
  const [kopiert, setKopiert] = useState<string | null>(null);

  async function laden() {
    const r = await fetch('/api/admin/sitzungen');
    if (!r.ok) return;
    const d: SitzungListe[] = await r.json();
    setListe(d);
    // Dateien je Sitzung gleich mitladen — so steht die Anzahl im Knopf, ohne zusätzlichen Klick.
    const paare = await Promise.all(d.map(async (s) => {
      const rd = await fetch(`/api/admin/sitzungen/${s.id}/dateien`);
      return [s.id, rd.ok ? await rd.json() : []] as const;
    }));
    setDateien(Object.fromEntries(paare));
  }
  useEffect(() => { laden(); }, []);

  async function ausklappen(id: string) {
    if (offen === id) { setOffen(null); return; }
    setOffen(id);
    if (!details[id]) {
      const r = await fetch(`/api/admin/sitzungen/${id}`);
      if (r.ok) { const voll: Omit<Sitzung, 'token'> = await r.json(); setDetails((d) => ({ ...d, [id]: voll })); }
    }
  }

  async function pdfOeffnen(id: string) {
    setLaeuft(id); setFehler('');
    const r = await fetch(`/api/admin/sitzungen/${id}/pdf`);
    setLaeuft(null);
    if (!r.ok) { setFehler(await fehlerAus(r, 'PDF noch nicht vorhanden.')); return; }
    const d = await r.json();
    window.open(d.url, '_blank');
  }
  async function pdfNeu(id: string) {
    setLaeuft(id); setFehler('');
    const r = await fetch(`/api/admin/sitzungen/${id}/pdf`, { method: 'POST' });
    setLaeuft(null);
    if (!r.ok) { setFehler(await fehlerAus(r, 'Das hat nicht geklappt.')); return; }
    const d = await r.json();
    window.open(d.url, '_blank');
  }
  async function linkErneut(id: string) {
    setLaeuft(id); setFehler('');
    const r = await fetch(`/api/admin/sitzungen/${id}/link`, { method: 'POST' });
    setLaeuft(null);
    if (!r.ok) setFehler(await fehlerAus(r, 'Das hat nicht geklappt.'));
  }
  async function zurueckziehen(id: string) {
    if (!confirm('Einladung zurückziehen? Der Link wird sofort ungültig.')) return;
    setLaeuft(id); setFehler('');
    const r = await fetch(`/api/admin/sitzungen/${id}`, { method: 'DELETE' });
    setLaeuft(null);
    if (!r.ok) { setFehler(await fehlerAus(r, 'Das hat nicht geklappt.')); return; }
    await laden();
  }

  async function abholen(id: string) {
    setLaeuft(id); setFehler('');
    const r = await fetch(`/api/admin/sitzungen/${id}/abholen`, { method: 'POST' });
    setLaeuft(null);
    if (!r.ok) { setFehler(await fehlerAus(r, 'Das hat nicht geklappt.')); return; }
    const d: { angefordert: string } = await r.json();
    setListe((l) => l && l.map((s) => (s.id === id ? { ...s, abholen_angefordert: d.angefordert } : s)));
  }

  async function linkKopieren(s: SitzungListe) {
    await navigator.clipboard.writeText(s.link);
    setKopiert(s.id); setTimeout(() => setKopiert(null), 2000);
  }

  if (!liste) return null;

  return (
    <main className="p-8 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div className="eyebrow">Admin · Ausgefüllte Workbooks</div>
        <button className="btn" onClick={() => setNeueEinladung((v) => !v)}>{neueEinladung ? 'Schließen' : 'Neue Einladung'}</button>
      </div>
      {neueEinladung && <div className="mt-4"><EinladungFormular angelegt={laden} /></div>}
      {fehler && <p className="text-[#ff7a52] mt-3">{fehler}</p>}
      <div className="flex flex-col gap-2 mt-6">
        {liste.map((s) => {
          const badge = s.status === 'abgeschlossen'
            ? { t: 'PDF versandt', c: 'border-[#4ec986] text-[#4ec986]' }
            : s.status === 'ergebnis'
              ? { t: 'Ergebnis offen', c: 'border-line text-[#C9CFD3]' }
              : s.status === 'eingeladen'
                ? { t: 'Eingeladen', c: 'border-muted text-muted' }
                : { t: `In Arbeit · ${s.prozent} %`, c: 'border-line text-[#C9CFD3]' };
          const detail = details[s.id];
          return (
            <div key={s.id} className="bg-surf border border-line rounded-xl px-4 py-3.5 text-sm">
              <div className="grid grid-cols-[1fr_1fr_120px_150px_1fr] gap-3.5 items-center">
                <span>{s.vorname} {s.nachname}{s.test && <em className="text-muted"> (Test)</em>}</span>
                <span className="text-[#C9CFD3]">{s.firma}</span>
                <span className="text-muted">{new Date(s.created_at).toLocaleDateString('de-DE')}</span>
                <span className={`text-[11px] uppercase tracking-[.08em] px-2.5 py-1 rounded-full border text-center ${badge.c}`}>{badge.t}</span>
                <span className="flex gap-3 justify-end flex-wrap text-[13px]">
                  <button className="text-o font-medium" onClick={() => ausklappen(s.id)}>Antworten</button>
                  <button className="text-o font-medium" onClick={() => setDateienOffen((o) => (o === s.id ? null : s.id))}>Dateien ({dateien[s.id]?.length ?? 0})</button>
                  {(dateien[s.id]?.length ?? 0) > 0 && (
                    <a className="text-o font-medium" href={`/api/admin/sitzungen/${s.id}/dateien/zip`} download>Alle herunterladen (ZIP)</a>
                  )}
                  {(dateien[s.id]?.length ?? 0) > 0 && (
                    alleAbgeholt(dateien[s.id]) ? null : s.abholen_angefordert ? (
                      <span className="text-muted">angefordert · {uhrzeit(s.abholen_angefordert)}</span>
                    ) : (
                      <button className="text-o font-medium disabled:opacity-40" disabled={laeuft === s.id} onClick={() => abholen(s.id)}>Auf meinen Mac abholen</button>
                    )
                  )}
                  {s.status !== 'abgeschlossen' && <button className="text-o font-medium" onClick={() => linkKopieren(s)}>{kopiert === s.id ? 'Kopiert ✓' : 'Link kopieren'}</button>}
                  <button className="text-o font-medium disabled:opacity-40" disabled={laeuft === s.id} onClick={() => pdfOeffnen(s.id)}>PDF öffnen</button>
                  <button className="text-o font-medium disabled:opacity-40" disabled={laeuft === s.id} onClick={() => pdfNeu(s.id)}>PDF neu erzeugen</button>
                  <button className="text-o font-medium disabled:opacity-40" disabled={laeuft === s.id} onClick={() => linkErneut(s.id)}>Link erneut senden</button>
                  <button className="text-[#ff7a52] font-medium disabled:opacity-40" disabled={laeuft === s.id} onClick={() => zurueckziehen(s.id)}>Zurückziehen</button>
                </span>
              </div>
              {offen === s.id && (
                <div className="mt-4 border-t border-line pt-4">
                  {!detail ? <p className="fine">Lädt …</p> : (
                    <div className="flex flex-col gap-3">
                      {detail.fragen_snapshot.kapitel.map((k) => k.fragen.map((f) => (
                        <div key={f.id}>
                          <div className="text-[13px] uppercase tracking-[.08em] text-muted mb-1">{k.titel} · {f.text}</div>
                          <div className="text-[15px] text-[#E6E9EB] font-light">{antwortAnzeigen(detail.antworten[f.id])}</div>
                        </div>
                      )))}
                      {detail.aha && (
                        <div>
                          <div className="text-[13px] uppercase tracking-[.08em] text-muted mb-1">Aha-Moment</div>
                          <div className="text-[15px] text-[#E6E9EB] font-light">{detail.aha}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {dateienOffen === s.id && (
                <div className="mt-4 border-t border-line pt-4">
                  {(dateien[s.id]?.length ?? 0) === 0 ? <p className="fine">Noch keine Dateien.</p> : (
                    <div className="flex flex-col gap-2">
                      {dateien[s.id].map((d, i) => (
                        <div key={i} className="flex justify-between items-center gap-3 text-[14px]">
                          {d.url ? (
                            <a className="underline text-o truncate" href={d.url} target="_blank" rel="noreferrer">{d.dateiname}</a>
                          ) : (
                            <span className="truncate text-muted" title={d.hinweis}>{d.dateiname} — {d.hinweis ?? 'Adresse nicht verfügbar'}</span>
                          )}
                          <span className={`text-[11px] uppercase tracking-[.08em] px-2.5 py-1 rounded-full border shrink-0 ${d.abgeholt_at ? 'border-[#4ec986] text-[#4ec986]' : 'border-muted text-muted'}`}>{d.abgeholt_at ? `abgeholt ✓ ${abgeholtText(d.abgeholt_at)}` : 'wartet'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {liste.length === 0 && <p className="fine">Noch keine Workbooks.</p>}
      </div>
    </main>
  );
}
