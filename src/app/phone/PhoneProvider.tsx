import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { Lead, User } from '../utils/storage';
import { oauthErrorMessage, phoneApi, type CallLog, type PhoneStatus } from './api';
import { CallNotes } from './notes';
import type { BrowserPhone, SdkCall } from './sdk';
import { PhoneDock } from './PhoneUI';
import { PhoneContext, type PhoneContextValue } from './context';

const message=(error:unknown)=>error instanceof Error?error.message:'Telefonie konnte nicht verbunden werden.';

export function PhoneProvider({children,user,onOpenLead}:{children:ReactNode;user:User|null;onOpenLead:(id:string)=>void}) {
  const [status,setStatus]=useState<PhoneStatus|null>(null),[statusError,setStatusError]=useState('');
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[opened,setOpened]=useState(()=>new URLSearchParams(window.location.search).has('webex')),[minimized,setMinimized]=useState(false);
  const [call,setCall]=useState<CallLog|null>(null),[live,setLive]=useState(false),[state,setState]=useState(''),[incoming,setIncoming]=useState(false);
  const [muted,setMuted]=useState(false),[held,setHeld]=useState(false),[connectedAt,setConnectedAt]=useState<number|null>(null);
  const [error,setError]=useState(()=>{const query=new URLSearchParams(window.location.search);return query.get('webex')==='error'?oauthErrorMessage(query.get('webexReason')):'';}),[saving,setSaving]=useState(false),[noteError,setNoteError]=useState('');
  const [noteController,setNoteController]=useState<CallNotes|null>(null);
  const [,rerender]=useState(0);
  const sdk=useRef<BrowserPhone|null>(null),audio=useRef<HTMLAudioElement>(null),callRef=useRef<CallLog|null>(null),liveRef=useRef(false);
  const notes=useRef<CallNotes|null>(null),busyRef=useRef(false),alive=useRef(true),polling=useRef(false),readyRef=useRef(false);
  const incomingSince=useRef<number|null>(null),activeLock=useRef<(()=>void)|null>(null);
  const userId=user?.id||user?.username||'';
  const setCurrent=(next:CallLog|null)=>{callRef.current=next;setCall(next);};
  const setLiveCall=(value:boolean)=>{liveRef.current=value;setLive(value);};
  const setConnection=(value:boolean)=>{readyRef.current=value;if(alive.current)setReady(value);};
  const open=()=>{setOpened(true);setMinimized(false);};
  const select=(next:CallLog)=>{
    setCurrent(next);
    if(notes.current?.callId!==next.id){notes.current=new CallNotes(next.id,next,()=>{if(alive.current)rerender(v=>v+1);},userId);setNoteController(notes.current);setNoteError('');}
  };
  const refresh=async()=>{
    try{const result=await phoneApi<PhoneStatus>('/status');if(alive.current){setStatus(result);setStatusError('');}}
    catch(error){if(alive.current)setStatusError(message(error));}
  };
  const poll=async()=>{
    if(polling.current)return;polling.current=true;
    try{
      const result=await phoneApi<{items:CallLog[]}>('/calls');
      if(!alive.current)return;
      const current=callRef.current;
      if(current){
        const updated=result.items.find(row=>row.id===current.id);
        if(updated){setCurrent(updated);if(updated.endedAt&&!current.endedAt)window.dispatchEvent(new Event('crm:call-updated'));}
      }else if(incomingSince.current){
        const next=result.items.find(row=>row.direction==='inbound'&&!row.endedAt&&Date.parse(row.createdAt)>incomingSince.current!-10000);
        if(next){select(next);incomingSince.current=null;}
      }
    }catch(error){if(liveRef.current&&alive.current)setError('Das Anrufprotokoll ist gerade nicht erreichbar. '+message(error));}
    finally{polling.current=false;}
  };
  const saveNote=async()=>{
    const draft=notes.current;if(!draft?.dirty)return;
    setSaving(true);setNoteError('');
    try{await draft.flush();}
    catch(error){setNoteError(message(error));throw error;}
    finally{if(alive.current)setSaving(false);}
  };
  useEffect(()=>{
    alive.current=true;
    void phoneApi<PhoneStatus>('/status').then(result=>{if(alive.current){setStatus(result);setStatusError('');}}).catch(error=>{if(alive.current)setStatusError(message(error));});
    const params=new URLSearchParams(window.location.search);
    if(params.has('webex')){if(params.get('webex')==='connected')toast.success('Webex-Konto verbunden.');params.delete('webex');params.delete('webexReason');window.history.replaceState(window.history.state,'',window.location.pathname+(params.size?'?'+params:'')+window.location.hash);}
    const unload=(event:BeforeUnloadEvent)=>{if(liveRef.current||notes.current?.dirty){event.preventDefault();event.returnValue='';}};
    const logout=(event:Event)=>{if(liveRef.current||notes.current?.dirty){event.preventDefault();open();toast.error('Bitte das Gespräch beenden und die Notiz speichern, bevor du dich abmeldest.');}};
    window.addEventListener('beforeunload',unload);window.addEventListener('crm:logout-check',logout);
    return()=>{alive.current=false;window.removeEventListener('beforeunload',unload);window.removeEventListener('crm:logout-check',logout);void sdk.current?.dispose();activeLock.current?.();};
  // One phone belongs to the authenticated workspace, not a view or lead detail.
  },[userId]);
  useEffect(()=>{
    if(!status?.connected)return;
    void poll();const timer=setInterval(()=>{if(liveRef.current||document.visibilityState==='visible')void poll();},live?3000:20000);
    return()=>clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[status?.connected,live]);
  const noteText=noteController?.text;
  useEffect(()=>{
    if(!notes.current?.dirty)return;
    const timer=setTimeout(()=>void saveNote().catch(()=>undefined),700);
    return()=>clearTimeout(timer);
  },[noteText]);
  const connect=async(purpose:'calling'|'reporting'='calling')=>{
    if(liveRef.current)return;await saveNote();
    const result=await phoneApi<{url:string}>('/connect','POST',{purpose});window.location.assign(result.url);
  };
  const acquireTab=async()=>{
    if(!navigator.locks)throw new Error('Bitte einen aktuellen Chrome-, Edge- oder Safari-Browser verwenden.');
    return new Promise<void>((resolve,reject)=>{
      void navigator.locks.request('partsunion-crm-phone:'+userId,{ifAvailable:true},async lock=>{
        if(!lock){reject(new Error('Die Telefonie ist bereits in einem anderen CRM-Tab aktiv.'));return;}
        await new Promise<void>(release=>{activeLock.current=release;resolve();});
      }).catch(reject);
    });
  };
  const onIncoming=(_call:SdkCall)=>{
    if(notes.current?.dirty){void sdk.current?.end();toast.error('Eingehenden Anruf bitte auf einem anderen Gerät annehmen; deine Notiz ist noch nicht gespeichert.');return;}
    notes.current=null;setNoteController(null);setCurrent(null);setNoteError('');setError('');setConnectedAt(null);setMuted(false);setHeld(false);
    incomingSince.current=Date.now();setLiveCall(true);setState('alerting');setIncoming(true);open();void poll();
  };
  const onEvent=(value:string)=>{
    if(!alive.current)return;
    if(value==='audio-blocked'){setError('Audio-Wiedergabe wurde blockiert. Bitte „Ton aktivieren“ drücken.');return;}
    if(value==='call-error'){setError('Webex meldet ein Gesprächsproblem. Bitte Verbindung prüfen oder auflegen.');return;}
    if(value==='ended'){setLiveCall(false);setIncoming(false);setState('ended');setHeld(false);void saveNote().catch(()=>undefined);void poll();return;}
    if(value==='connected'){setConnectedAt(previous=>previous||Date.now());setIncoming(false);}
    setState(value);setHeld(value==='held');
  };
  const activate=async()=>{
    if(readyRef.current)return;
    if(status?.reconnectRequired)throw new Error('Bitte die Telefonie erneut verbinden und den erweiterten Webex-Zugriff freigeben.');
    if(sdk.current){await sdk.current.dispose();sdk.current=null;activeLock.current?.();activeLock.current=null;}
    await acquireTab();
    try{
      const {accessToken}=await phoneApi<{accessToken:string}>('/browser-token','POST');
      const {BrowserPhone}=await import('./sdk');
      if(!audio.current)throw new Error('Audio-Ausgabe konnte nicht vorbereitet werden.');
      const phone=new BrowserPhone(audio.current,onEvent,onIncoming,setConnection);sdk.current=phone;
      const number=await phone.activate(accessToken);
      if(number)setStatus(previous=>previous?{...previous,number}:previous);
    }catch(error){await sdk.current?.dispose();sdk.current=null;activeLock.current?.();activeLock.current=null;throw error;}
  };
  const perform=async(action:()=>Promise<void>)=>{
    if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');
    try{await action();}catch(error){setError(message(error));}finally{busyRef.current=false;if(alive.current)setBusy(false);}
  };
  const start=async(lead:Pick<Lead,'id'|'company'|'phone'>)=>{
    open();if(liveRef.current)return;
    if(!status?.connected){setError('Verbinde zuerst deine Telefonie, um direkt im CRM anzurufen.');return;}
    await perform(async()=>{
      await saveNote();await activate();
      const prepared=await phoneApi<CallLog>('/calls','POST',{leadId:lead.id,requestId:crypto.randomUUID()});
      select(prepared);setState('connecting');setConnectedAt(null);setMuted(false);setHeld(false);setIncoming(false);setLiveCall(true);
      try{await sdk.current!.dial(prepared.number);}
      catch(error){setLiveCall(false);setState('failed');await phoneApi(`/calls/${prepared.id}/cancel-preparation`,'POST').catch(()=>undefined);throw error;}
    });
  };
  const close=async()=>{
    if(liveRef.current){setMinimized(true);return;}
    await perform(async()=>{await saveNote();setOpened(false);setCurrent(null);notes.current=null;setNoteController(null);setState('');});
  };
  const review=async(row:CallLog)=>{
    if(liveRef.current){open();return;}
    await perform(async()=>{await saveNote();select(row);setState('');setConnectedAt(null);open();});
  };
  const disconnect=async()=>{if(liveRef.current)return;await saveNote();await sdk.current?.dispose();sdk.current=null;activeLock.current?.();activeLock.current=null;await phoneApi('/connection','DELETE');await refresh();};
  const value:PhoneContextValue={status,statusError,ready,busy,opened,minimized,call,live,state,incoming,muted,held,connectedAt,error,saving,noteError,notes:noteController,
    open,minimize:()=>setMinimized(true),close,refresh,connect:(purpose)=>perform(()=>connect(purpose)),activate:()=>perform(activate),disconnect:()=>perform(disconnect),start,
    answer:()=>perform(async()=>{await sdk.current?.answer();setIncoming(false);}),
    end:()=>perform(async()=>{await sdk.current?.end();}),
    mute:()=>{sdk.current?.mute(!muted);setMuted(!muted);},hold:()=>perform(async()=>{await sdk.current?.hold(!held);}),digit:value=>sdk.current?.digit(value),
    record:(action,consent)=>perform(async()=>{if(!callRef.current)throw new Error('Anrufprotokoll wird noch zugeordnet.');await phoneApi(`/calls/${callRef.current.id}/recording`,'POST',{action,consent});toast.success('Aufnahme-Steuerung an Webex gesendet.');await poll();}),
    editNote:text=>{notes.current?.set(text);setNoteError('');},saveNote:()=>saveNote().catch(()=>undefined),review,
    openLead:()=>{if(callRef.current?.leadId)onOpenLead(callRef.current.leadId);},
  };
  return <PhoneContext.Provider value={value}>{children}<audio ref={audio} autoPlay playsInline className="hidden" /><PhoneDock key={call?.id||'setup'} onResumeAudio={()=>void audio.current?.play().then(()=>setError('')).catch(()=>setError('Bitte die Audiofreigabe im Browser prüfen.'))} /></PhoneContext.Provider>;
}
