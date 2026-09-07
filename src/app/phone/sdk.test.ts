import { beforeEach, expect, it, vi } from 'vitest';
import { BrowserPhone } from './sdk';

const mock=vi.hoisted(()=>({registered:false,lines:{} as Record<string,unknown>}));
vi.mock('@webex/webex-core',()=>({MemoryStoreAdapter:class{}}));
vi.mock('webex/calling',()=>({default:{init:async()=>({
  on:(event:string,fn:()=>void)=>{if(event==='ready')queueMicrotask(fn);},off:vi.fn(),
  register:async()=>undefined,registered:mock.registered,
  callingClient:{getLines:()=>mock.lines},deregister:async()=>undefined,
})}}));
beforeEach(()=>{mock.registered=false;mock.lines={};});
it('reports a swallowed WDM registration failure without claiming the number is missing',async()=>{
  const ready=vi.fn(),phone=new BrowserPhone(document.createElement('audio'),vi.fn(),vi.fn(),ready);
  await expect(phone.activate('dummy')).rejects.toThrow('Webex hat die Browser-Anmeldung nicht freigegeben');
  expect(ready).not.toHaveBeenCalledWith(true);
});
it('distinguishes client initialization failure from device registration failure',async()=>{
  mock.registered=true;
  const phone=new BrowserPhone(document.createElement('audio'),vi.fn(),vi.fn(),vi.fn());
  await expect(phone.activate('dummy')).rejects.toThrow('Browser-Telefonie nicht initialisieren');
});
