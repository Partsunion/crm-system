import {useEffect,useRef,useState} from 'react';
import {Mail,Send,Loader2,Eye,PenLine,RefreshCw,Sparkles,Undo2} from 'lucide-react';
import {toast} from 'sonner';
import {Modal,Button,Field,inputSized,cn} from './ui-kit';
import {CrmMailRequestError,getCrmMailDraft,previewCrmMail,sendCrmMail,type CrmMailDraft} from '../utils/crmMail';
import {personalizeCrmMail} from '../utils/crmWorkflow';

export function LeadEmailComposer({leadId,conversationNotes='',onClose,onSent,onState}:{leadId:string;conversationNotes?:string;onClose:()=>void;onSent:()=>void;onState:(state:{dirty:boolean;busy:boolean})=>void}){
 const [draft,setDraft]=useState<CrmMailDraft|null>(null),[subject,setSubject]=useState(''),[body,setBody]=useState('');
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[sending,setSending]=useState(false),[attempted,setAttempted]=useState(false),[uncertain,setUncertain]=useState(false);
 const [preview,setPreview]=useState(false),[previewing,setPreviewing]=useState(false),[html,setHtml]=useState('');
 const requestId=useRef(crypto.randomUUID()),sendLock=useRef(false);
 const [generating,setGenerating]=useState(false),[instructions,setInstructions]=useState(''),[previous,setPrevious]=useState<{subject:string;body:string}|null>(null);
 const generation=useRef<AbortController|null>(null),generationLock=useRef(false);
 useEffect(()=>()=>{generation.current?.abort();},[]);
 const dirty=Boolean(draft && (subject!==draft.subject || body!==draft.body));
 useEffect(()=>{onState({dirty,busy:sending||generating});return()=>onState({dirty:false,busy:false});},[dirty,sending,generating,onState]);
 useEffect(()=>{
  let alive=true;
  const controller=new AbortController();generation.current=controller;
  void (async()=>{
   try{
    const d=await getCrmMailDraft(leadId);if(!alive)return;
    setDraft(d);setSubject(d.subject);setBody(d.body);setHtml(d.html||'');setLoading(false);
    if(d.aiAvailable&&d.sender){
     generationLock.current=true;setGenerating(true);
     const result=await personalizeCrmMail(leadId,{conversationNotes},controller.signal);if(!alive)return;
     setPrevious({subject:d.subject,body:d.body});setSubject(result.subject);setBody(result.body);setHtml(result.html||'');
    }
   }catch(e){if(alive)setError((e as Error).message);}
   finally{generationLock.current=false;if(alive){setLoading(false);setGenerating(false);}}
  })();
  return()=>{alive=false;controller.abort();};
  // The note snapshot belongs to opening this draft; later edits use generate().
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[leadId]);
 const close=()=>{if(sending)return;if(dirty && !confirm('E-Mail-Entwurf verwerfen?'))return;onClose();};
 async function generate(){
  if(generationLock.current||attempted||sending)return;
  generationLock.current=true;setGenerating(true);setError('');
  const controller=new AbortController();generation.current=controller;
  try{const result=await personalizeCrmMail(leadId,{conversationNotes,instructions,subject,body},controller.signal);if(controller.signal.aborted)return;setPrevious({subject,body});setSubject(result.subject);setBody(result.body);setHtml(result.html||'');setPreview(false);}
  catch(e){if(!controller.signal.aborted)setError((e as Error).message);}
  finally{generationLock.current=false;if(!controller.signal.aborted)setGenerating(false);}
 }
 async function showPreview(){setError('');setPreviewing(true);try{const d=await previewCrmMail(leadId,subject,body);setHtml(d.html||'');setPreview(true);}catch(e){setError((e as Error).message);}finally{setPreviewing(false);}}
 async function send(){
  if(sendLock.current || generating || !draft?.connected || !subject.trim() || !body.trim() || uncertain)return;
  sendLock.current=true;setSending(true);setAttempted(true);setError('');
  try{const result=await sendCrmMail(leadId,{requestId:requestId.current,subject,body});toast.success(`E-Mail von ${result.sender} an ${result.recipient} verschickt.`);onSent();onClose();}
  catch(e){setError((e as Error).message);if(e instanceof CrmMailRequestError){if(['CRM_MAIL_UNCERTAIN','CRM_MAIL_CONFLICT'].includes(e.code))setUncertain(true);else if(e.code==='CRM_MAIL_FAILED' || [400,403,422].includes(e.status)){setAttempted(false);requestId.current=crypto.randomUUID();}}}
  finally{sendLock.current=false;setSending(false);}
 }
 const recipientValid=Boolean(draft && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(draft.recipient));
 return <Modal title="E-Mail an den Lead" subtitle="Nach dem Gespräch · persönlich von dir" size="lg" onClose={close} footer={<div className="flex w-full flex-wrap items-center justify-between gap-2"><Button variant="ghost" onClick={close} disabled={sending}>Schließen</Button><div className="flex gap-2"><Button variant="outline" onClick={()=>preview?setPreview(false):void showPreview()} disabled={loading||sending||generating||previewing||!draft?.connected||!subject.trim()||!body.trim()}>{previewing?<Loader2 className="size-4 animate-spin"/>:preview?<PenLine className="size-4"/>:<Eye className="size-4"/>}{preview?'Bearbeiten':'Vorschau'}</Button><Button onClick={()=>void send()} disabled={loading||sending||generating||uncertain||!draft?.connected||!recipientValid||!subject.trim()||!body.trim()}>{sending?<Loader2 className="size-4 animate-spin"/>:attempted?<RefreshCw className="size-4"/>:<Send className="size-4"/>}{sending?'Wird versendet …':attempted?'Versand prüfen / fortsetzen':'E-Mail senden'}</Button></div></div>}>
  {loading?<div className="flex items-center gap-2 py-8 text-sm text-text-muted"><Loader2 className="size-4 animate-spin"/>Vorlage wird geladen …</div>:<div className="space-y-4">
   <dl className="grid grid-cols-[52px_1fr] gap-x-3 gap-y-2 border-b border-border-subtle pb-4 text-sm"><dt className="text-text-muted">Von</dt><dd className="break-words font-medium">{draft?.sender?`${draft.sender.name} <${draft.sender.address}>`:'Kein persönliches Postfach verbunden'}</dd><dt className="text-text-muted">An</dt><dd className="break-words">{draft?.recipient||'Keine E-Mail-Adresse im Lead'}</dd></dl>
   {draft?.error&&<p role="alert" className="text-sm text-status-warning">{draft.error}</p>}
   {draft&&!recipientValid&&<p role="alert" className="text-sm text-status-warning">Bitte zuerst eine gültige E-Mail-Adresse in den Stammdaten des Leads hinterlegen.</p>}
   {!preview&&<div className="space-y-2 border-b border-border-subtle pb-4">
    <label htmlFor="mail-focus" className="text-xs font-medium text-text-secondary">Was soll die E-Mail aufgreifen?</label>
    <input id="mail-focus" value={instructions} maxLength={1000} disabled={attempted||generating} onChange={e=>setInstructions(e.target.value)} placeholder="Optional: z. B. Lagerbestand ansprechen, kurz halten …" className={inputSized}/>
    <div className="flex flex-wrap items-center gap-3"><Button variant="ghost" size="sm" disabled={attempted||generating||!draft?.aiAvailable||!draft?.sender} onClick={()=>void generate()}>{generating?<Loader2 className="size-3.5 animate-spin"/>:<Sparkles className="size-3.5"/>}{generating?'Text wird personalisiert …':'Neu formulieren'}</Button>{previous&&!attempted&&!generating&&<button type="button" className="inline-flex items-center gap-1 text-xs text-text-muted" onClick={()=>{setSubject(previous.subject);setBody(previous.body);setPrevious(null);setPreview(false);}}><Undo2 className="size-3.5"/>Vorherigen Text wiederherstellen</button>}</div>
    <p className="text-xs text-text-muted">{draft?.aiAvailable?'Berücksichtigt Händlerdaten und Gesprächsnotizen. Bitte Fakten vor dem Versand prüfen.':'Texthilfe noch nicht verbunden. Du kannst diese Vorlage selbst bearbeiten.'}</p>
   </div>}
   {preview?<iframe title="Vorschau der Partsunion-E-Mail" srcDoc={html} sandbox="" referrerPolicy="no-referrer" className="h-[min(58vh,660px)] w-full rounded-md border border-border-subtle bg-white"/>:<>
    <Field label="Betreff"><input value={subject} maxLength={180} disabled={attempted||generating||previewing} onChange={e=>setSubject(e.target.value)} className={inputSized}/></Field>
    <Field label="Nachricht"><textarea value={body} maxLength={10000} rows={11} disabled={attempted||generating||previewing} onChange={e=>setBody(e.target.value)} className={cn(inputSized,'h-auto resize-y py-3 text-sm leading-6')}/></Field>
    <p className="text-xs text-text-muted">Deine Signatur, das Partsunion-Design und der Website-Button werden ergänzt. Antworten gehen an dein persönliches Postfach.</p>
   </>}
   {error&&<p role="alert" className="rounded-md bg-status-danger/10 p-3 text-sm text-status-danger">{error}</p>}
  </div>}
 </Modal>;
}

export function CrmMailSettings(){
 const [data,setData]=useState<Awaited<ReturnType<typeof import('../utils/crmMail').getCrmMailStatus>>|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;import('../utils/crmMail').then(m=>m.getCrmMailStatus()).then(d=>{if(active)setData(d);}).catch(()=>{if(active)setError('Dein Postfach konnte nicht geladen werden.');});return()=>{active=false;};},[]);
 return <section className="rounded-md border border-border-subtle bg-surface p-5"><h2 className="flex items-center gap-2 font-semibold"><Mail className="size-4"/>Deine E-Mail</h2><p className="mt-2 text-sm text-text-secondary">Nachfassmails direkt aus dem Lead senden. Dein persönliches Postfach ist mit dem Mailsystem im Admin verbunden.</p>{error?<p role="alert" className="mt-3 text-sm text-status-danger">{error}</p>:data?<><p className="mt-4 font-medium">{data.sender?.address||'Noch kein persönliches Postfach zugewiesen'}</p><p className="mt-1 text-sm text-text-muted">{data.connected?'Verbunden · persönlicher Absender und Antwortadresse':data.error}</p></>:<p className="mt-3 text-sm text-text-muted">Postfach wird geprüft …</p>}</section>;
}
