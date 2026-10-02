import {afterEach,describe,expect,it,vi} from 'vitest';
import {blink,catMotion,elbow,voiceEnergy} from '../render/animation';
import {drawCinematic,storyShots,endingShots} from '../render/cinematic';
afterEach(()=>vi.unstubAllGlobals());
describe('Anime animation',()=>{
 it('keeps an articulated arm connected at a range of gesture targets',()=>{
  for(const [x,y,bend] of [[40,40,1],[-30,-55,-1],[60,-12,1],[10,20,-1]]){
   const e=elbow(0,0,x,y,43,43,bend);expect(Math.hypot(e.x,e.y)).toBeCloseTo(43,5);expect(Math.hypot(e.x-x,e.y-y)).toBeCloseTo(43,5);
  }
 });
 it('has animated limbs and eyelids with bounded values and repeatable paused poses',()=>{
  const a=catMotion(.8,'walk'),b=catMotion(1.2,'walk');expect(a.stride).not.toBe(b.stride);expect(a.tail).not.toBe(b.tail);expect(a).toEqual(catMotion(.8,'walk'));
  for(let t=0;t<30;t+=.03){expect(blink(t)).toBeGreaterThanOrEqual(0);expect(blink(t)).toBeLessThanOrEqual(1);}
 });
 it('drives dialogue motion from recorded speech, with silence outside the clip',()=>{
  expect(voiceEnergy('ending-reunion',0)).toBe(0);expect(voiceEnergy('ending-reunion',100)).toBe(0);
  const values=Array.from({length:80},(_,i)=>voiceEnergy('ending-reunion',i*.08));expect(Math.max(...values)).toBeGreaterThan(.2);expect(new Set(values).size).toBeGreaterThan(8);
 });
 it('renders every opening and ending shot without invalid transforms or unbalanced canvas state',()=>{
  vi.stubGlobal('Path2D',class {constructor(path:string){expect(path).not.toMatch(/NaN|Infinity/);}});
  let depth=0;const gradient={addColorStop:vi.fn()};
  const c=new Proxy({save:()=>{depth++;},restore:()=>{depth--;expect(depth).toBeGreaterThanOrEqual(0);},measureText:(s:string)=>({width:s.length*10}),createRadialGradient:()=>gradient,createLinearGradient:()=>gradient},
   {get:(o,key)=>key in o?o[key as keyof typeof o]:(...args:unknown[])=>{for(const n of args)if(typeof n==='number')expect(Number.isFinite(n)).toBe(true);},set:()=>true}) as unknown as CanvasRenderingContext2D;
  for(const ending of [false,true]){let offset=0;for(const shot of ending?endingShots:storyShots){for(const p of [.01,.35,.7,.97]){drawCinematic(c,offset+shot.duration*p,false,ending);expect(depth).toBe(0);}drawCinematic(c,offset+.5,true,ending);expect(depth).toBe(0);offset+=shot.duration;}}
 });
});
