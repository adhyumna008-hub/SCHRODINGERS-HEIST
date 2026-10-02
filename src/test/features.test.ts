import {afterEach,describe,expect,it,vi} from 'vitest';
import {createGameEngine,updateGameEngine,submitCircuit,restartFromCheckpoint} from '../game/engine';
import {createRoom1a} from '../game/rooms/room1a';
import {createRoom2} from '../game/rooms/room2';
import {createRoom3} from '../game/rooms/room3';
import {createAvatar,recallClone} from '../game/avatar';
import {createCamera} from '../game/camera';
import {createBeacon} from '../game/beacon';
import {distanceToCone} from '../game/features';
import {getRun,saveRun,efficiency,cloneRoom} from '../game/progress';
import {input} from '../core/input';
afterEach(()=>vi.restoreAllMocks());
function controls(){let held=new Set<string>(),pressed='';vi.spyOn(input,'isDown').mockImplementation(k=>held.has(k));vi.spyOn(input,'wasPressed').mockImplementation(k=>k===pressed);return {press:(k:string)=>{pressed=k;},hold:(...k:string[])=>{held=new Set(k);},clear:()=>{pressed='';}};}
describe('Completed concept functionality',()=>{
 it('opens a nearby programmer and applies a three-slot sequence',()=>{
  const e=createGameEngine(createRoom2());e.screen='playing';const c=controls();
  e.state.avatars[0].pos={x:14.5*48,y:10.5*48};c.press(' ');updateGameEngine(e,1/60);c.clear();
  expect(e.screen).toBe('circuit');expect(e.activePanel).toBe(1);
  e.sequence=['X','X','H'];expect(submitCircuit(e)).toBe(true);expect(e.room.doors[0].state).toBe('superposed');expect(e.lastQuantum.probability(0)).toBeCloseTo(.5);
 });
 it('wrong sequence never modifies the actuator',()=>{
  const e=createGameEngine(createRoom2());e.activePanel=0;e.sequence=['X','X'];
  expect(submitCircuit(e)).toBe(false);expect(e.room.lasers.every(l=>l.active)).toBe(true);expect(e.room.panels[0].solved).not.toBe(true);
 });
 it('solved circuits survive retry and cloned quantum states retain their methods',()=>{
  const e=createGameEngine(createRoom2());e.activePanel=0;e.sequence=['X'];submitCircuit(e);restartFromCheckpoint(e);
  expect(e.room.lasers.every(l=>!l.active)).toBe(true);expect(e.room.panels[0].solved).toBe(true);
  expect(cloneRoom(e.room).panels[0].quantum!.probability(1)).toBe(1);
  e.activePanel=0;e.sequence=['X'];submitCircuit(e);expect(e.room.lasers.every(l=>l.active)).toBe(true);
 });
 it('R recalls at a cost and cannot cross walls',()=>{
  const clone=createAvatar(3,3,'clone',false);const start=clone.pos.x;
  recallClone(clone,{x:9.5*48,y:3.5*48},4,[{x:5,y:1,w:1,h:10}],[]);
  expect(clone.pos.x).toBeGreaterThan(start);expect(clone.pos.x).toBeLessThan(5*48);
  const e=createGameEngine(createRoom1a());e.screen='playing';e.state.avatars.push(createAvatar(2,2,'clone',false));e.state.playerState='superposed';
  const c=controls();c.press('r');updateGameEngine(e,1/60);expect(e.coherenceState.value).toBeCloseTo(75-8/60,5);expect(e.retries).toBe(0);
 });
 it('insufficient recall energy leaves the clone in place',()=>{
  const e=createGameEngine(createRoom1a());e.screen='playing';e.state.avatars.push(createAvatar(2,2,'clone',false));e.state.playerState='superposed';e.coherenceState.value=20;
  const c=controls();c.press('r');updateGameEngine(e,1/60);expect(e.state.avatars[1].pos).toEqual({x:120,y:120});expect(e.coherenceState.value).toBeGreaterThan(19);
 });
 it('beacon must be collected, can be replaced, and cannot teleport in flight',()=>{
  const e=createGameEngine(createRoom3());e.screen='playing';const c=controls();c.press('e');updateGameEngine(e,1/60);expect(e.state.beacon).toBeNull();
  e.state.avatars[0].pos={x:216,y:504};c.clear();updateGameEngine(e,1/60);expect(e.beaconUnlocked).toBe(true);
  c.press('e');updateGameEngine(e,1/60);const old=e.state.beacon;expect(old?.flight).toBeGreaterThan(0);
  updateGameEngine(e,1/60);expect(e.state.beacon?.link.teleporting).toBe(false);
  e.state.avatars[0].facingDir={x:0,y:-1};c.press('b');updateGameEngine(e,1/60);expect(e.state.beacon).not.toBe(old);expect(e.state.beacon?.pos).not.toEqual(old?.pos);
 });
 it('beacon hazard restores checkpoint and severs the link',()=>{
  const e=createGameEngine(createRoom3());e.screen='playing';e.state.beacon=createBeacon({x:12*48,y:9.5*48});
  updateGameEngine(e,1/60);expect(e.state.beacon).toBeNull();expect(e.retries).toBe(1);expect(e.notice).toContain('BEACON HIT');
 });
 it('beacon-only exhaustion imposes the three-second recovery lock',()=>{
  const e=createGameEngine(createRoom1a());e.screen='playing';e.coherenceState.value=.01;e.state.beacon=createBeacon({x:120,y:200});updateGameEngine(e,1/60);
  expect(e.state.beacon).toBeNull();expect(e.coherenceState.regenLockoutTimer).toBe(3);
 });
 it('observed shutter closes even when quantum measurement returns one',()=>{
  const room=createRoom2();room.walls=[];room.lasers=[];room.doors[0].pos={x:8,y:3};room.doors[0].size={x:1,y:1};room.cameras=[createCamera(5,3,0,0,4,25,8)];
  const e=createGameEngine(room);e.activePanel=1;e.sequence=['X','X','H'];submitCircuit(e);vi.spyOn(Math,'random').mockReturnValue(.9);updateGameEngine(e,1/60);
  expect(e.room.doors[0].state).toBe('closed');expect(e.room.doors[0].observedLock).toBe(true);expect(e.room.doors[0].quantum!.probability(1)).toBe(1);
 });
 it('threat distance measures the cone edge rather than distance to its camera',()=>{
  const cone=[{x:0,y:0},{x:1000,y:-100},{x:1000,y:100}];expect(distanceToCone({x:900,y:0},cone)).toBe(0);expect(distanceToCone({x:1000,y:110},cone)).toBe(10);
 });
 it('a discovered phase vent gives a split-only alternate route',()=>{
  const e=createGameEngine(createRoom1a());e.screen='playing';const c=controls();e.state.avatars[0].pos={x:216,y:168};c.press(' ');updateGameEngine(e,1/60);expect(e.state.avatars).toHaveLength(1);
  e.state.avatars.push(createAvatar(2,2,'clone',false));e.state.playerState='superposed';updateGameEngine(e,1/60);expect(e.state.avatars[0].pos).toEqual({x:504,y:168});expect(e.room.vents![0].discovered).toBe(true);
 });
 it('best-run recording keeps the faster run and computes a bounded report',()=>{
  const record={time:20,coherence:80,stars:3,retries:0,ghost:[[.1,120,120] as [number,number,number]]};
  saveRun('test-record',record);saveRun('test-record',{...record,time:30});expect(getRun('test-record')!.time).toBe(20);
  saveRun('test-record',{...record,time:10});expect(getRun('test-record')!.time).toBe(10);
  expect(efficiency(3,10,30,100)).toBe(100);
 });
});
