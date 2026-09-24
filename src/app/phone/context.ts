import { createContext, useContext } from 'react';
import type { Lead } from '../utils/storage';
import type { CallLog, PhoneStatus } from './api';
import type { CallNotes } from './notes';

export interface PhoneContextValue {
  status:PhoneStatus|null; statusError:string; ready:boolean; busy:boolean; opened:boolean; minimized:boolean;
  call:CallLog|null; live:boolean; state:string; incoming:boolean; muted:boolean; held:boolean; connectedAt:number|null;
  error:string; saving:boolean; noteError:string; notes:CallNotes|null;
  open:()=>void; minimize:()=>void; close:()=>Promise<void>; refresh:()=>Promise<void>;
  connect:(purpose?:'calling'|'reporting',replaceAssignment?:boolean)=>Promise<void>; activate:()=>Promise<void>; disconnect:()=>Promise<void>;
  start:(lead:Pick<Lead,'id'|'company'|'phone'>)=>Promise<void>; answer:()=>Promise<void>; end:()=>Promise<void>;
  mute:()=>void; hold:()=>Promise<void>; digit:(digit:string)=>void;
  record:(action:'start'|'stop'|'pause'|'resume',consent?:boolean)=>Promise<void>;
  editNote:(text:string)=>void; saveNote:()=>Promise<void>; review:(call:CallLog)=>Promise<void>; openLead:()=>void;
}
export const PhoneContext=createContext<PhoneContextValue|null>(null);
export const usePhone=()=>useContext(PhoneContext);
