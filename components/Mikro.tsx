'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

type Zustand = 'bereit' | 'startet' | 'nimmt-auf' | 'wandelt-um' | 'fehler';
export type MikroStatus = { z: Zustand; sek: number; fehler: string; pegel: number };

const HINWEIS_SCHLUESSEL = 'wb-mikro-hinweis';
const MAX_SEKUNDEN = 300;

// Reiner Knopf ohne eigene Positionierung — der Slot in FrageText.tsx ist bereits absolut
// positioniert; ein zweites `absolute` hier würde die Versätze aufaddieren. Die Statuszeile
// (Aufnahme läuft/Umwandeln/Fehler) gibt Mikro per onStatus nach oben durch, damit sie unter
// dem Textfeld erscheint statt im Knopf-Slot.
//
// Grundregel dieses Bauteils (nach dem Fehlerbild „ich klicke und es passiert einfach nichts",
// Jörg 22.09.2026): JEDER Weg endet sichtbar. Kein Zweig darf still aussteigen — weder ein
// abgelehnter Hinweis, noch ein Rekorder, der schon gestoppt ist, noch ein Fehler beim Start.
// Gemessen in Jörgs Chrome: Mikrofon-Freigabe dauert 200–280 ms. In diesem Fenster sah der
// Knopf früher unverändert aus, ein zweiter Klick startete eine zweite Aufnahme und löschte
// dabei die Teile der ersten. Deshalb der Zustand „startet" plus die Wiedereintritts-Sperre.
export function Mikro({ token, onText, onStatus }: { token: string; onText: (t: string) => void; onStatus?: (s: MikroStatus) => void }) {
  const [z, setZ] = useState<Zustand>('bereit');
  const [sek, setSek] = useState(0);
  const [fehler, setFehler] = useState('');
  const [pegel, setPegel] = useState(0);
  const [zeigeHinweis, setZeigeHinweis] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const teile = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sekRef = useRef(0);
  const audioCtx = useRef<AudioContext | null>(null);
  const pegelTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const beschaeftigt = useRef(false);
  const abgeschlossen = useRef(false);
  const wachhund = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aufraeumen = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    if (wachhund.current) { clearTimeout(wachhund.current); wachhund.current = null; }
    if (pegelTimer.current) { clearInterval(pegelTimer.current); pegelTimer.current = null; }
    if (audioCtx.current) { void audioCtx.current.close().catch(() => {}); audioCtx.current = null; }
    rec.current?.stream.getTracks().forEach((t) => t.stop());
    setPegel(0);
  }, []);

  const melde = useCallback((text: string, grund: string) => {
    console.warn('[mikro] fehler', { grund, text });
    aufraeumen();
    beschaeftigt.current = false;
    rec.current = null;
    setZ('fehler');
    setFehler(text);
  }, [aufraeumen]);

  useEffect(() => () => { aufraeumen(); }, [aufraeumen]);
  useEffect(() => { onStatus?.({ z, sek, fehler, pegel }); }, [z, sek, fehler, pegel, onStatus]);

  const hochladen = useCallback(async (blob: Blob, sekunden: number) => {
    console.info('[mikro] stopp', { teile: teile.current.length, bytes: blob.size, typ: blob.type, sekunden });
    // Früher galt alles unter 2000 Byte pauschal als leer. Das hat kurze, aber gültige Antworten
    // verworfen — der Container allein wiegt schon gut 1 KB. Jetzt entscheidet die Tonspur:
    // gar keine Daten heißt leer, alles andere geht zur Umwandlung und OpenAI urteilt.
    if (teile.current.length === 0 || blob.size === 0) {
      // Zwei verschiedene Ursachen, zwei verschiedene Sätze: Wer aus Ungeduld zweimal
      // hintereinander klickt, stoppt nach Sekundenbruchteilen — da liegt nichts am
      // Mikrofon. Der frühere Sammelsatz schickte genau in dem Fall auf die falsche Fährte.
      if (sekunden < 1) melde('Die Aufnahme war zu kurz. Tippe auf das Mikrofon, sprich und stoppe erst danach.', 'zu-kurz');
      else melde('Es ist kein Ton angekommen. Bitte prüfe, ob das richtige Mikrofon ausgewählt ist, und versuche es erneut.', 'keine-daten');
      return;
    }
    setZ('wandelt-um');
    const fd = new FormData();
    fd.append('audio', blob, blob.type.includes('mp4') ? 'aufnahme.mp4' : 'aufnahme.webm');
    try {
      const res = await fetch('/api/transkribieren', { method: 'POST', headers: { 'x-wb-token': token }, body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `Server meldet Fehler ${res.status}`);
      if (typeof d.text !== 'string') throw new Error('Keine Antwort erhalten');
      if (d.hinweis === 'leer' || d.text.trim() === '') {
        melde('Ich habe nichts verstanden – bitte näher ans Mikrofon oder erneut versuchen.', 'nichts-verstanden');
        return;
      }
      onText(d.text);
      beschaeftigt.current = false;
      setFehler('');
      setZ('bereit');
    } catch (e) {
      melde((e as Error).message || 'Aufnahme konnte nicht umgewandelt werden.', 'upload');
    }
  }, [token, onText, melde]);

  // Einziger Weg vom Rekorder in die Umwandlung — egal ob regulär gestoppt, vom Wachhund
  // erzwungen oder weil die Tonspur weggebrochen ist. Läuft garantiert nur einmal je Aufnahme.
  const abschliessen = useCallback((grund: string) => {
    if (abgeschlossen.current) return;
    abgeschlossen.current = true;
    const typ = rec.current?.mimeType ?? 'audio/webm';
    const sekunden = sekRef.current;
    console.info('[mikro] abschluss', { grund, teile: teile.current.length });
    aufraeumen();
    rec.current = null;
    void hochladen(new Blob(teile.current, { type: typ }), sekunden);
  }, [aufraeumen, hochladen]);

  const starteAufnahme = useCallback(async () => {
    if (beschaeftigt.current) return;
    beschaeftigt.current = true;
    abgeschlossen.current = false;
    setFehler('');
    setZ('startet');
    if (!('MediaRecorder' in window) || !navigator.mediaDevices?.getUserMedia) {
      melde('Dein Browser kann hier nicht aufnehmen. Bitte tippe deine Antwort.', 'kein-mediarecorder');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const f = e as Error;
      const text = f.name === 'NotAllowedError'
        ? 'Der Zugriff aufs Mikrofon ist blockiert. Erlaube ihn im Browser (Schloss-Symbol in der Adresszeile) und versuche es erneut.'
        : f.name === 'NotFoundError'
        ? 'Es wurde kein Mikrofon gefunden. Schließ eines an oder tippe deine Antwort.'
        : f.name === 'NotReadableError'
        ? 'Das Mikrofon ist gerade von einem anderen Programm belegt (z. B. Teams oder Zoom). Schließ es dort und versuche es erneut.'
        : `Das Mikrofon ließ sich nicht öffnen (${f.name}).`;
      melde(text, 'getusermedia:' + f.name);
      return;
    }
    // Ab hier ist der Datenstrom offen — jeder Fehlschlag muss ihn wieder schließen,
    // sonst bleibt die Aufnahme-Anzeige des Browsers für immer an.
    try {
      const typ = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const r = new MediaRecorder(stream, typ ? { mimeType: typ } : undefined);
      teile.current = [];
      r.ondataavailable = (e) => { if (e.data.size) teile.current.push(e.data); };
      r.onstop = () => abschliessen('rekorder-gestoppt');
      r.onerror = () => melde('Die Aufnahme wurde vom Browser abgebrochen. Bitte versuche es erneut.', 'rekorder-fehler');
      // Bricht die Tonspur mitten in der Aufnahme weg (Gerät abgezogen, von einem anderen
      // Programm übernommen), stoppt der Rekorder nicht von allein — ohne das hier bliebe
      // der Knopf für immer auf „Aufnahme läuft" stehen.
      stream.getAudioTracks().forEach((t) => { t.onended = () => abschliessen('tonspur-beendet'); });
      // 250 ms statt 1000 ms: Der Rekorder liefert seine Daten nur im Takt dieses Wertes.
      // Bei 1000 ms enthielt eine Aufnahme unter einer Sekunde nachweislich NULL Byte —
      // gemessen am 22.09.2026 mit zwei Klicks im Abstand von 60 ms.
      r.start(250);
      rec.current = r;
      setZ('nimmt-auf');
      setSek(0);
      sekRef.current = 0;
      console.info('[mikro] start', { mimeType: r.mimeType, geraet: stream.getAudioTracks()[0]?.label });
      timer.current = setInterval(() => {
        const n = sekRef.current + 1;
        sekRef.current = n;
        setSek(n);
        if (n >= MAX_SEKUNDEN) stoppeAufnahme();
      }, 1000);

      // Live-Pegelanzeige als Beleg dafür, dass wirklich Ton ankommt.
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
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
    } catch (e) {
      stream.getTracks().forEach((t) => t.stop());
      melde(`Die Aufnahme ließ sich nicht starten (${(e as Error).name}). Bitte tippe deine Antwort oder versuche es erneut.`, 'start');
    }
  }, [melde, abschliessen]);

  // Kein `confirm()` mehr: Chrome unterdrückt Dialoge einer Seite dauerhaft, sobald der Nutzer
  // einmal „weitere Dialoge verhindern" angekreuzt hat — danach lieferte confirm() ohne jede
  // Anzeige `false` und der Knopf tat schlicht nichts. Der Hinweis steht jetzt in der Seite.
  function knopfGedrueckt() {
    if (z === 'nimmt-auf') { stoppeAufnahme(); return; }
    if (z === 'startet' || z === 'wandelt-um') return;
    if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(HINWEIS_SCHLUESSEL)) { setZeigeHinweis(true); return; }
    void starteAufnahme();
  }

  function hinweisAngenommen() {
    try { sessionStorage.setItem(HINWEIS_SCHLUESSEL, 'ja'); } catch { /* Privatmodus: dann eben jedes Mal */ }
    setZeigeHinweis(false);
    void starteAufnahme();
  }

  function stoppeAufnahme() {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    const r = rec.current;
    if (!r) { abschliessen('kein-rekorder'); return; }
    if (r.state === 'inactive') { abschliessen('schon-inaktiv'); return; }
    try {
      r.requestData();
      r.stop();
    } catch (e) {
      console.warn('[mikro] stop-fehler', e);
      abschliessen('stop-warf-fehler');
      return;
    }
    // Wachhund: Falls `onstop` ausbleibt (beobachtet, wenn der Browser den Rekorder
    // im Hintergrund abräumt), wird nach 3 Sekunden trotzdem abgeschlossen. Ohne ihn
    // bliebe der Knopf still auf „Aufnahme läuft" stehen — genau das Fehlerbild.
    wachhund.current = setTimeout(() => abschliessen('wachhund'), 3000);
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.target !== document.body) return;
      e.preventDefault();
      knopfGedrueckt();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const beschriftung = z === 'nimmt-auf' ? 'Aufnahme stoppen' : z === 'startet' ? 'Mikrofon wird geöffnet' : 'Antwort einsprechen';
  return (
    <>
      {zeigeHinweis && (
        <div role="dialog" aria-label="Hinweis zur Spracheingabe"
          className="absolute bottom-[62px] right-0 z-20 w-[min(320px,calc(100vw-4rem))] rounded-2xl border border-white/12 bg-[#101C25] p-4 text-left shadow-2xl">
          <p className="text-[13.5px] leading-[1.6] text-[#C9CFD3] font-light">
            Deine Aufnahme wird zur Umwandlung in Text an einen KI-Dienst (OpenAI) übertragen und danach gelöscht. Gespeichert wird nur der Text.
          </p>
          <div className="flex gap-2 mt-3.5">
            <button type="button" onClick={hinweisAngenommen}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-white" style={{ background: 'linear-gradient(180deg,#F0902C,#ED7A02)' }}>
              Einverstanden, aufnehmen
            </button>
            <button type="button" onClick={() => setZeigeHinweis(false)}
              className="rounded-lg border border-white/12 px-3 py-1.5 text-[13px] text-muted hover:text-white transition-colors">
              Abbrechen
            </button>
          </div>
        </div>
      )}
      <button type="button" onClick={knopfGedrueckt} disabled={z === 'wandelt-um'} aria-label={beschriftung} title={beschriftung}
        style={{ background: 'linear-gradient(180deg,#F0902C,#ED7A02)', boxShadow: z === 'nimmt-auf' ? undefined : '0 6px 20px rgba(237,122,2,.32)' }}
        className={`w-[52px] h-[52px] rounded-full flex items-center justify-center transition-transform duration-150 active:scale-95 ${z === 'nimmt-auf' ? 'puls' : ''} ${z === 'wandelt-um' || z === 'startet' ? 'opacity-60' : ''}`}>
        {z === 'startet' ? (
          <span className="block w-5 h-5 rounded-full border-2 border-white/35 border-t-white animate-spin" />
        ) : z === 'nimmt-auf' ? (
          <span className="block w-4 h-4 bg-white rounded-sm" />
        ) : (
          <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] fill-white"><path d="M12 15a4 4 0 0 0 4-4V6a4 4 0 1 0-8 0v5a4 4 0 0 0 4 4zm6-4a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93V22h2v-3.07A8 8 0 0 0 20 11h-2z" /></svg>
        )}
      </button>
    </>
  );
}
