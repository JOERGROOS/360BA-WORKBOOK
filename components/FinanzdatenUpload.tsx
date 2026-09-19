'use client';
import { useEffect, useRef, useState } from 'react';
import { ERLAUBT, MAX_BYTES } from '@/lib/dateinamen';

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
  const inputRef = useRef<HTMLInputElement>(null);

  async function laden() {
    const r = await fetch(`/api/w/${token}/dateien`);
    if (r.ok) setGesendet(await r.json());
  }
  useEffect(() => { laden(); }, []);

  async function hochladen(datei: File) {
    setLaufend((l) => [...l, { name: datei.name, fortschritt: 0, status: 'laedt' }]);
    const setzeEintrag = (patch: Partial<Laufend>) => setLaufend((l) => l.map((e) => (e.name === datei.name && e.status === 'laedt' ? { ...e, ...patch } : e)));

    if (datei.size > MAX_BYTES) { setzeEintrag({ status: 'fehler', fehler: 'Größer als 50 MB' }); return; }

    const anfrage = await fetch(`/api/w/${token}/dateien/upload-url`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateiname: datei.name, contentType: datei.type, bytes: datei.size }),
    });
    const adr = await anfrage.json().catch(() => ({}));
    if (!anfrage.ok) { setzeEintrag({ status: 'fehler', fehler: adr.error ?? 'Dateityp nicht erlaubt' }); return; }

    const hochgeladen = await new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', adr.signedUrl);
      xhr.setRequestHeader('Content-Type', datei.type || 'application/octet-stream');
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
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-3 overflow-y-auto" onClick={schliessen}>
      <div className="card w-full max-w-[560px] my-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="eyebrow">Finanzdaten senden</div>
          <button type="button" aria-label="Schließen" className="text-muted text-2xl leading-none" onClick={schliessen}>×</button>
        </div>

        <label
          className="mt-5 flex flex-col items-center justify-center gap-2 border border-dashed border-line rounded-xl px-6 py-10 cursor-pointer hover:border-o text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); dateienAnnehmen(e.dataTransfer.files); }}
        >
          <span className="text-[15px]">Dateien hierher ziehen oder auswählen</span>
          <span className="fine">PDF, Excel, Word, Text oder PowerPoint · bis 50 MB je Datei</span>
          <input ref={inputRef} type="file" multiple accept={ENDUNGEN} className="hidden" onChange={(e) => { dateienAnnehmen(e.target.files); e.target.value = ''; }} />
        </label>

        {laufend.length > 0 && (
          <div className="mt-5 flex flex-col gap-2">
            {laufend.map((e, i) => (
              <div key={i} className="text-[14px]">
                <div className="flex justify-between gap-3"><span className="truncate">{e.name}</span><span className={e.status === 'fehler' ? 'text-[#ff7a52]' : 'text-muted'}>{e.status === 'fertig' ? '✓' : e.status === 'fehler' ? e.fehler : `${e.fortschritt} %`}</span></div>
                {e.status === 'laedt' && <div className="h-1 rounded bg-line overflow-hidden mt-1"><i className="block h-full bg-o" style={{ width: `${e.fortschritt}%` }} /></div>}
              </div>
            ))}
          </div>
        )}

        {gesendet && gesendet.length > 0 && (
          <div className="mt-5">
            <div className="fine mb-2">Bereits gesendet</div>
            <div className="flex flex-col gap-1.5">
              {gesendet.map((d, i) => (
                <div key={i} className="flex justify-between gap-3 text-[14px] text-[#C9CFD3]"><span className="truncate">{d.dateiname}</span><span className="text-muted shrink-0">{groesse(d.bytes)}</span></div>
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
