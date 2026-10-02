import { describe,it,expect,vi,afterEach } from 'vitest';
import { QuantumState,teleportState } from '../game/quantum';
import { createDoor,superposeDoor,collapseDoor } from '../game/doors';
import { createGameEngine,updateGameEngine,restartRoom } from '../game/engine';
import { createRoom1a } from '../game/rooms/room1a';
import { createRoom2 } from '../game/rooms/room2';
import { createRoom1b } from '../game/rooms/room1b';
import { createRoom3 } from '../game/rooms/room3';
import { generateConePolygon,isAvatarInCone } from '../game/camera';
import { input } from '../core/input';

afterEach(()=>vi.restoreAllMocks());
describe('Quantum gates and teleportation',()=>{
  it('X and H are involutions on both basis states',()=>{
    for(const state of [[1,0],[0,1]])for(const gate of [QuantumState.X,QuantumState.H]){
      const q=new QuantumState(state).apply(gate).apply(gate);
      q.amplitudes.forEach((a,i)=>expect(a).toBeCloseTo(state[i],12));
    }
  });
  it('phase interference survives H-X-H and H of minus',()=>{
    const q=new QuantumState().apply(QuantumState.H).apply(QuantumState.X).apply(QuantumState.H);
    expect(q.probability(0)).toBeCloseTo(1,12);
    const minus=new QuantumState([Math.SQRT1_2,-Math.SQRT1_2]).apply(QuantumState.H);
    expect(minus.probability(1)).toBeCloseTo(1,12);
  });
  it('samples either door outcome and retains the measured basis',()=>{
    for(const r of [0,.99]){const d=createDoor('h',1,1,1,1,[]);superposeDoor(d);collapseDoor(d,()=>r);expect(d.state).toBe(r===0?'closed':'open');expect(d.quantum!.probability(r===0?0:1)).toBe(1);}
  });
  it('transfers basis, phase and unequal-amplitude states for every Bell outcome',()=>{
    for(const v of [[1,0],[0,1],[Math.SQRT1_2,Math.SQRT1_2],[Math.SQRT1_2,-Math.SQRT1_2],[.6,-.8]]){
      for(const a of [0,.99])for(const b of [0,.99]){
        const bits=[a,b],result=teleportState(new QuantumState(v),()=>bits.shift()!);
        expect(result.bits).toBe(`${a?1:0}${b?1:0}`);
        result.output.amplitudes.forEach((amp,i)=>expect(amp).toBeCloseTo(v[i],12));
      }
    }
  });
});
describe('Playable integration',()=>{
  it('a receiver crosses the phased membrane and transfers into the vault',()=>{
    const e=createGameEngine(createRoom3());e.screen='playing';
    e.state.avatars[0].pos={x:4.5*48,y:10.5*48};updateGameEngine(e,1/60);
    expect(e.beaconUnlocked).toBe(true);
    superposeDoor(e.room.doors[0]);
    e.state.avatars[0].pos={x:15.5*48,y:5.5*48};
    let pressed='e';vi.spyOn(input,'wasPressed').mockImplementation(k=>k===pressed);
    vi.spyOn(input,'isDown').mockReturnValue(false);
    updateGameEngine(e,1/60);expect(e.state.beacon?.pos).toEqual({x:19.5*48,y:5.5*48});
    pressed='';for(let i=0;i<19;i++)updateGameEngine(e,1/60);
    pressed='e';updateGameEngine(e,1/60);pressed='';
    for(let i=0;i<25;i++)updateGameEngine(e,1/60);
    expect(e.state.beacon).toBeNull();expect(e.state.avatars[0].pos.x).toBe(19.5*48);
    expect(e.carrier.probability(0)).toBeCloseTo(.5,10);
  });
  it('a wall-mounted observer has an actual visible cone',()=>{
    const room=createRoom1b(),cam=room.cameras[0],cone=generateConePolygon(cam,room.walls,[]);
    expect(isAvatarInCone({x:600,y:180},10,cone,{x:600,y:72},room.walls,[])).toBe(true);
  });
  it('restart restores a modified laser bank and qubit',()=>{
    const e=createGameEngine(createRoom2());e.room.lasers.forEach(l=>l.active=false);e.room.panels[0].quantum=new QuantumState([0,1]);
    restartRoom(e);expect(e.room.lasers.every(l=>l.active)).toBe(true);expect(e.room.panels[0].quantum).toBeUndefined();
  });
  it('calibration can be completed using movement, split and plate mechanics',()=>{
    const e=createGameEngine(createRoom1a());e.screen='playing';
    let keys=new Set<string>(),pressed='';
    vi.spyOn(input,'isDown').mockImplementation(k=>keys.has(k));
    vi.spyOn(input,'wasPressed').mockImplementation(k=>k===pressed);
    const tick=()=>{updateGameEngine(e,1/60);pressed='';};
    const walk=(x:number,y:number)=>{
      let steps=0;
      while(steps++<600){if(e.screen==='roomClear')break;const a=e.state.avatars.find(a=>a.isControlled)!;const dx=x*48+24-a.pos.x,dy=y*48+24-a.pos.y;if(Math.hypot(dx,dy)<4)break;
        keys=new Set([...(dx>2?['d']:dx< -2?['a']:[]),...(dy>2?['s']:dy< -2?['w']:[])]);tick();}
      keys.clear();expect(steps).toBeLessThan(600);
    };
    walk(2,2);walk(19,2);pressed=' ';tick();expect(e.state.avatars).toHaveLength(2);
    walk(19,10);tick();expect(e.room.doors[0].state).toBe('open');walk(20,6);walk(22,6);
    expect(e.screen).toBe('roomClear');
  });
});
