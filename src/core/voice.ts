import tracks from '../assets/voices.json';
export const voiceTracks:Record<string,{src:string;duration:number}>=tracks;
export const voiceDuration=(id:string)=>voiceTracks[id]?.duration??0;

/** One embedded recording at a time. Scene time is the authority, including seeks and skips. */
export class VoicePlayer {
 private media:HTMLAudioElement|null=null;
 private id='';
 private pending=false;
 private generation=0;
 private paused=true;
 enabled=true;
 blocked=false;
 unavailable=false;
 constructor(){try{if(typeof window!=='undefined')this.enabled=window.localStorage.getItem('sh_voice')!=='off';}catch{}}
 private ensure(){
  if(!this.media&&typeof document!=='undefined'){
   this.media=document.createElement('audio');this.media.id='story-voice';this.media.preload='auto';this.media.hidden=true;
   this.media.setAttribute('aria-label','Story voice-over');document.body.append(this.media);
  }
  return this.media;
 }
 toggle(){this.enabled=!this.enabled;try{localStorage.setItem('sh_voice',this.enabled?'on':'off');}catch{}if(!this.enabled)this.media?.pause();this.blocked=false;}
 stop(){this.generation++;this.media?.pause();this.id='';this.pending=false;this.paused=true;this.blocked=false;}
 sync(id:string,time:number,paused:boolean,muted:boolean){
  const track=voiceTracks[id];if(!track){this.stop();return;}
  const m=this.ensure();if(!m)return;
  if(this.id!==id){this.stop();this.id=id;m.src=track.src;m.dataset.clip=id;this.unavailable=false;}
  const target=Math.max(0,time-.45);m.muted=muted||!this.enabled;
  this.paused=paused||time<.45||target>=track.duration||!this.enabled||muted;
  if(this.paused){m.pause();return;}
  // Loaded recordings can be scrubbed to the current shot without accumulating a speech queue.
  if(m.readyState>=1&&Math.abs(m.currentTime-target)>.65)m.currentTime=Math.min(target,track.duration);
  if(m.paused&&!this.pending&&!this.blocked&&!this.unavailable){
   const generation=this.generation;this.pending=true;
   void m.play().then(()=>{if(generation!==this.generation)return;this.pending=false;if(this.paused)m.pause();}).catch((err:unknown)=>{
    if(generation!==this.generation)return;this.pending=false;
    if((err as DOMException)?.name==='NotAllowedError')this.blocked=true;
    else if((err as DOMException)?.name!=='AbortError')this.unavailable=true;
   });
  }
 }
 /** Called from a real button gesture if an embedded browser blocks autoplay. */
 unlock(){this.blocked=false;const m=this.ensure();if(!m||!this.id||this.paused)return;void m.play().catch(()=>{this.blocked=true;});}
}
export const voice=new VoicePlayer();
