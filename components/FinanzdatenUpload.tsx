'use client';
import { useEffect, useRef, useState } from 'react';
import { ERLAUBT, MAX_BYTES, endung } from '@/lib/dateinamen';

type DateiZeile = { dateiname: string; bytes: number; created_at: string };
type Laufend = { name: string; fortschritt: number; status: 'laedt' | 'fertig' | 'fehler'; fehler?: string };

const ENDUNGEN = Object.keys(ERLAUBT).join(',');

function groesse(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Overlay für den Finanzdaten-Upload: Dropzone, Fortschritt je Datei, bereits gesendete
// Dateien darunter, „Fertig" meldet dem Team, dass etwas angekommen ist.
export function FinanzdatenUpload({ token, hinweis, schliessen }: { token: string; hinweis: string; schliessen: () => void }) {
  const [gesendet, setGesendet] = useState<DateiZeile[] | null>(null);
  const [laufend, setLaufend] = useState<Laufend[]>([]);
  const [etwasHochgeladen, setEtwasHochgeladen] = useState(false);
  const [meldeStatus, setMeldeStatus] = useState<'bereit' | 'sendet' | 'fertig'>('bereit');
  const [ueberZone, setUeberZone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const kasten = useRef<HTMLDivElement>(null);

  const laedtGerade = laufend.some((e) => e.status === 'laedt');

  // Fokus ins Fenster holen, damit die Tastatur nicht hinter dem Overlay weiterläuft.
  useEffect(() => { kasten.current?.focus(); }, []);

  async function laden() {
    const r = await fetch(`/api/w/${token}/dateien`);
    if (r.ok) setGesendet(await r.json());
  }
  useEffect(() => { laden(); }, []);

  async function hochladen(datei: File) {
    setLaufend((l) => [...l, { name: datei.name, fortschritt: 0, status: 'laedt' }]);
    const setzeEintrag = (patch: Partial<Laufend>) => setLaufend((l) => l.map((e) => (e.name === datei.name && e.status === 'laedt' ? { ...e, ...patch } : e)));

    if (datei.size > MAX_BYTES) { setzeEintrag({ status: 'fehler', fehler: 'Größer als 50 MB' }); return; }

    // Content-Type kommt aus der Endung, nicht von `datei.type` (der Browser rät den oft
    // falsch, z. B. bei .docx als application/zip) — dieselbe Liste, die auch der Server prüft.
    const contentType = ERLAUBT[endung(datei.name)]?.[0];
    if (!contentType) { setzeEintrag({ status: 'fehler', fehler: 'Dieser Dateityp ist nicht erlaubt.' }); return; }

    const anfrage = await fetch(`/api/w/${token}/dateien/upload-url`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateiname: datei.name, contentType, bytes: datei.size }),
    });
    const adr = await anfrage.json().catch(() => ({}));
    if (!anfrage.ok) { setzeEintrag({ status: 'fehler', fehler: adr.error ?? 'Dateityp nicht erlaubt' }); return; }

    const hochgeladen = await new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', adr.signedUrl);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setzeEintrag({ fortschritt: Math.round((e.loaded / e.total) * 100) }); };
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
      xhr.onerror = () => resolve(false);
      xhr.send(datei);
    });
    if (!hochgeladen) { setzeEintrag({ status: 'fehler', fehler: 'Hochladen fehlgeschlagen' }); return; }

    const registriert = await fetch(`/api/w/${token}/dateien`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pfad: adr.pfad }),
    });
    if (!registriert.ok) { setzeEintrag({ status: 'fehler', fehler: 'Konnte nicht gemeldet werden' }); return; }
    setzeEintrag({ status: 'fertig', fortschritt: 100 });
    setEtwasHochgeladen(true);
    laden();
  }

  async function dateienAnnehmen(dateien: FileList | null) {
    if (!dateien) return;
    for (const datei of Array.from(dateien)) await hochladen(datei);
  }

  async function fertig() {
    setMeldeStatus('sendet');
    await fetch(`/api/w/${token}/dateien/melden`, { method: 'POST' }).catch(() => {});
    setMeldeStatus('fertig');
  }

  return (
    // Escape schließt das Fenster — außer ein Upload läuft, der sonst abgeschnitten würde.
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-3 overflow-y-auto" onClick={schliessen}>
      <div ref={kasten} role="dialog" aria-modal="true" aria-labelledby="upload-titel" tabIndex={-1}
        className="glas erscheint w-full max-w-[580px] my-6" onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape' && !laedtGerade) schliessen(); }}>
        <div className="flex items-center justify-between">
          <div className="eyebrow" id="upload-titel">Finanzdaten senden</div>
          <button type="button" aria-label="Schließen" className="text-muted text-2xl leading-none hover:text-white transition-colors" onClick={schliessen}>×</button>
        </div>

        <label
          className={`mt-6 flex flex-col items-center justify-center gap-2.5 border border-dashed rounded-2xl px-6 py-12 cursor-pointer text-center normal-case tracking-normal text-white transition-all duration-150 ${ueberZone ? 'border-o bg-o/10' : 'border-white/15 hover:border-o/60 hover:bg-white/[.03]'}`}
          style={ueberZone ? { boxShadow: '0 0 34px rgba(237,122,2,.25) inset' } : undefined}
          onDragOver={(e) => { e.preventDefault(); setUeberZone(true); }}
          onDragLeave={() => setUeberZone(false)}
          onDrop={(e) => { e.preventDefault(); setUeberZone(false); dateienAnnehmen(e.dataTransfer.files); }}
        >
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#ED7A02" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
          <span className="text-[15.5px]">Dateien hierher ziehen oder auswählen</span>
          <span className="fine">PDF, Excel, Word, Text oder PowerPoint · bis 50 MB je Datei</span>
          <input ref={inputRef} type="file" multiple accept={ENDUNGEN} className="hidden" onChange={(e) => { dateienAnnehmen(e.target.files); e.target.value = ''; }} />
        </label>

        {laufend.length > 0 && (
          <div className="mt-5 flex flex-col gap-2">
            {laufend.map((e, i) => (
              <div key={i} className="text-[14px]">
                <div className="flex justify-between gap-3"><span className="truncate">{e.name}</span><span className={e.status === 'fehler' ? 'text-[#ff7a52]' : 'text-muted'}>{e.status === 'fertig' ? '✓' : e.status === 'fehler' ? e.fehler : `${e.fortschritt} %`}</span></div>
                {e.status === 'laedt' && <div className="h-1.5 rounded-full bg-white/[.07] overflow-hidden mt-1.5"><i className="block h-full rounded-full transition-[width] duration-200" style={{ width: `${e.fortschritt}%`, background: 'linear-gradient(90deg,#9F3C07,#F0902C)' }} /></div>}
              </div>
            ))}
          </div>
        )}

        {gesendet && gesendet.length > 0 && (
          <div className="mt-5">
            <div className="fine mb-2">Bereits gesendet</div>
            <div className="flex flex-col gap-1.5">
              {gesendet.map((d, i) => (
                <div key={i} className="flex justify-between gap-3 text-[14px] text-[#C9CFD3] border-t border-white/[.06] pt-1.5 first:border-t-0 first:pt-0"><span className="truncate">{d.dateiname}</span><span className="text-muted shrink-0">{groesse(d.bytes)}</span></div>
              ))}
            </div>
          </div>
        )}

        <p className="fine mt-5">{hinweis}</p>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" className="btn btn-ghost" onClick={schliessen}>Schließen</button>
          <button type="button" className="btn" disabled={(!etwasHochgeladen && !gesendet?.length) || meldeStatus !== 'bereit'} onClick={fertig}>
            {meldeStatus === 'sendet' ? 'Einen Moment …' : meldeStatus === 'fertig' ? 'Danke, gemeldet ✓' : 'Fertig'}
          </button>
        </div>
      </div>
    </div>
  );
}
