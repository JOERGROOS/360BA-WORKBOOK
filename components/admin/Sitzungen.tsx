'use client';
import { useEffect, useState } from 'react';
import type { Sitzung } from '@/lib/db';

type SitzungListe = Pick<Sitzung, 'id' | 'vorname' | 'nachname' | 'firma' | 'email' | 'status' | 'test' | 'created_at' | 'abgeschlossen_at'> & { prozent: number };

function antwortAnzeigen(a: unknown): string {
  if (a === undefined || a === null || a === '') return '—';
  if (typeof a === 'object') return JSON.stringify(a);
  return String(a);
}

export function Sitzungen() {
  const [liste, setListe] = useState<SitzungListe[] | null>(null);
  const [offen, setOffen] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, Sitzung>>({});
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [fehler, setFehler] = useState('');

  async function laden() {
    const r = await fetch('/api/admin/sitzungen');
    if (r.ok) setListe(await r.json());
  }
  useEffect(() => { laden(); }, []);

  async function ausklappen(id: string) {
    if (offen === id) { setOffen(null); return; }
    setOffen(id);
    if (!details[id]) {
      const r = await fetch(`/api/admin/sitzungen/${id}`);
      if (r.ok) { const voll: Sitzung = await r.json(); setDetails((d) => ({ ...d, [id]: voll })); }
    }
  }

  async function pdfOeffnen(id: string) {
    setLaeuft(id); setFehler('');
    const r = await fetch(`/api/admin/sitzungen/${id}/pdf`);
    const d = await r.json();
    setLaeuft(null);
    if (!r.ok) { setFehler(d.error ?? 'PDF noch nicht vorhanden.'); return; }
    window.open(d.url, '_blank');
  }
  async function pdfNeu(id: string) {
    setLaeuft(id); setFehler('');
    const r = await fetch(`/api/admin/sitzungen/${id}/pdf`, { method: 'POST' });
    const d = await r.json();
    setLaeuft(null);
    if (!r.ok) { setFehler(d.error ?? 'Das hat nicht geklappt.'); return; }
    window.open(d.url, '_blank');
  }
  async function linkErneut(id: string) {
    setLaeuft(id); setFehler('');
    const r = await fetch(`/api/admin/sitzungen/${id}/link`, { method: 'POST' });
    setLaeuft(null);
    if (!r.ok) { const d = await r.json().catch(() => ({})); setFehler(d.error ?? 'Das hat nicht geklappt.'); }
  }
  async function loeschen(id: string) {
    if (!confirm('Sitzung inklusive PDF wirklich löschen?')) return;
    setLaeuft(id);
    await fetch(`/api/admin/sitzungen/${id}`, { method: 'DELETE' });
    setLaeuft(null);
    await laden();
  }

  if (!liste) return null;

  return (
    <main className="p-8 max-w-[1100px]">
      <div className="eyebrow">Admin · Ausgefüllte Workbooks</div>
      {fehler && <p className="text-[#ff7a52] mt-3">{fehler}</p>}
      <div className="flex flex-col gap-2 mt-6">
        {liste.map((s) => {
          const badge = s.status === 'abgeschlossen'
            ? { t: 'PDF versandt', c: 'border-[#4ec986] text-[#4ec986]' }
            : s.status === 'ergebnis'
              ? { t: 'Ergebnis offen', c: 'border-line text-[#C9CFD3]' }
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
                  <button className="text-o font-medium disabled:opacity-40" disabled={laeuft === s.id} onClick={() => pdfOeffnen(s.id)}>PDF öffnen</button>
                  <button className="text-o font-medium disabled:opacity-40" disabled={laeuft === s.id} onClick={() => pdfNeu(s.id)}>PDF neu erzeugen</button>
                  <button className="text-o font-medium disabled:opacity-40" disabled={laeuft === s.id} onClick={() => linkErneut(s.id)}>Link erneut senden</button>
                  <button className="text-[#ff7a52] font-medium disabled:opacity-40" disabled={laeuft === s.id} onClick={() => loeschen(s.id)}>Löschen</button>
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
            </div>
          );
        })}
        {liste.length === 0 && <p className="fine">Noch keine Workbooks.</p>}
      </div>
    </main>
  );
}
