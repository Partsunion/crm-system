import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { saveCrmCallback, type AppointmentAdmin } from '../utils/storage';
import { useAppointmentConflicts } from '../utils/useAppointmentConflicts';
import { useWorkspaceGuard } from '../utils/useWorkspaceGuard';
import { AppointmentConflictReview } from './AppointmentConflictReview';
import { cn, inputClass } from './ui-kit';

const dateKey = (date: Date) => date.toLocaleDateString('sv-SE');
function initialSlot() { const now = new Date(Date.now() + 3600000); now.setMinutes(Math.ceil(now.getMinutes()/15)*15,0,0); return {date:dateKey(now),time:now.toTimeString().slice(0,5)}; }
export function useCallbackPlanner({leadId, assigneeId, onSaved, enabled}: {leadId:string;assigneeId:string;onSaved:()=>void;enabled:boolean}) {
  const [id,setId] = useState(() => crypto.randomUUID());
  const [draft, setDraft] = useState(() => ({...initialSlot(),assigneeId,durationMinutes:15,notes:''}));
  const [touched,setTouched]=useState(false),[saved,setSaved]=useState(''),[saving,setSaving]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{if(enabled){setId(crypto.randomUUID());setDraft({...initialSlot(),assigneeId,durationMinutes:15,notes:''});setTouched(false);setSaved('');setError('');}},[enabled]);
  const lock=useRef(false),alive=useRef(true),afterSave=useRef(onSaved); afterSave.current=onSaved;
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{if(assigneeId)setDraft(previous=>previous.assigneeId?previous:{...previous,assigneeId});},[assigneeId]);
  const start=draft.date+'T'+draft.time, key=JSON.stringify(draft), pending=touched&&key!==saved;
  const valid=Boolean(draft.assigneeId&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(start));
  const review=useAppointmentConflicts(enabled,start,draft.durationMinutes,draft.assigneeId,id);
  const conflict=review.conflicts.length>0&&!review.confirmed;
  useWorkspaceGuard(enabled&&pending&&(Boolean(error)||!valid||conflict||review.error),enabled&&(saving||(pending&&valid&&!error&&!conflict&&!review.error)));
  function change(patch:Partial<typeof draft>){setTouched(true);setError('');setDraft(previous=>({...previous,...patch}));}
  const verify=useRef(review.verify);verify.current=review.verify;
  useEffect(()=>{
    if(!enabled||!pending||!valid||saving||error||review.loading||review.error||conflict)return;
    const timeout=setTimeout(async()=>{
      if(lock.current)return;
      lock.current=true;setSaving(true);
      try{
        if(!await verify.current())return;
        await saveCrmCallback(leadId,id,{start,durationMinutes:draft.durationMinutes,assigneeId:draft.assigneeId,notes:draft.notes});
        if(alive.current){setSaved(key);afterSave.current();}
      }catch(e){if(alive.current)setError(e instanceof Error?e.message:'Der Rückruf konnte nicht gespeichert werden.');}
      finally{lock.current=false;if(alive.current)setSaving(false);}
    },700);
    return()=>clearTimeout(timeout);
  },[enabled,leadId,id,key,pending,valid,saving,error,review.loading,review.error,conflict,retry]);
  return {draft,change,pending,saving,error,valid,conflict,review,saved,retry:()=>{setError('');setRetry(value=>value+1);}};
}

export function CallbackPlanner({controller,admins,onClose}: {controller:ReturnType<typeof useCallbackPlanner>;admins:AppointmentAdmin[];onClose:()=>void}) {
  const {draft,change,pending,saving,error,valid,conflict,review,saved,retry}=controller;
  return <div className="mb-3 space-y-2.5 rounded-md border border-border-subtle p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium text-text-secondary">Rückruf einrichten</span><button type="button" disabled={pending||saving} onClick={onClose} className="inline-flex items-center gap-1 text-xs text-text-muted disabled:opacity-40"><X className="size-3.5"/>Schließen</button></div>
    <div className="flex flex-wrap gap-1.5">{[{label:'Heute',days:0},{label:'Morgen',days:1},{label:'Übermorgen',days:2},{label:'+1 Woche',days:7}].map(preset=><button key={preset.label} type="button" onClick={()=>change({date:dateKey(new Date(Date.now()+preset.days*864e5))})} className={cn('rounded-full px-2.5 py-1 text-xs ring-1 ring-inset',draft.date===dateKey(new Date(Date.now()+preset.days*864e5))?'bg-accent-500 text-white ring-accent-500':'text-text-secondary ring-border-subtle')}>{preset.label}</button>)}</div>
    <div className="grid grid-cols-[1fr_auto] gap-2"><input aria-label="Rückrufdatum" type="date" value={draft.date} onChange={e=>change({date:e.target.value})} className={cn(inputClass,'h-9')}/><input aria-label="Rückrufuhrzeit" type="time" value={draft.time} onChange={e=>change({time:e.target.value})} className={cn(inputClass,'h-9 w-[110px]')}/></div>
    <div className="grid grid-cols-2 gap-2"><select aria-label="Rückrufdauer" value={draft.durationMinutes} onChange={e=>change({durationMinutes:Number(e.target.value)})} className={cn(inputClass,'h-9')}>{[10,15,30,45,60].map(minutes=><option key={minutes} value={minutes}>{minutes} Min.</option>)}</select><select aria-label="Rückrufzuständigkeit" value={draft.assigneeId} onChange={e=>change({assigneeId:e.target.value})} className={cn(inputClass,'h-9')}><option value="">Zuständig wählen</option>{admins.map(admin=><option key={admin.id} value={admin.id}>{admin.name||admin.username}</option>)}</select></div>
    <input aria-label="Rückrufnotiz" value={draft.notes} maxLength={4000} onChange={e=>change({notes:e.target.value})} placeholder="Worum geht’s beim Rückruf?" className={cn(inputClass,'h-9')}/>
    <AppointmentConflictReview review={review}/>
    <p role="status" className="flex items-center gap-1.5 text-xs text-text-muted">{saving||pending&&valid&&!error&&!conflict&&!review.error?<><Loader2 className="size-3.5 animate-spin"/>Wird automatisch gespeichert …</>:!pending&&saved?<><Check className="size-3.5 text-status-success"/>Automatisch gespeichert</>:!valid?'Datum, Uhrzeit und Zuständigkeit vervollständigen.':'Änderungen werden automatisch gespeichert.'}</p>
    {error&&<p role="alert" className="text-xs text-status-danger">{error} <button type="button" className="underline" onClick={retry}>Erneut versuchen</button></p>}
    {pending&&(error||!valid||conflict||review.error)&&<button type="button" className="text-xs text-text-muted underline" onClick={onClose}>Ungespeicherte Änderung verwerfen</button>}
    <p className="text-[11px] text-text-muted">Europe/Berlin · Rückruf erscheint im gemeinsamen Kalender.</p>
  </div>;
}
