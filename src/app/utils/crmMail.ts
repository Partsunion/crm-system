import { getToken } from './storage';
const base=import.meta.env.VITE_API_BASE_URL || 'https://api.partsunion.de';
export interface CrmMailStatus {connected:boolean;sender:{name:string;address:string}|null;error:string|null;sharedWithAdmin:boolean;aiAvailable?:boolean}
export interface CrmMailDraft extends CrmMailStatus {leadId:string;recipient:string;subject:string;body:string;html:string|null;includeBrochure?:boolean;brochure?:{key:string;label:string;filename:string}}
export class CrmMailRequestError extends Error {constructor(message:string,public code:string,public status:number){super(message);}}
async function request<T>(path:string,body?:unknown):Promise<T>{
 const token = getToken();
 const res = await fetch(base + '/api/crm/mail' + path, {
   credentials: 'include',
   method: body ? 'POST' : 'GET',
   headers: {
     'Content-Type': 'application/json',
     'X-Partsunion-App': 'crm',
     ...(token ? { Authorization: `Bearer ${token}` } : {}),
   },
   ...(body ? { body: JSON.stringify(body) } : {}),
 });
 const data = await res.json();
 if (!res.ok) throw new CrmMailRequestError(data.error || 'Die E-Mail-Funktion ist nicht erreichbar.', data.code || '', res.status);
 return data;
}
export const getCrmMailStatus=()=>request<CrmMailStatus>('/status');
export const getCrmMailDraft=(leadId:string)=>request<CrmMailDraft>('/leads/'+encodeURIComponent(leadId));
export const previewCrmMail=(leadId:string,subject:string,body:string,includeBrochure=false)=>request<CrmMailDraft>('/leads/'+encodeURIComponent(leadId)+'/preview',{subject,body,includeBrochure});
export const sendCrmMail=(leadId:string,input:{requestId:string;subject:string;body:string;includeBrochure?:boolean})=>request<{success:boolean;recipient:string;sender:string;messageId:string}>('/leads/'+encodeURIComponent(leadId)+'/send',input);
