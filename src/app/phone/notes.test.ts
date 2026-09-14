import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CallNotes } from './notes';
import { phoneApi } from './api';
vi.mock('./api',()=>({phoneApi:vi.fn()}));
const api=vi.mocked(phoneApi);
beforeEach(()=>{vi.clearAllMocks();sessionStorage.clear();});
describe('Gesprächsnotizen',()=>{
  it('serializes an edit made during an in-flight save and keeps its call identity',async()=>{
    let finish!:(value:unknown)=>void;
    api.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce({noteVersion:2});
    const notes=new CallNotes('call-a',{note:'',noteVersion:0},vi.fn(),'user-a');
    notes.set('Bedarf');const saving=notes.flush();
    notes.set('Bedarf + Termin');finish({noteVersion:1});await saving;
    expect(api.mock.calls).toEqual([
      ['/calls/call-a/note','PATCH',{note:'Bedarf',version:0}],
      ['/calls/call-a/note','PATCH',{note:'Bedarf + Termin',version:1}],
    ]);
    expect(notes.dirty).toBe(false);expect(sessionStorage.getItem(notes.key)).toBeNull();
  });
  it('keeps failed/conflicting drafts for the same user without claiming success',async()=>{
    api.mockRejectedValue(new Error('Versionskonflikt'));
    const notes=new CallNotes('call-a',{note:'Server',noteVersion:5},vi.fn(),'user-a');notes.set('Mein Entwurf');
    await expect(notes.flush()).rejects.toThrow('Versionskonflikt');
    expect(notes.dirty).toBe(true);expect(notes.version).toBe(5);
    expect(new CallNotes('call-a',{note:'Server',noteVersion:5},vi.fn(),'user-a').text).toBe('Mein Entwurf');
    expect(new CallNotes('call-a',{note:'Server',noteVersion:5},vi.fn(),'user-b').text).toBe('Server');
  });
});
