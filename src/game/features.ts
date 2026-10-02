import type { GateType, Panel, Vec2 } from './types';
import { QuantumState } from './quantum';
import { pointInPolygon } from './camera';
export function sequenceMatches(panel:Panel,sequence:GateType[]):boolean {
  const expected=panel.requiredSequence??[panel.gateType];
  return expected.length===sequence.length&&expected.every((g,i)=>g===sequence[i]);
}
export function previewSequence(sequence:GateType[]):QuantumState {
  const q=new QuantumState();for(const gate of sequence)q.apply(QuantumState[gate]);return q;
}
export function distanceToCone(point:Vec2,polygon:Vec2[]):number {
  if(polygon.length<3)return Infinity;if(pointInPolygon(point,polygon))return 0;
  let nearest=Infinity;
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b.x-a.x,dy=b.y-a.y;
    const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1)));
    nearest=Math.min(nearest,Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy));
  }return nearest;
}
