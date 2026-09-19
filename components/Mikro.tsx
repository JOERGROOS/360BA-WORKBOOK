'use client';
import { useEffect, useRef, useState } from 'react';

type Zustand = 'bereit' | 'nimmt-auf' | 'wandelt-um' | 'fehler';
export type MikroStatus = { z: Zustand; sek: number; fehler: string; pegel: number };

// Reiner Knopf ohne eigene Positionierung — der Slot in FrageText.tsx ist bereits absolut
// positioniert; ein zweites `absolute` hier würde die Versätze aufaddieren. Die Statuszeile
// (Aufnahme läuft/Umwandeln/Fehler) gibt Mikro per onStatus nach oben durch, damit sie unter
// dem Textfeld erscheint statt im Knopf-Slot.
export function Mikro({ token, onText, onStatus }: { token: string; onText: (t: string) => void; onStatus?: (s: MikroStatus) => void }) {
  const [z, setZ] = useState<Zustand>('bereit');
  const [sek, setSek] = useState(0);
  const [fehler, setFehler] = useState('');
  const [pegel, setPegel] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const teile = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sekRef = useRef(0);
  const audioCtx = useRef<AudioContext | null>(null);
  const pegelTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function pegelmessungStoppen() {
    if (pegelTimer.current) { clearInterval(pegelTimer.current); pegelTimer.current = null; }
    if (audioCtx.current) { void audioCtx.current.close(); audioCtx.current = null; }
    setPegel(0);
  }

  useEffect(() => () => { rec.current?.stream.getTracks().forEach((t) => t.stop()); if (timer.current) clearInterval(timer.current); pegelmessungStoppen(); }, []);
  useEffect(() => { onStatus?.({ z, sek, fehler, pegel }); }, [z, sek, fehler, pegel, onStatus]);

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
      console.info('[mikro] start', { mimeType: r.mimeType, tracks: stream.getAudioTracks().map((t) => ({ label: t.label, enabled: t.enabled, muted: t.muted, settings: t.getSettings() })) });
      teile.current = [];
      r.ondataavailable = (e) => { if (e.data.size) teile.current.push(e.data); };
      r.onstop = () => { stream.getTracks().forEach((t) => t.stop()); pegelmessungStoppen(); void hochladen(new Blob(teile.current, { type: r.mimeType })); };
      r.start(1000);
      rec.current = r; setZ('nimmt-auf'); setSek(0); sekRef.current = 0;
      timer.current = setInterval(() => setSek((s) => { const n = s + 1; sekRef.current = n; if (n >= 300) stopp(); return n; }), 1000);

      // Live-Pegelanzeige als Beleg dafür, dass wirklich Ton ankommt.
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioCtx.current = ctx;
      const daten = new Uint8Array(analyser.fftSize);
      pegelTimer.current = setInterval(() => {
        analyser.getByteTimeDomainData(daten);
        let summe = 0;
        for (let i = 0; i < daten.length; i++) { const v = (daten[i] - 128) / 128; summe += v * v; }
        setPegel(Math.sqrt(summe / daten.length));
      }, 200);
    } catch { setZ('fehler'); setFehler('Kein Zugriff auf das Mikrofon. Bitte im Browser erlauben oder tippen.'); }
  }
  function stopp() { if (timer.current) clearInterval(timer.current); if (rec.current?.state === 'recording') rec.current.stop(); }
  async function hochladen(blob: Blob) {
    console.info('[mikro] stopp', { teile: teile.current.length, bytes: blob.size, typ: blob.type, sekunden: sekRef.current });
    if (blob.size < 2000) {
      console.info('[mikro] leer', { bytes: blob.size });
      setZ('fehler'); setFehler('Die Aufnahme war leer – das Mikrofon hat keinen Ton geliefert. Bitte Mikrofon prüfen und erneut versuchen.');
      return;
    }
    setZ('wandelt-um');
    const fd = new FormData();
    fd.append('audio', blob, blob.type.includes('mp4') ? 'aufnahme.mp4' : 'aufnahme.webm');
    try {
      const res = await fetch('/api/transkribieren', { method: 'POST', headers: { 'x-wb-token': token }, body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      if (typeof d.text !== 'string') throw new Error('Keine Antwort erhalten');
      if (d.hinweis === 'leer' || d.text.trim() === '') {
        setZ('fehler'); setFehler('Ich habe nichts verstanden – bitte näher ans Mikrofon oder erneut versuchen.');
        return;
      }
      onText(d.text); setZ('bereit');
    } catch (e) { setZ('fehler'); setFehler((e as Error).message || 'Aufnahme konnte nicht umgewandelt werden.'); }
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); z === 'nimmt-auf' ? stopp() : z === 'bereit' && void start(); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [z]);
  return (
    <button type="button" onClick={() => (z === 'nimmt-auf' ? stopp() : start())} disabled={z === 'wandelt-um'} aria-label={z === 'nimmt-auf' ? 'Aufnahme stoppen' : 'Antwort einsprechen'}
      className={`w-[52px] h-[52px] rounded-full bg-o flex items-center justify-center ${z === 'nimmt-auf' ? 'animate-pulse' : ''}`}>
      {z === 'nimmt-auf' ? <span className="block w-4 h-4 bg-white rounded-sm" /> : <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] fill-white"><path d="M12 15a4 4 0 0 0 4-4V6a4 4 0 1 0-8 0v5a4 4 0 0 0 4 4zm6-4a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93V22h2v-3.07A8 8 0 0 0 20 11h-2z" /></svg>}
    </button>
  );
}
