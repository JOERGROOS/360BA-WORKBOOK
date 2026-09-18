'use client';
import { useEffect, useRef, useState } from 'react';

type Zustand = 'bereit' | 'nimmt-auf' | 'wandelt-um' | 'fehler';

export function Mikro({ token, onText }: { token: string; onText: (t: string) => void }) {
  const [z, setZ] = useState<Zustand>('bereit');
  const [sek, setSek] = useState(0);
  const [fehler, setFehler] = useState('');
  const rec = useRef<MediaRecorder | null>(null);
  const teile = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { rec.current?.stream.getTracks().forEach((t) => t.stop()); if (timer.current) clearInterval(timer.current); }, []);

  async function start() {
    setFehler('');
    if (!('MediaRecorder' in window)) { setZ('fehler'); setFehler('Dein Browser kann hier nicht aufnehmen. Bitte tippen.'); return; }
    if (!sessionStorage.getItem('wb-mikro-hinweis')) {
      if (!confirm('Deine Aufnahme wird zur Umwandlung in Text an einen KI-Dienst (OpenAI) übertragen und danach gelöscht. Gespeichert wird nur der Text. Einverstanden?')) return;
      sessionStorage.setItem('wb-mikro-hinweis', 'ja');
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const typ = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const r = new MediaRecorder(stream, typ ? { mimeType: typ } : undefined);
      teile.current = [];
      r.ondataavailable = (e) => { if (e.data.size) teile.current.push(e.data); };
      r.onstop = () => { stream.getTracks().forEach((t) => t.stop()); void hochladen(new Blob(teile.current, { type: r.mimeType })); };
      r.start();
      rec.current = r; setZ('nimmt-auf'); setSek(0);
      timer.current = setInterval(() => setSek((s) => { if (s + 1 >= 300) stopp(); return s + 1; }), 1000);
    } catch { setZ('fehler'); setFehler('Kein Zugriff auf das Mikrofon. Bitte im Browser erlauben oder tippen.'); }
  }
  function stopp() { if (timer.current) clearInterval(timer.current); if (rec.current?.state === 'recording') rec.current.stop(); }
  async function hochladen(blob: Blob) {
    setZ('wandelt-um');
    const fd = new FormData();
    fd.append('audio', blob, blob.type.includes('mp4') ? 'aufnahme.mp4' : 'aufnahme.webm');
    try {
      const res = await fetch('/api/transkribieren', { method: 'POST', headers: { 'x-wb-token': token }, body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      onText(d.text); setZ('bereit');
    } catch (e) { setZ('fehler'); setFehler((e as Error).message || 'Aufnahme konnte nicht umgewandelt werden.'); }
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.code === 'Space' && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); z === 'nimmt-auf' ? stopp() : z === 'bereit' && void start(); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  });
  const mm = `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')}`;
  return (
    <div>
      <button type="button" onClick={() => (z === 'nimmt-auf' ? stopp() : start())} disabled={z === 'wandelt-um'} aria-label={z === 'nimmt-auf' ? 'Aufnahme stoppen' : 'Antwort einsprechen'}
        className={`absolute right-3.5 bottom-3.5 w-[52px] h-[52px] rounded-full bg-o flex items-center justify-center ${z === 'nimmt-auf' ? 'animate-pulse' : ''}`}>
        {z === 'nimmt-auf' ? <span className="block w-4 h-4 bg-white rounded-sm" /> : <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] fill-white"><path d="M12 15a4 4 0 0 0 4-4V6a4 4 0 1 0-8 0v5a4 4 0 0 0 4 4zm6-4a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93V22h2v-3.07A8 8 0 0 0 20 11h-2z" /></svg>}
      </button>
      <div className="mt-3.5 text-sm text-[#C9CFD3] min-h-[22px]">
        {z === 'nimmt-auf' && <span><span className="inline-block w-2 h-2 rounded-full bg-[#ff5a4a] mr-2 animate-pulse" />Aufnahme läuft · {mm} · Stopp mit Klick oder Leertaste. Danach wandeln wir deine Antwort in Text um und glätten sie – du kannst sie noch anpassen.</span>}
        {z === 'wandelt-um' && <span>Wandle deine Antwort in Text um …</span>}
        {z === 'fehler' && <span className="text-[#ff7a52]">{fehler}</span>}
      </div>
    </div>
  );
}
