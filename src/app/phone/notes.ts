import { phoneApi, type CallLog } from './api';

/** Serializes autosaves so slow responses never overwrite a newer draft. */
export class CallNotes {
  text:string;
  saved:string;
  version:number;
  private pending?:Promise<void>;
  constructor(readonly callId:string,call:Pick<CallLog,'note'|'noteVersion'>,private changed:()=>void,private userId:string) {
    this.saved=call.note;this.version=call.noteVersion;
    let draft:string|null=null;
    try {draft=sessionStorage.getItem(this.key);}catch { /* storage can be unavailable */ }
    this.text=draft??call.note;
  }
  get key(){return `crm-call-draft:${this.userId}:${this.callId}`;}
  get dirty(){return this.text!==this.saved;}
  useComparedVersion(version:number){this.version=version;}
  set(text:string){this.text=text;try{sessionStorage.setItem(this.key,text);}catch{/* beforeunload remains active */}this.changed();}
  async flush():Promise<void> {
    if(this.pending) {await this.pending;if(this.dirty)await this.flush();return;}
    this.pending=this.save();
    try{await this.pending;}finally{this.pending=undefined;}
  }
  private async save(){
    while(this.dirty){
      const text=this.text;
      const result=await phoneApi<CallLog>(`/calls/${this.callId}/note`,'PATCH',{note:text,version:this.version});
      this.saved=text;this.version=result.noteVersion;
      if(!this.dirty)try{sessionStorage.removeItem(this.key);}catch{/* optional local recovery */}
      this.changed();window.dispatchEvent(new Event('crm:call-updated'));
    }
  }
}
