// Keep the SDK behind an explicit activation. Tokens live only in this instance.
interface Emitter { on(event:string,fn:(...args:unknown[])=>void):void; off(event:string,fn:(...args:unknown[])=>void):void; }
interface AudioStream { outputStream:MediaStream; setUserMuted(muted:boolean):void; stop?:()=>void; }
export interface SdkCall extends Emitter {
  dial(stream:AudioStream):Promise<void>; answer(stream:AudioStream):Promise<void>;
  end():Promise<void>; hold():Promise<void>; resume():Promise<void>; sendDigit(tone:string):void;
  callerInfo?:{name?:string;number?:string};
}
interface Line extends Emitter { phoneNumber?:string; register():void; makeCall(target:{type:string;address:string}):SdkCall; }
interface Calling extends Emitter { registered:boolean; callingClient?:{getLines():Record<string,Line>}; register():Promise<void>; deregister():Promise<void>; }
interface CallingFactory { init(options:unknown):Promise<Calling>; createMicrophoneStream():Promise<AudioStream>; }
function eventOnce(emitter:Emitter,event:string,action?:()=>void):Promise<void> {
  return new Promise((resolve,reject)=>{
    const cleanup=()=>{clearTimeout(timer);emitter.off(event,done);emitter.off('error',fail);};
    const done=()=>{cleanup();resolve();},fail=()=>{cleanup();reject(new Error('Telefonie konnte nicht verbunden werden. Bitte Konto und Calling-Lizenz prüfen.'));};
    const timer=setTimeout(fail,25000);
    emitter.on(event,done);emitter.on('error',fail);
    try { action?.(); } catch { fail(); }
  });
}
export class BrowserPhone {
  private client?:Calling;
  private line?:Line;
  private factory?:CallingFactory;
  private stream?:AudioStream;
  private call?:SdkCall;
  private listeners:(()=>void)[]=[];
  private callListeners:(()=>void)[]=[];
  private disposed=false;
  constructor(private audio:HTMLAudioElement,private event:(state:string)=>void,private incoming:(call:SdkCall)=>void,private connection:(ready:boolean)=>void) {}
  async activate(token:string) {
    // SDK 3.12.0 does not ship declarations for its calling subpath.
    const [module,{MemoryStoreAdapter}] = await Promise.all([import('webex/calling'),import('@webex/webex-core')]);
    this.factory=(module.default?.default||module.default) as CallingFactory;
    this.client=await this.factory.init({
      webexConfig:{credentials:{access_token:token},config:{logger:{level:'error'},storage:{boundedAdapter:MemoryStoreAdapter,unboundedAdapter:MemoryStoreAdapter}}},
      callingConfig:{clientConfig:{calling:true,contact:false,callHistory:false,callSettings:false,voicemail:false},callingClientConfig:{logger:{level:'error'}},logger:{level:'error'}},
    });
    await eventOnce(this.client,'ready');
    await this.client.register();
    // The SDK catches WDM/Mercury failures internally and resolves register().
    // Such a failure says nothing about whether the account owns a phone line.
    if (!this.client.registered) throw new Error('Webex hat die Browser-Anmeldung nicht freigegeben. Bitte die Telefonie erneut verbinden und die Webex-Berechtigungen prüfen.');
    this.line=Object.values(this.client.callingClient?.getLines()||{})[0];
    if (!this.line) throw new Error('Webex konnte die Browser-Telefonie nicht initialisieren. Bitte die Webex-Calling-Einrichtung prüfen.');
    const onIncoming=(value:unknown)=>{
      const call=value as SdkCall;
      if (this.call) {void call.end().catch(()=>undefined);return;}
      this.attach(call);this.incoming(call);
    };
    this.listen(this.line,'line:incoming_call',onIncoming);
    this.listen(this.line,'unregistered',()=>this.connection(false));
    this.listen(this.line,'reconnecting',()=>this.connection(false));
    this.listen(this.line,'reconnected',()=>this.connection(true));
    await eventOnce(this.line,'registered',()=>this.line?.register());
    if (this.disposed) {await this.dispose();throw new Error('Telefonie wurde geschlossen.');}
    this.connection(true);
    return this.line.phoneNumber;
  }
  private listen(emitter:Emitter,event:string,fn:(...args:unknown[])=>void) {
    emitter.on(event,fn);this.listeners.push(()=>emitter.off(event,fn));
  }
  private attach(call:SdkCall) {
    this.callListeners.splice(0).forEach(remove=>remove());
    this.call=call;
    const listen=(event:string,fn:(...args:unknown[])=>void)=>{
      const guarded=(...args:unknown[])=>{if(this.call===call)fn(...args);};
      call.on(event,guarded);this.callListeners.push(()=>call.off(event,guarded));
    };
    for (const [event,state] of Object.entries({progress:'connecting',alerting:'alerting',connect:'connected',established:'connected',held:'held',resumed:'connected'}))
      listen(event,()=>this.event(state));
    listen('remote_media',(track)=>{
      this.audio.srcObject=new MediaStream([track as MediaStreamTrack]);
      void this.audio.play().catch(()=>this.event('audio-blocked'));
    });
    listen('disconnect',()=>{this.releaseMedia();this.call=undefined;this.callListeners.splice(0).forEach(remove=>remove());this.event('ended');});
    listen('call_error',()=>this.event('call-error'));
  }
  async microphone() {
    if (!this.factory) throw new Error('Telefonie noch nicht aktiviert.');
    this.releaseMedia();
    try { this.stream=await this.factory.createMicrophoneStream(); }
    catch { throw new Error('Bitte den Mikrofonzugriff im Browser erlauben und dein Headset prüfen.'); }
    return this.stream;
  }
  async dial(number:string) {
    if (!this.line) throw new Error('Telefonie noch nicht aktiviert.');
    const stream=await this.microphone();
    const call=this.line.makeCall({type:'uri',address:number});this.attach(call);
    try {await call.dial(stream);} catch(error) {await call.end().catch(()=>undefined);this.call=undefined;this.releaseMedia();throw error;}
  }
  async answer() { const call=this.call;if (!call) return;await call.answer(await this.microphone()); }
  async end() { await this.call?.end();this.releaseMedia(); }
  mute(value:boolean) {this.stream?.setUserMuted(value);}
  async hold(value:boolean) {if(value)await this.call?.hold();else await this.call?.resume();}
  digit(value:string) {this.call?.sendDigit(value);}
  private releaseMedia() {this.stream?.outputStream.getTracks().forEach(track=>track.stop());this.stream?.stop?.();this.stream=undefined;this.audio.srcObject=null;}
  async dispose() {
    this.disposed=true;
    await this.call?.end().catch(()=>undefined);this.call=undefined;
    this.callListeners.splice(0).forEach(remove=>remove());
    this.listeners.splice(0).forEach(remove=>remove());this.releaseMedia();
    await this.client?.deregister().catch(()=>undefined);this.connection(false);
  }
}
