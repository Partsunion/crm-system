import '@testing-library/jest-dom/vitest';
import {cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ActivityReportsView} from './ActivityReportsView';
import {zeroCounts,reportPreset} from '../utils/crmReports';
const api=vi.hoisted(()=>({get:vi.fn(),save:vi.fn()}));
vi.mock('../utils/crmReports',async original=>({...await original<typeof import('../utils/crmReports')>(),getActivityReport:api.get,saveActivityTargets:api.save}));
const goals={targets:Object.fromEntries(['processed','contacted','numbers','emails','qualified','appointments','salesCalls','deals'].map(k=>[k,null])),workdays:[1,2,3,4,5],version:0};
beforeEach(()=>{vi.clearAllMocks();api.get.mockImplementation(async(from,to)=>({from,to,totals:{...zeroCounts(),processed:2},members:[{id:'aaron',name:'Aaron',active:true,counts:{...zeroCounts(),processed:1}},{id:'elias',name:'Elias',active:true,counts:{...zeroCounts(),processed:2}}],days:[{day:from,counts:{...zeroCounts(),processed:2},members:[{id:'aaron',counts:{...zeroCounts(),processed:1}}]}],goals,workdayCount:5,canEditTargets:false}));api.save.mockResolvedValue({...goals,version:1});});
afterEach(cleanup);
it('shows actual team/member activity, daily expansion and individual filtering without a target editor for others',async()=>{
 render(<ActivityReportsView/>);await screen.findByText('Leistung im Zeitraum');expect(screen.queryByRole('button',{name:'Zielwerte'})).not.toBeInTheDocument();
 const day=screen.getByRole('button',{expanded:false});fireEvent.click(day);expect(day).toHaveAttribute('aria-expanded','true');
 fireEvent.change(screen.getByRole('combobox',{name:'Bericht für'}),{target:{value:'elias'}});expect(screen.getByText('Persönliche Tagesleistung')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Heute'}));await waitFor(()=>expect(api.get).toHaveBeenLastCalledWith(reportPreset('today').from,reportPreset('today').to,expect.any(AbortSignal)));
});
it('lets Fecat save targets with the server version and keeps empty targets optional',async()=>{
 const previous=api.get.getMockImplementation()!;api.get.mockImplementation(async(...args)=>( {...await previous(...args),canEditTargets:true}));
 render(<ActivityReportsView/>);fireEvent.click(await screen.findByRole('button',{name:'Zielwerte'}));
 fireEvent.change(screen.getByRole('spinbutton',{name:'Tagesziel Bearbeitet'}),{target:{value:'40'}});
 fireEvent.click(screen.getByRole('button',{name:'Ziele speichern'}));await waitFor(()=>expect(api.save).toHaveBeenCalledWith(expect.objectContaining({version:0,targets:expect.objectContaining({processed:40,emails:null})})));
});
