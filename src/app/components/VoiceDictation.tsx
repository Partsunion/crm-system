import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, X, RotateCcw } from 'lucide-react';
import { transcribeCrmNote } from '../utils/crmWorkflow';
import { useWorkspaceGuard } from '../utils/useWorkspaceGuard';

/** An explicit, short microphone dictation. Audio stays in memory, is never
 * attached to a lead, and is released when inserted, discarded or unmounted. */
export function VoiceDictation({leadId, onText, disabled = false}: {leadId: string; onText: (text: string) => void; disabled?: boolean}) {
  const [state, setState] = useState<'idle'|'permission'|'recording'|'transcribing'|'error'>('idle');
  const [error, setError] = useState(''), [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder|null>(null), stream = useRef<MediaStream|null>(null), clip = useRef<Blob|null>(null);
  const request = useRef<AbortController|null>(null), generation = useRef(0), timer = useRef<ReturnType<typeof setInterval>|null>(null);
  const insert = useRef(onText); insert.current = onText;
  const busy = state !== 'idle' && state !== 'error';
  useWorkspaceGuard(state === 'error' && Boolean(clip.current), busy);
  const release = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (recorder.current) { recorder.current.onstop = null; recorder.current.ondataavailable = null; recorder.current.onerror = null; if (recorder.current.state !== 'inactive') recorder.current.stop(); }
    recorder.current = null;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
  };
  const cancel = () => { generation.current++; request.current?.abort(); release(); clip.current = null; setError(''); setState('idle'); };
  useEffect(() => () => { generation.current++; request.current?.abort(); release(); clip.current = null; }, [leadId]);
  async function transcribe(blob: Blob, run: number) {
    if (generation.current !== run) return;
    clip.current = blob; setState('transcribing'); setError('');
    const controller = new AbortController(); request.current = controller;
    try {
      const result = await transcribeCrmNote(leadId, blob, controller.signal);
      if (generation.current !== run) return;
      insert.current(result.text); clip.current = null; setState('idle');
    } catch (e) {
      if (generation.current !== run) return;
      setError(e instanceof Error ? e.message : 'Das Diktat konnte nicht erkannt werden.'); setState('error');
    }
  }
  async function start() {
    if (disabled || busy) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('Diktieren ist in diesem Browser nicht verfügbar. Bitte Chrome, Edge oder Safari mit Mikrofonzugriff verwenden.'); setState('error'); return; }
    const run = ++generation.current; setState('permission'); setError(''); setSeconds(0);
    try {
      const device = await navigator.mediaDevices.getUserMedia({audio: true});
      if (generation.current !== run) { device.getTracks().forEach(track => track.stop()); return; }
      stream.current = device;
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('Audioformat nicht unterstützt');
      const recording = new MediaRecorder(device, {mimeType}); recorder.current = recording;
      const chunks: BlobPart[] = []; let bytes = 0, elapsed = 0;
      recording.ondataavailable = event => { if (event.data.size) { chunks.push(event.data); bytes += event.data.size; } if (bytes > 9 * 1024 * 1024 && recording.state === 'recording') recording.stop(); };
      recording.onstop = () => { const blob = new Blob(chunks, {type: mimeType}); release(); void transcribe(blob, run); };
      recording.onerror = () => { release(); setError('Die Aufnahme wurde unterbrochen. Bitte erneut diktieren.'); setState('error'); };
      recording.start(1000); setState('recording');
      timer.current = setInterval(() => { elapsed++; setSeconds(elapsed); if (elapsed >= 120 && recording.state === 'recording') recording.stop(); }, 1000);
    } catch {
      if (generation.current !== run) return;
      release(); setError('Kein Mikrofonzugriff. Bitte das Mikrofon im Browser freigeben und erneut versuchen.'); setState('error');
    }
  }
  const button = 'inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-accent-500 hover:bg-accent-500/10 disabled:opacity-50';
  return <div className="space-y-1.5">
    <div className="flex flex-wrap items-center gap-2">
      {state === 'recording' ? <button type="button" className={button} onClick={() => recorder.current?.stop()}><Square className="size-3.5 fill-current"/>Diktat übernehmen · {seconds}s</button>
        : busy ? <span role="status" className="inline-flex items-center gap-1.5 text-xs text-text-muted"><Loader2 className="size-3.5 animate-spin"/>{state === 'permission' ? 'Mikrofon freigeben …' : 'Diktat wird in Text umgewandelt …'}</span>
        : clip.current ? <button type="button" className={button} onClick={() => void transcribe(clip.current!, generation.current)}><RotateCcw className="size-3.5"/>Diktat erneut erkennen</button>
        : <button type="button" className={button} disabled={disabled} onClick={() => void start()} title={disabled ? 'Nach dem Gespräch diktieren' : 'Gesprächsnotiz diktieren'}><Mic className="size-3.5"/>Notiz diktieren</button>}
      {(busy || clip.current) && <button type="button" className="inline-flex items-center gap-1 text-xs text-text-muted" onClick={cancel}><X className="size-3.5"/>Verwerfen</button>}
    </div>
    {state === 'recording' && <p role="status" className="text-xs text-text-muted">Mikrofon nimmt auf · maximal 2 Minuten. Der Text wird deiner Notiz hinzugefügt.</p>}
    {error && <p role="alert" className="text-xs text-status-danger">{error}</p>}
  </div>;
}
