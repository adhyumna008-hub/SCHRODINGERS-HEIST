import envelopes from '../assets/voice-envelope.json';
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const smooth=(v:number)=>{v=clamp(v);return v*v*(3-2*v);};
export const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export const interval=(time:number,start:number,end:number)=>smooth((time-start)/(end-start));
export function voiceEnergy(id:string,time:number){const e=(envelopes as Record<string,number[]>)[id];if(!e||time<.45)return 0;const p=(time-.45)*24,i=Math.floor(p);return mix(e[i]??0,e[i+1]??0,p-i);}
export function blink(time:number,seed=0){const p=(time+seed)%4.3;return p<.13?1-p/.13:p<.26?(p-.13)/.13:1;}
export function catMotion(time:number,action='idle'){
 const stride=action==='walk'?Math.sin(time*8):0;
 return {breath:Math.sin(time*2.1)*1.4,tail:Math.sin(time*2.6)*.28,ear:Math.sin(time*1.3)*.055,
  stride,blink:blink(time,1.9),head:Math.sin(time*.9)*.025};
}
/** Analytic two-bone IK: keeps hands attached during reaching, petting and applause. */
export function elbow(sx:number,sy:number,tx:number,ty:number,a=43,b=43,bend=1){
 const dx=tx-sx,dy=ty-sy,d=Math.max(.001,Math.min(Math.hypot(dx,dy),a+b-.001));
 const heading=Math.atan2(dy,dx),offset=Math.acos(Math.max(-1,Math.min(1,(a*a+d*d-b*b)/(2*a*d))));
 return {x:sx+Math.cos(heading+offset*bend)*a,y:sy+Math.sin(heading+offset*bend)*a};
}
