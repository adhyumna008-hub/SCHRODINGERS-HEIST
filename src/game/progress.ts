import { QuantumState } from './quantum';
import type { RoomData } from './types';
export type GhostFrame = [number,number,number,number?,number?];
export function ghostAt(frames:GhostFrame[],time:number):GhostFrame|undefined {
  if(!frames.length||time>frames[frames.length-1][0]+.2)return undefined;
  let lo=0,hi=frames.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(frames[mid][0]<=time)lo=mid;else hi=mid-1;}
  return frames[lo];
}
export interface RunRecord { time:number; coherence:number; stars:number; retries:number; ghost:GhostFrame[] }
const memory = new Map<string,string>();
function read(key:string){try{return (typeof window==='undefined'?null:window.localStorage.getItem(key))??memory.get(key);}catch{return memory.get(key);}}
function write(key:string,value:string){memory.set(key,value);try{if(typeof window!=='undefined')window.localStorage.setItem(key,value);}catch{/* Private browsing still keeps session progress. */}}
export function markAttempted(id:string){write('sh_attempt_'+id,'1');}
export function wasAttempted(id:string){return read('sh_attempt_'+id)==='1';}
export function getFailures(id:string):number { const n=Number(read('sh_fail_'+id));return Number.isFinite(n)?Math.max(0,n):0; }
export function recordFailure(id:string):number { const n=getFailures(id)+1;write('sh_fail_'+id,String(n));return n; }
export function hintTier(failures:number):number { return failures>=6?3:failures>=4?2:failures>=2?1:0; }
export function getRun(id:string):RunRecord|null {try{const r=JSON.parse(read('sh_run_'+id)??'null');return r&&Number.isFinite(r.time)&&Array.isArray(r.ghost)?r:null;}catch{return null;}}
export function saveRun(id:string,run:RunRecord){const prev=getRun(id);if(!prev||run.time<prev.time)write('sh_run_'+id,JSON.stringify(run));}
export function cloneRoom(room:RoomData):RoomData {
  const copy=structuredClone(room);
  for(const panel of copy.panels)if(panel.quantum)panel.quantum=new QuantumState([...panel.quantum.amplitudes]);
  for(const door of copy.doors)if(door.quantum)door.quantum=new QuantumState([...door.quantum.amplitudes]);
  return copy;
}
export function efficiency(stars:number,time:number,par:number,coherence:number):number {
  return Math.round(100*(.5*stars/3+.3*Math.min(1,par/Math.max(1,time))+.2*Math.max(0,Math.min(1,coherence/100))));
}
