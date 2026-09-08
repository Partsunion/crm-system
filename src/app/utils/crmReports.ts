import {getToken} from './storage';
export const reportMetrics=['processed','contacted','numbers','emails','qualified','appointments','salesCalls','deals'] as const;
export type ReportMetric=typeof reportMetrics[number];
export type Counts=Record<ReportMetric,number>;
export const metricLabels:Record<ReportMetric,string>={processed:'Bearbeitet',contacted:'Kontaktiert',numbers:'Rufnummern',emails:'E-Mails',qualified:'Qualifiziert',appointments:'Termine',salesCalls:'Sales Calls',deals:'Abschlüsse'};
export const zeroCounts=():Counts=>Object.fromEntries(reportMetrics.map(k=>[k,0])) as Counts;
export interface ReportGoals {targets:Record<ReportMetric,number|null>;workdays:number[];version:number;updatedAt?:string|null}
export interface ReportMember {id:string;name:string;active:boolean;counts:Counts}
export interface ActivityReport {from:string;to:string;today:string;timezone:string;totals:Counts;members:ReportMember[];days:{day:string;counts:Counts;members:{id:string;counts:Counts}[]}[];goals:ReportGoals;canEditTargets:boolean;workdayCount:number;updatedAt:string}
const base=import.meta.env.VITE_API_BASE_URL||'https://api.partsunion.de';
async function request<T>(path:string,input?:unknown,signal?:AbortSignal):Promise<T>{
 const token=getToken();
 const response=await fetch(base+'/api/crm/reports'+path,{
  credentials:'include',method:input?'PUT':'GET',signal,
  headers:{'Content-Type':'application/json','X-Partsunion-App':'crm',...(token?{Authorization:`Bearer ${token}`}:{})},
  ...(input?{body:JSON.stringify(input)}:{}),
 });
 const data=await response.json();if(!response.ok)throw new Error(data.error||'Berichte sind gerade nicht erreichbar.');return data;
}
export const getActivityReport=(from:string,to:string,signal?:AbortSignal)=>request<ActivityReport>('?'+new URLSearchParams({from,to}),undefined,signal);
export const saveActivityTargets=(input:ReportGoals)=>request<ReportGoals>('/targets',{version:input.version,targets:input.targets,workdays:input.workdays});
export const berlinToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const shiftReportDay=(day:string,amount:number)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10);};
export function reportPreset(preset:'today'|'yesterday'|'week'|'lastWeek'|'month',today=berlinToday()){
 const weekday=new Date(today+'T12:00:00Z').getUTCDay(),monday=shiftReportDay(today,-((weekday+6)%7));
 if(preset==='today')return {from:today,to:today};if(preset==='yesterday'){const day=shiftReportDay(today,-1);return {from:day,to:day};}
 if(preset==='week')return {from:monday,to:shiftReportDay(monday,6)};
 if(preset==='lastWeek')return {from:shiftReportDay(monday,-7),to:shiftReportDay(monday,-1)};
 return {from:today.slice(0,7)+'-01',to:today};
}
