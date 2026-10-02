/** Real-amplitude state vectors: sufficient for the X/H/Z/CNOT gate set used here. */
export class QuantumState {
  static X = [[0, 1], [1, 0]];
  static H = [[Math.SQRT1_2, Math.SQRT1_2], [Math.SQRT1_2, -Math.SQRT1_2]];
  static Z = [[1, 0], [0, -1]];
  constructor(public amplitudes: number[] = [1, 0]) {}
  apply(matrix: number[][]): this {
    const [a,b] = this.amplitudes;
    this.amplitudes = [matrix[0][0]*a+matrix[0][1]*b, matrix[1][0]*a+matrix[1][1]*b];
    return this;
  }
  probability(bit: number): number { return this.amplitudes[bit] ** 2; }
  measure(random = Math.random): number {
    const bit = random() < this.probability(0) ? 0 : 1;
    this.amplitudes = bit === 0 ? [1,0] : [0,1]; return bit;
  }
  text(): string {
    const [a,b]=this.amplitudes;
    return `|ψ⟩ = ${Math.abs(a)<1e-10?'0.00':a.toFixed(2)}|0⟩ ${b < -1e-10 ? '−' : '+'} ${Math.abs(b).toFixed(2)}|1⟩`;
  }
}

/** Registers ordered Q,A,B (input, sender ancilla, receiver). */
export function teleportState(input: QuantumState, random = Math.random) {
  let v = [input.amplitudes[0],0,0,0,input.amplitudes[1],0,0,0];
  const gate=(q:number,m:number[][])=>{
    const mask=1<<(2-q),next=v.slice();
    for(let i=0;i<8;i++)if(!(i&mask)){
      next[i]=m[0][0]*v[i]+m[0][1]*v[i|mask];
      next[i|mask]=m[1][0]*v[i]+m[1][1]*v[i|mask];
    }v=next;
  };
  const cx=(control:number,target:number)=>{
    const next=Array(8).fill(0);for(let i=0;i<8;i++)next[(i&(1<<(2-control)))?i^(1<<(2-target)):i]=v[i];v=next;
  };
  const measure=(q:number)=>{
    const mask=1<<(2-q);let p0=0;v.forEach((a,i)=>{if(!(i&mask))p0+=a*a;});
    const bit=random()<p0?0:1,p=bit?1-p0:p0;
    v=v.map((a,i)=>Number(Boolean(i&mask))===bit?a/Math.sqrt(p):0);return bit;
  };
  gate(1,QuantumState.H);cx(1,2); // Prepare shared Bell pair.
  cx(0,1);gate(0,QuantumState.H);
  const z=measure(0),x=measure(1);
  if(x)gate(2,QuantumState.X);if(z)gate(2,QuantumState.Z);
  const base=z*4+x*2;
  return { bits: `${z}${x}`, output: new QuantumState([v[base],v[base+1]]), correction: `${x?'X':'I'}${z?'Z':''}` };
}
