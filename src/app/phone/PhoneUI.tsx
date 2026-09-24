import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, ChevronDown, ChevronUp, Circle, ExternalLink, Headphones, History, Loader2, Mic, MicOff, Pause, Phone, PhoneOff, Play, RefreshCw, Save, Settings2, Square, X, Grid3X3 } from 'lucide-react';
import type { Lead } from '../utils/storage';
import { getCurrentUser } from '../utils/storage';
import { usePhone } from './context';
import { VoiceDictation } from '../components/VoiceDictation';
import { callLabel, durationLabel, oauthErrorMessage, phoneApi, type CallLog } from './api';
import { Button, Card, cn, inputClass } from '../components/ui-kit';

function Timer({since,seconds}:{since:number|null;seconds?:number|null}) {
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{if(!since)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[since]);
  return <span className="font-mono tabular-nums">{durationLabel(since?Math.max(0,Math.floor((now-since)/1000)):seconds||0)}</span>;
}
export function CallButton({lead,compact=false}:{lead:Pick<Lead,'id'|'company'|'phone'>;compact?:boolean}) {
  const phone=usePhone();
  return <button type="button" onClick={event=>{event.stopPropagation();void phone?.start(lead);}} disabled={!phone||phone.busy||(phone.live&&phone.call?.leadId!==lead.id)}
    title={phone?.status?.number?`Über ${phone.status.number} im CRM anrufen`:'Im CRM anrufen'} aria-label={`${lead.company} im CRM anrufen: ${lead.phone||'Keine Nummer'}`}
    className={cn('inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-md text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50',compact?'px-1 text-xs text-text-secondary hover:bg-elevated hover:text-accent-500':'h-9 border border-border-subtle bg-elevated px-3 text-sm font-medium text-text-primary hover:border-accent-500/50 hover:text-accent-500')}>
    <Phone size={compact?13:15} className="shrink-0"/><span className="truncate tabular-nums">{lead.phone}</span>
  </button>;
}
export function PhoneStatusButton() {
  const phone=usePhone();if(!phone)return null;
  return <button type="button" onClick={phone.open} title="Telefonie öffnen" aria-label={`Telefonie öffnen${phone.status?.number?', eigene Nummer '+phone.status.number:''}`} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-border-subtle bg-surface px-2.5 text-xs font-medium text-text-secondary hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500">
    <span className="relative"><Phone size={15}/><span className={cn('absolute -right-1 -top-1 size-1.5 rounded-full ring-2 ring-surface',phone.live?'bg-accent-500':phone.ready?'bg-status-success':'bg-text-muted')}/></span>
    <span className="hidden max-w-40 truncate tabular-nums xl:inline">{phone.status?.number||'Telefonie'}</span>
  </button>;
}
function Control({label,children,onClick,active=false,danger=false,disabled=false}:{label:string;children:ReactNode;onClick:()=>void;active?:boolean;danger?:boolean;disabled?:boolean}) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={cn('flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-40',
    danger?'bg-red-600 text-white hover:bg-red-700':
    active?'bg-accent-500/15 text-accent-500':'bg-elevated text-text-secondary hover:text-text-primary')}>
    {children}<span>{label}</span>
  </button>;
}
function ConnectionSettings() {
  const phone=usePhone();const [testing,setTesting]=useState(false),[micResult,setMicResult]=useState('');
  if(!phone)return null;
  const testMic=async()=>{
    setTesting(true);setMicResult('');let stream:MediaStream|undefined;
    try{stream=await navigator.mediaDevices.getUserMedia({audio:true});setMicResult('Mikrofon verfügbar: '+(stream.getAudioTracks()[0]?.label||'Systemmikrofon'));}
    catch{setMicResult('Kein Mikrofonzugriff. Bitte die Browserfreigabe und dein Headset prüfen.');}
    finally{stream?.getTracks().forEach(track=>track.stop());setTesting(false);}
  };
  return <div className="space-y-4">
    <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500"><Headphones size={20}/></span><div className="min-w-0"><p className="text-sm font-semibold text-text-primary">Dein Arbeitsplatz</p><p className="text-xs text-text-muted">Anrufen, mitschreiben, weiterarbeiten.</p></div></div>
    {phone.statusError?<p role="alert" className="text-sm text-status-danger">{phone.statusError}</p>:!phone.status?<p className="text-sm text-text-muted">Telefonie wird geprüft …</p>:!phone.status.configured?<p className="rounded-lg bg-elevated p-3 text-sm text-text-secondary">Die Telefonie wird noch eingerichtet. Sobald die Verbindung freigeschaltet ist, kannst du hier dein Konto verbinden.</p>:<>
      <div className="rounded-lg border border-border-subtle bg-canvas p-3"><p className="text-[11px] font-medium text-text-muted">DEINE LEITUNG</p><p className="mt-1 text-lg font-semibold tabular-nums text-text-primary">{phone.status.number||'Noch keine Nummer verbunden'}</p><p className="mt-1 text-xs text-text-secondary">{phone.status.name||'Persönliches Webex-Calling-Konto'}</p></div>
      {!phone.status.connected?<Button disabled={phone.busy} onClick={()=>void phone.connect()} className="w-full"><Phone size={15}/>Telefonie verbinden</Button>:<>
        <div className="flex items-center gap-2 text-xs text-text-secondary"><span className={cn('size-2 rounded-full',phone.ready?'bg-status-success':'bg-text-muted')}/>{phone.ready?'Für Anrufe in diesem Tab bereit':'Konto verbunden · Browser noch nicht aktiviert'}</div>
        {!phone.status.trackingReady&&<div className="rounded-lg bg-status-warning/10 p-3 text-xs text-text-secondary"><p>Die Anrufprotokollierung ist noch nicht bereit.</p><button type="button" className="mt-2 font-medium text-accent-500" onClick={()=>void phoneApi('/repair-tracking','POST').then(phone.refresh).catch(()=>setMicResult('Protokollierung konnte nicht verbunden werden. Bitte die Einrichtung prüfen.'))}>Verbindung erneut prüfen</button></div>}
        {phone.status.reconnectRequired?<>
          <p className="text-xs text-text-secondary">Für die Browser-Telefonie fehlt noch eine Webex-Freigabe. Verbinde dein Konto erneut und bestätige den erweiterten Zugriff.</p>
          <Button className="w-full" disabled={phone.busy} onClick={()=>void phone.connect()}><RefreshCw size={15}/>Telefonie erneut verbinden</Button>
        </>:<Button className="w-full" disabled={phone.busy||phone.ready||!phone.status.trackingReady} onClick={()=>void phone.activate()}>{phone.busy?<Loader2 size={15} className="animate-spin"/>:phone.ready?<Check size={15}/>:<Headphones size={15}/>} {phone.ready?'Telefonie bereit':'Telefonie im Browser aktivieren'}</Button>}
        <button type="button" onClick={()=>void phone.disconnect()} disabled={phone.busy} className="text-xs text-text-muted hover:text-text-primary">Konto trennen</button>
      </>}
      <div className="border-t border-border-subtle pt-3"><button type="button" onClick={()=>void testMic()} disabled={testing||phone.live} className="inline-flex items-center gap-2 text-xs font-medium text-text-secondary"><Mic size={14}/>{testing?'Mikrofon wird geprüft …':'Mikrofon prüfen'}</button><p className="mt-1 text-[11px] text-text-muted">Ein- und Ausgabe über dein System-Headset.</p>{micResult&&<p role="status" className="mt-2 text-xs text-text-secondary">{micResult}</p>}</div>
      {phone.status.manager&&<div className="border-t border-border-subtle pt-3"><p className="text-xs font-semibold text-text-primary">Aufzeichnungen des Teams</p><p className="mt-1 text-xs text-text-muted">{phone.status.reportingConnected?'Die Auswertung ist mit Webex verbunden.':'Verbinde das Webex-Administratorkonto, um Team-Aufnahmen beim Lead abzuspielen.'}</p><button type="button" disabled={phone.busy} className="mt-2 text-xs font-medium text-accent-500" onClick={()=>void phone.connect('reporting')}>{phone.status.reportingConnected?'Verbindung erneuern':'Auswertung verbinden'}</button></div>}
    </>}
    <button type="button" onClick={()=>void phone.refresh()} className="inline-flex items-center gap-1.5 text-xs text-text-muted"><RefreshCw size={12}/>Status aktualisieren</button>
  </div>;
}
export function PhoneDock({onResumeAudio}:{onResumeAudio:()=>void}) {
  const phone=usePhone(),[keypad,setKeypad]=useState(false),[consent,setConsent]=useState(false),[recordPrompt,setRecordPrompt]=useState(false);
  const [comparison,setComparison]=useState<CallLog|null>(null),[compareError,setCompareError]=useState('');
  useEffect(()=>{
    if(!phone?.opened)return;
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.stopPropagation();phone.minimize();}};
    window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
  },[phone]);
  if(!phone?.opened)return null;
  const own=phone.call?.userId===(getCurrentUser()?.id||getCurrentUser()?.username);
  const current=phone.call;
  const active=phone.live;
  const label=active?(phone.incoming?'Eingehender Anruf':callLabel(phone.state)):phone.state==='ended'?'Gespräch beendet':current?callLabel(current.state):'Telefonie';
  const isRecording=current?.recordingState==='started',isPaused=current?.recordingState==='paused';
  return <aside aria-label="CRM Telefonie" className={cn('fixed bottom-3 left-3 z-[70] w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-border-subtle bg-surface text-text-primary shadow-[0_14px_55px_rgba(0,0,0,0.2)] md:bottom-4 md:left-[calc(16rem+16px)]',phone.minimized&&'md:w-80')}>
    <div className={cn('flex items-center gap-2 px-4 py-3',active?'bg-accent-500/8':'bg-elevated/50')}>
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full',active?'bg-accent-500/15 text-accent-500':'bg-elevated text-text-muted')}><Phone size={15}/></span>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={phone.open}><p className="truncate text-sm font-semibold">{current?.company||current?.number||(phone.incoming?'Anruf an deine Leitung':'Telefonie')}</p><p className="mt-0.5 flex items-center gap-2 text-[11px] text-text-secondary"><span className={cn('size-1.5 rounded-full',active?'bg-status-success':'bg-text-muted')}/>{label}{(active&&phone.connectedAt||current?.duration!=null)&&<Timer since={active?phone.connectedAt:null} seconds={current?.duration}/>}</p></button>
      {phone.minimized&&active&&<button type="button" onClick={()=>void phone.end()} disabled={phone.busy} aria-label="Auflegen" className="rounded-full bg-red-600 p-2 text-white"><PhoneOff size={16}/></button>}
      <button type="button" className="rounded-md p-1.5 text-text-muted hover:bg-elevated" onClick={phone.minimized?phone.open:phone.minimize} aria-label={phone.minimized?'Gesprächspanel öffnen':'Gesprächspanel minimieren'}>{phone.minimized?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button>
      {!active&&<button type="button" className="rounded-md p-1.5 text-text-muted hover:bg-elevated" onClick={()=>void phone.close()} aria-label="Telefonie schließen"><X size={16}/></button>}
    </div>
    {!phone.minimized&&<div className="max-h-[calc(100dvh-155px)] space-y-4 overflow-y-auto p-4">
      {phone.error&&<div role="alert" className="rounded-lg bg-status-danger/10 p-3 text-xs text-status-danger">{phone.error}{phone.error.includes('Audio-Wiedergabe')&&<button className="mt-2 block font-semibold underline" onClick={onResumeAudio}>Ton aktivieren</button>}</div>}
      {!active&&phone.status?.manager&&['assigned','active'].some(reason=>phone.error===oauthErrorMessage(reason))&&<div className="space-y-2 text-xs text-text-secondary">
        <p>Du kannst die Leitung nach erneuter Webex-Anmeldung diesem CRM-Konto zuordnen. Bitte die Telefonie im alten CRM-Tab vorher schließen. Die bisherige CRM-Zuordnung wird ersetzt; alte Anrufprotokolle bleiben erhalten.</p>
        <Button className="w-full" disabled={phone.busy} onClick={()=>void phone.connect('calling',true)}><RefreshCw size={15}/>Leitung diesem Konto zuordnen</Button>
      </div>}
      {!current&&!active?<ConnectionSettings/>:<>
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-base font-semibold tabular-nums">{current?.number||'Nummer wird zugeordnet …'}</p><p className="mt-1 text-[11px] text-text-muted">{current?.direction==='inbound'?'An':'Von'} {current?.ownNumber||phone.status?.number||'deiner Leitung'}</p></div>{current?.leadId&&<button type="button" onClick={phone.openLead} title="Lead öffnen" className="inline-flex shrink-0 items-center gap-1 rounded-md bg-elevated px-2 py-1.5 text-xs text-text-secondary"><ExternalLink size={12}/>Lead</button>}</div>
        {active&&<>
          {phone.incoming?<div className="grid grid-cols-2 gap-2"><Button disabled={phone.busy} onClick={()=>void phone.answer()}><Phone size={16}/>Annehmen</Button><Button variant="ghost" disabled={phone.busy} onClick={()=>void phone.end()}><PhoneOff size={16}/>Ablehnen</Button></div>:<div className="grid grid-cols-5 gap-1.5">
            <Control label={phone.muted?'Mikro an':'Stumm'} active={phone.muted} onClick={phone.mute}>{phone.muted?<MicOff size={18}/>:<Mic size={18}/>}</Control>
            <Control label={phone.held?'Fortsetzen':'Halten'} active={phone.held} disabled={phone.busy||!phone.connectedAt} onClick={()=>void phone.hold()}>{phone.held?<Play size={18}/>:<Pause size={18}/>}</Control>
            <Control label="Ziffern" active={keypad} disabled={!phone.connectedAt} onClick={()=>setKeypad(value=>!value)}><Grid3X3 size={18}/></Control>
            <Control label={isRecording?'Aufnahme':'Aufnehmen'} active={isRecording||recordPrompt} disabled={phone.busy||!current?.answeredAt} onClick={()=>setRecordPrompt(value=>!value)}><Circle size={18} className={isRecording?'fill-red-500 text-red-500':''}/></Control>
            <Control label="Auflegen" danger disabled={phone.busy} onClick={()=>void phone.end()}><PhoneOff size={18}/></Control>
          </div>}
          {keypad&&<div className="grid grid-cols-3 gap-1.5" aria-label="Ziffernfeld">{'123456789*0#'.split('').map(digit=><button key={digit} type="button" onClick={()=>phone.digit(digit)} className="h-9 rounded-md bg-elevated font-mono text-base hover:bg-accent-500/10">{digit}</button>)}</div>}
          {recordPrompt&&<div className="space-y-2 rounded-lg border border-border-subtle p-3">
            {isRecording||isPaused?<><p role="status" className="flex items-center gap-2 text-xs font-medium"><Circle size={10} className={isRecording?'fill-red-500 text-red-500':'text-text-muted'}/>{isRecording?'Aufzeichnung läuft':'Aufzeichnung pausiert'}</p><div className="flex gap-3"><button type="button" disabled={phone.busy} className="inline-flex items-center gap-1 text-xs" onClick={()=>void phone.record(isPaused?'resume':'pause')}><Pause size={12}/>{isPaused?'Fortsetzen':'Pausieren'}</button><button type="button" disabled={phone.busy} className="inline-flex items-center gap-1 text-xs text-status-danger" onClick={()=>void phone.record('stop')}><Square size={12}/>Beenden</button></div></>:<><label className="flex items-start gap-2 text-xs text-text-secondary"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)} className="mt-0.5 accent-accent-500"/>Alle Gesprächsteilnehmer haben der Aufzeichnung zugestimmt.</label><Button disabled={!consent||phone.busy} onClick={()=>void phone.record('start',consent)} className="w-full">Aufzeichnung starten</Button></>}
          </div>}
          {(isRecording||isPaused)&&!recordPrompt&&<p role="status" className="flex items-center gap-1.5 text-[11px] text-text-secondary"><Circle size={9} className={isRecording?'fill-red-500 text-red-500':''}/>{isRecording?'Aufzeichnung läuft':'Aufzeichnung pausiert'}</p>}
        </>}
        {current&&<div className="space-y-2 border-t border-border-subtle pt-3"><div className="flex items-center justify-between"><label htmlFor="crm-call-note" className="text-xs font-semibold">Gesprächsnotiz</label><span role="status" className={cn('text-[10px]',phone.noteError?'text-status-danger':'text-text-muted')}>{phone.saving?'Speichert …':phone.noteError?'Nicht gespeichert':phone.notes?.dirty?'Ungespeichert':'Gespeichert'}</span></div>
          <textarea id="crm-call-note" className={cn(inputClass,'min-h-28 resize-y text-sm leading-relaxed')} rows={5} maxLength={20000} readOnly={!own} value={phone.notes?.text||''} onChange={event=>phone.editNote(event.target.value)} placeholder="Bedarf, Einwände, nächster Schritt …"/>
          <p className="text-[10px] text-text-muted">{current.leadId?`Gehört zu ${current.company}.`:'Noch keinem Lead zugeordnet.'} {own?'Wird automatisch gespeichert.':`Notiz von ${current.userName}.`}</p>
          {phone.noteError&&<div role="alert" className="space-y-2 text-xs text-status-danger"><p>{phone.noteError}</p><button type="button" onClick={()=>void phone.saveNote()} className="inline-flex items-center gap-1 font-medium"><Save size={12}/>Erneut speichern</button><button type="button" className="ml-3 underline" onClick={()=>void navigator.clipboard.writeText(phone.notes?.text||'')}>Entwurf kopieren</button><button type="button" className="block underline" onClick={()=>void phoneApi<CallLog>(`/calls/${current.id}`).then(result=>{setComparison(result);setCompareError('');}).catch(()=>setCompareError('Servernotiz konnte nicht geladen werden.'))}>Mit Servernotiz vergleichen</button>{compareError&&<p>{compareError}</p>}{comparison?.id===current.id&&<div className="space-y-2 rounded bg-elevated p-2 text-text-secondary"><p className="font-medium">Aktueller Serverstand:</p><p className="whitespace-pre-wrap">{comparison.note||'Keine Notiz gespeichert.'}</p><button type="button" className="font-semibold text-accent-500" onClick={()=>{if(phone.notes){phone.notes.useComparedVersion(comparison.noteVersion);void phone.saveNote();setComparison(null);}}}>Meinen Entwurf stattdessen speichern</button></div>}</div>}
          {!active&&<Button onClick={()=>void phone.close()} disabled={phone.saving||phone.busy} className="w-full"><Check size={15}/>Abschließen</Button>}
        </div>}
        {!current&&active&&<p className="text-xs text-text-muted">Das Anrufprotokoll wird zugeordnet. Danach kannst du hier direkt mitschreiben.</p>}
      </>}
    </div>}
  </aside>;
}

function RecordingPlayer({call}:{call:CallLog}) {
  const [items,setItems]=useState<{id:string;url:string}[]|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const load=async()=>{setLoading(true);setError('');try{const result=await phoneApi<{items:{id:string;url:string}[]}>(`/calls/${call.id}/recordings`);setItems(result.items);}catch(error){setError(error instanceof Error?error.message:'Aufzeichnung konnte nicht geladen werden.');}finally{setLoading(false);}};
  return <div><button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-500">{loading?<Loader2 size={12} className="animate-spin"/>:<Play size={12}/>} {loading?'Wird geladen …':items?'Aufnahmen neu laden':'Aufzeichnung anhören'}</button>{error&&<p role="alert" className="mt-1 text-xs text-status-danger">{error}</p>}{items?.length===0&&<p className="mt-1 text-xs text-text-muted">Keine zugeordnete Webex-Aufnahme verfügbar. Neue Aufnahmen können noch verarbeitet werden.</p>}{items?.map(item=><audio key={item.id} controls preload="none" src={item.url} className="mt-2 h-9 w-full max-w-sm" onError={()=>setError('Aufnahme nicht mehr abrufbar. Bitte neu laden.')} aria-label={`Aufzeichnung ${call.company}`}/>)}</div>;
}
export function CallHistory({leadId}:{leadId?:string}) {
  const phone=usePhone(),[items,setItems]=useState<CallLog[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[more,setMore]=useState(false),[loading,setLoading]=useState(false);
  const generation=useRef(0);
  const load=async(append=false)=>{
    const current=generation.current;
    setLoading(true);
    try{const query=new URLSearchParams({team:'true',...(leadId?{leadId}:{}),...(append&&items.length?{before:items[items.length-1].createdAt}:{})});const result=await phoneApi<{items:CallLog[];hasMore:boolean}>('/calls?'+query);if(generation.current!==current)return;setItems(previous=>append?[...previous,...result.items]:result.items);setMore(result.hasMore);setError('');}
    catch(error){if(generation.current===current)setError(error instanceof Error?error.message:'Anrufverlauf konnte nicht geladen werden.');}finally{if(generation.current===current){setLoaded(true);setLoading(false);}}
  };
  useEffect(()=>{
    if(!phone?.status?.configured)return;
    const current=++generation.current;
    const refresh=async()=>{
      try{const query=new URLSearchParams({team:'true',...(leadId?{leadId}:{})});const result=await phoneApi<{items:CallLog[];hasMore:boolean}>('/calls?'+query);if(generation.current!==current)return;setItems(result.items);setMore(result.hasMore);setError('');}
      catch(error){if(generation.current===current)setError(error instanceof Error?error.message:'Anrufverlauf konnte nicht geladen werden.');}
      finally{if(generation.current===current)setLoaded(true);}
    };
    void refresh();window.addEventListener('crm:call-updated',refresh);
    return()=>{generation.current=current+1;window.removeEventListener('crm:call-updated',refresh);};
  },[leadId,phone?.status?.configured]);
  if(!phone?.status?.configured)return null;
  return <section aria-label="Anrufverlauf" className="space-y-3 rounded-xl border border-border-subtle bg-surface p-4"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold"><History size={15}/>Anrufverlauf</h3><button type="button" onClick={()=>void load()} disabled={loading} aria-label="Anrufverlauf aktualisieren" className="rounded p-1 text-text-muted"><RefreshCw size={13} className={loading?'animate-spin':''}/></button></div>
    {error&&<p role="alert" className="text-xs text-status-danger">{error}</p>}
    {!loaded?<p className="text-xs text-text-muted">Anrufe werden geladen …</p>:!items.length&&!error?<p className="text-xs text-text-muted">Hier erscheinen deine CRM-Anrufe mit Gesprächsdauer, Notiz und verfügbaren Aufzeichnungen.</p>:<div className="divide-y divide-border-subtle">{items.map(row=><div key={row.id} className="space-y-2 py-3 first:pt-0 last:pb-0"><div className="flex items-start gap-2"><span className="mt-0.5 text-text-muted">{row.direction==='inbound'?<ArrowDownLeft size={14}/>:<ArrowUpRight size={14}/>}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{leadId?row.number:row.company||row.number}</p><p className="mt-1 text-[11px] text-text-muted">{new Date(row.createdAt).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} · {row.userName}</p></div><div className="shrink-0 text-right"><p className="text-xs font-medium">{row.duration!=null?durationLabel(row.duration)+' Min.':callLabel(row.state)}</p>{row.duration!=null&&<p className="mt-1 text-[10px] text-text-muted">{callLabel(row.state)}</p>}</div></div>
      {row.note&&<p className="line-clamp-3 whitespace-pre-wrap pl-5 text-xs leading-relaxed text-text-secondary">{row.note}</p>}
      <div className="space-y-2 pl-5"><button type="button" className="text-xs text-text-secondary hover:text-accent-500" onClick={()=>void phone.review(row)}>Notiz öffnen</button>{row.endedAt&&row.answeredAt&&<RecordingPlayer call={row}/>}</div>
    </div>)}</div>}
    {more&&<button type="button" className="text-xs font-medium text-accent-500" disabled={loading} onClick={()=>void load(true)}>Ältere Anrufe laden</button>}
  </section>;
}
export function PhoneSettingsCard() {
  const phone=usePhone();if(!phone)return null;
  return <><Card className="flex flex-wrap items-center justify-between gap-4 p-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-accent-500/10 p-2.5 text-accent-500"><Headphones size={20}/></span><div><h2 className="text-sm font-semibold">Telefonie im CRM</h2><p className="mt-1 text-xs text-text-secondary">{phone.status?.number?`${phone.status.number} · ${phone.ready?'Bereit für Anrufe':'Konto verbunden'}`:'Deine Leitung, Gesprächsnotizen und Aufzeichnungen.'}</p></div></div><Button variant="ghost" onClick={phone.open}><Settings2 size={15}/>Telefonie einrichten</Button></Card><CallHistory/></>;
}

export function ActiveCallNote() {
  const phone=usePhone();if(!phone?.call)return null;
  return <div className="space-y-3 rounded-xl border border-accent-500/25 bg-surface p-4">
    <div className="flex items-center justify-between gap-2"><h3 className="inline-flex items-center gap-2 text-sm font-semibold"><Phone size={15} className="text-accent-500"/>{phone.live?'Laufendes Gespräch':'Notiz zum Anruf'}</h3><button type="button" onClick={phone.open} className="text-xs font-medium text-accent-500">Caller öffnen</button></div>
    <p className="text-xs text-text-muted">{phone.call.number} · {phone.call.company}</p>
    <label htmlFor="crm-lead-call-note" className="sr-only">Notiz zu diesem Anruf</label>
    <textarea id="crm-lead-call-note" rows={6} maxLength={20000} className={cn(inputClass,'resize-y py-3 text-sm leading-relaxed')} value={phone.notes?.text||''} onChange={event=>phone.editNote(event.target.value)} placeholder="Bedarf, Einwände und nächste Schritte festhalten …"/>
    {phone.call.leadId&&<VoiceDictation leadId={phone.call.leadId} disabled={phone.live} onText={text=>phone.editNote((phone.notes?.text?phone.notes.text+'\n\n':'')+text)}/>}
    <div className="flex items-center justify-between text-xs"><span role="status" className={phone.noteError?'text-status-danger':'text-text-muted'}>{phone.saving?'Speichert …':phone.noteError?'Nicht gespeichert – Entwurf bleibt erhalten':phone.notes?.dirty?'Ungespeichert':'Automatisch zum Anruf gespeichert'}</span>{phone.noteError&&<button type="button" className="font-medium text-accent-500" onClick={phone.open}>Entwurf prüfen</button>}</div>
  </div>;
}
