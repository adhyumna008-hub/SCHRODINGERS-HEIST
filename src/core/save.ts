const memory=new Map<string,string>();
function get(key:string){try{return (typeof window==='undefined'?null:window.localStorage?.getItem(key))??memory.get(key)??null;}catch{return memory.get(key)??null;}}
function put(key:string,value:string){memory.set(key,value);try{if(typeof window!=='undefined')window.localStorage?.setItem(key,value);}catch{/* Session fallback keeps the game playable. */}}
export class SaveManager {
 saveStars(id:string,stars:number){put('sh_stars_'+id,String(stars));}
 getStars(id:string){return Math.max(0,Math.min(3,parseInt(get('sh_stars_'+id)??'0',10)||0));}
 saveCheckpoint(id:string,data:unknown){put('sh_ckpt_'+id,JSON.stringify(data));}
 getCheckpoint(id:string){try{return JSON.parse(get('sh_ckpt_'+id)??'null');}catch{return null;}}
 clearAll(){const keys=new Set(memory.keys());try{for(let i=0;i<(globalThis.localStorage?.length??0);i++){const k=localStorage.key(i);if(k)keys.add(k);}}catch{}for(const k of keys)if(k.startsWith('sh_')){memory.delete(k);try{globalThis.localStorage?.removeItem(k);}catch{}}}
 getAllStars(){const result:Record<string,number>={};for(const id of ['room1a','room1b','room2','room3',...Array.from({length:11},(_,i)=>'sector'+(i+5))])result[id]=this.getStars(id);return result;}
}
export const saveManager=new SaveManager();
