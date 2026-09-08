import '@testing-library/jest-dom/vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {VoiceDictation} from './VoiceDictation';
const api=vi.hoisted(()=>({transcribe:vi.fn()}));
vi.mock('../utils/crmWorkflow',()=>({transcribeCrmNote:api.transcribe}));
const stopped=vi.fn(),media=vi.fn(),insert=vi.fn();
class Recorder {
 static isTypeSupported(){return true;}
 state='inactive';onstop:(()=>void)|null=null;onerror:(()=>void)|null=null;ondataavailable:((event:{data:Blob})=>void)|null=null;
 start(){this.state='recording';}
 stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['sample audio'],{type:'audio/webm'})});this.onstop?.();}
}
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('MediaRecorder',Recorder);Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:media},configurable:true});media.mockResolvedValue({getTracks:()=>[{stop:stopped}]});api.transcribe.mockResolvedValue({text:'Interesse an der Lagerübersicht.'});});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
async function record(){fireEvent.click(screen.getByRole('button',{name:'Notiz diktieren'}));await screen.findByText(/Mikrofon nimmt auf/);fireEvent.click(screen.getByRole('button',{name:/Diktat übernehmen/}));}
it('starts only on request, releases the microphone and inserts editable text',async()=>{render(<VoiceDictation leadId="lead" onText={insert}/>);expect(media).not.toHaveBeenCalled();await record();await waitFor(()=>expect(insert).toHaveBeenCalledWith('Interesse an der Lagerübersicht.'));expect(stopped).toHaveBeenCalled();expect(api.transcribe.mock.calls[0][0]).toBe('lead');expect(api.transcribe.mock.calls[0][1].size).toBeGreaterThan(0);});
it('retains the audio for retry if transcription fails',async()=>{api.transcribe.mockRejectedValueOnce(new Error('Dienst nicht erreichbar'));render(<VoiceDictation leadId="lead" onText={insert}/>);await record();await screen.findByRole('alert');expect(insert).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Diktat erneut erkennen'}));await waitFor(()=>expect(insert).toHaveBeenCalledOnce());expect(api.transcribe.mock.calls[1][1]).toBe(api.transcribe.mock.calls[0][1]);});
it('aborts a pending request and never inserts into a different lead after unmount',async()=>{let resolve!:(value:unknown)=>void;api.transcribe.mockReturnValue(new Promise(done=>{resolve=done;}));const view=render(<VoiceDictation leadId="lead" onText={insert}/>);await record();await waitFor(()=>expect(api.transcribe).toHaveBeenCalled());const signal=api.transcribe.mock.calls[0][2];view.unmount();expect(signal.aborted).toBe(true);await act(async()=>resolve({text:'Old lead text'}));expect(insert).not.toHaveBeenCalled();});
it('stops a late microphone grant after cancellation without recording',async()=>{let resolve!:(value:unknown)=>void;media.mockReturnValue(new Promise(done=>{resolve=done;}));render(<VoiceDictation leadId="lead" onText={insert}/>);fireEvent.click(screen.getByRole('button',{name:'Notiz diktieren'}));fireEvent.click(screen.getByRole('button',{name:'Verwerfen'}));await act(async()=>resolve({getTracks:()=>[{stop:stopped}]}));expect(stopped).toHaveBeenCalled();expect(api.transcribe).not.toHaveBeenCalled();});
it('shows permission denial and keeps manual writing available',async()=>{media.mockRejectedValue(new Error('Denied'));render(<VoiceDictation leadId="lead" onText={insert}/>);fireEvent.click(screen.getByRole('button',{name:'Notiz diktieren'}));expect(await screen.findByRole('alert')).toHaveTextContent('Kein Mikrofonzugriff');expect(screen.getByRole('button',{name:'Notiz diktieren'})).toBeEnabled();expect(api.transcribe).not.toHaveBeenCalled();});
