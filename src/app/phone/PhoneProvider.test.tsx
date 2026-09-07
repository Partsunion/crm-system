import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PhoneProvider } from './PhoneProvider';
import { ActiveCallNote, CallButton } from './PhoneUI';
import { phoneApi, type CallLog } from './api';
import { getCurrentUser } from '../utils/storage';

const sdk=vi.hoisted(()=>({dial:vi.fn(),end:vi.fn(),event:undefined as undefined|((value:string)=>void)}));
vi.mock('./sdk',()=>({BrowserPhone:class{
  constructor(_audio:unknown,event:(value:string)=>void,_incoming:unknown,private connection:(ready:boolean)=>void){sdk.event=event;}
  async activate(){this.connection(true);return '+4922812345';}dial=sdk.dial;
  async end(){sdk.end();sdk.event?.('ended');}async dispose(){}mute(){}async hold(){}digit(){}
}}));
vi.mock('./api',async original=>({...await original<typeof import('./api')>(),phoneApi:vi.fn()}));
vi.mock('../utils/storage',()=>({getCurrentUser:vi.fn(),authHeaders:()=>({})}));
const api=vi.mocked(phoneApi),user={id:'sales',name:'Alex',username:'alex',role:'sales' as const,active:true};
const lead={id:'lead-a',company:'Werkstatt A',phone:'0228 12345'};
const call:CallLog={id:'call-a',leadId:'lead-a',company:lead.company,userId:'sales',userName:'Alex',number:'+4922812345',ownNumber:'+4922855555',direction:'outbound',state:'preparing',recordingState:null,createdAt:new Date().toISOString(),answeredAt:null,endedAt:null,duration:null,note:'',noteVersion:0};
beforeEach(()=>{
  vi.clearAllMocks();sessionStorage.clear();vi.mocked(getCurrentUser).mockReturnValue(user);
  Object.defineProperty(navigator,'locks',{configurable:true,value:{request:(_key:unknown,_options:unknown,fn:(lock:object)=>Promise<void>)=>fn({})}});
  api.mockImplementation(async(path,method,body)=>{
    if(path==='/status')return {configured:true,connected:true,trackingReady:true,number:'+4922855555',manager:false};
    if(path==='/browser-token')return {accessToken:'dummy-token'};
    if(path==='/calls'&&method==='POST')return {...call};
    if(path.includes('/note'))return {...call,noteVersion:1,note:(body as {note:string}).note};
    if(path.startsWith('/calls'))return {items:[],hasMore:false};
    return {ok:true};
  });
  sdk.dial.mockResolvedValue(undefined);
});
afterEach(cleanup);
function workspace(second=false){return <PhoneProvider user={user} onOpenLead={vi.fn()}><CallButton lead={lead}/><ActiveCallNote/>{second&&<div data-testid="other-view"><CallButton lead={{id:'lead-b',company:'Werkstatt B',phone:'030 999999'}}/></div>}</PhoneProvider>;}
it('keeps the active call and note on its lead when the workspace view changes',async()=>{
  const view=render(workspace());await waitFor(()=>expect(api).toHaveBeenCalledWith('/status'));
  fireEvent.click(screen.getByRole('button',{name:/Werkstatt A im CRM/}));
  const textarea=await screen.findByLabelText('Gesprächsnotiz');
  expect(sdk.dial).toHaveBeenCalledWith(call.number);
  act(()=>sdk.event?.('connected'));
  fireEvent.change(textarea,{target:{value:'Interesse an täglicher Lieferung'}});
  view.rerender(workspace(true));
  expect((screen.getByLabelText('Gesprächsnotiz') as HTMLTextAreaElement).value).toBe('Interesse an täglicher Lieferung');
  expect((screen.getByRole('button',{name:/Werkstatt B im CRM/}) as HTMLButtonElement).disabled).toBe(true);
  await waitFor(()=>expect(api).toHaveBeenCalledWith('/calls/call-a/note','PATCH',{note:'Interesse an täglicher Lieferung',version:0}));
  fireEvent.click(screen.getByRole('button',{name:'Gesprächspanel minimieren'}));
  expect(screen.queryByLabelText('Gesprächsnotiz')).toBeNull();
  expect(sdk.end).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Notiz zu diesem Anruf'),{target:{value:'Weitergeschrieben direkt beim Lead'}});
  fireEvent.click(screen.getByRole('button',{name:'Gesprächspanel öffnen'}));
  expect((screen.getByLabelText('Gesprächsnotiz') as HTMLTextAreaElement).value).toBe('Weitergeschrieben direkt beim Lead');
});
it('shows a save failure and keeps the draft after hangup',async()=>{
  render(workspace());await waitFor(()=>expect(api).toHaveBeenCalledWith('/status'));
  fireEvent.click(screen.getByRole('button',{name:/Werkstatt A im CRM/}));
  const textarea=await screen.findByLabelText('Gesprächsnotiz');
  api.mockRejectedValueOnce(new Error('Verbindung unterbrochen'));
  fireEvent.change(textarea,{target:{value:'Nicht verlieren'}});
  await screen.findByText('Nicht gespeichert');
  expect(sessionStorage.getItem('crm-call-draft:sales:call-a')).toBe('Nicht verlieren');
  expect((textarea as HTMLTextAreaElement).value).toBe('Nicht verlieren');
});
