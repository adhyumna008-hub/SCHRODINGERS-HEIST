import { afterEach, describe, expect, it, vi } from 'vitest';
import { campaign } from '../game/campaign';
import { createGameEngine, restartFromCheckpoint, restartRoom, submitCircuit, updateGameEngine } from '../game/engine';
import { input } from '../core/input';
import { getFailures, hintTier } from '../game/progress';
import { isWallTile, tileToPixel } from '../game/world';
import { getDoorCollisionRect, checkLaserCollision } from '../game/doors';
import { cinematicShot, nextShotTime, storyShots, endingShots } from '../render/cinematic';
import type { Vec2 } from '../game/types';
afterEach(()=>vi.restoreAllMocks());

function driver(e:ReturnType<typeof createGameEngine>){
 let held='',pressed='';
 vi.spyOn(input,'isDown').mockImplementation(k=>k===held);
 vi.spyOn(input,'wasPressed').mockImplementation(k=>k===pressed);
 const tick=(frames=1)=>{for(let i=0;i<frames;i++){updateGameEngine(e,1/60);pressed='';}};
 const press=(key:string)=>{pressed=key;tick();};
 function walk(goal:Vec2){
  const avatar=()=>e.state.avatars[e.state.controlledIndex];
  const start={x:Math.floor(avatar().pos.x/48),y:Math.floor(avatar().pos.y/48)};
  const rects=[...e.room.doors.map(getDoorCollisionRect).filter(x=>x!==null),...(e.room.membranes??[])];
  const blocked=(p:Vec2)=>isWallTile(p.x,p.y,[...e.room.walls,...rects])||!!checkLaserCollision(tileToPixel(p.x,p.y),14.4,e.room.lasers.filter(l=>!l.sweeping));
  const key=(p:Vec2)=>p.x+','+p.y, queue=[start],parents=new Map<string,Vec2>();parents.set(key(start),start);
  for(let i=0;i<queue.length&&!parents.has(key(goal));i++)for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
   const p={x:queue[i].x+dx,y:queue[i].y+dy};if(!blocked(p)&&!parents.has(key(p))){parents.set(key(p),queue[i]);queue.push(p);}
  }
  expect(parents.has(key(goal)),e.room.name+' reachable '+key(goal)).toBe(true);
  const path:Vec2[]=[];let p=goal;while(key(p)!==key(start)){path.unshift(p);p=parents.get(key(p))!;}
  for(const tile of path){const target=tileToPixel(tile.x,tile.y);let steps=0;
   while(Math.hypot(avatar().pos.x-target.x,avatar().pos.y-target.y)>2.7&&steps++<100){
    const dx=target.x-avatar().pos.x,dy=target.y-avatar().pos.y;
    held=Math.abs(dx)>Math.abs(dy)?dx>0?'d':'a':dy>0?'s':'w';tick();if(e.screen==='roomClear'){held='';return;}
   }
   held='';expect(steps,e.room.name+' movement to '+key(tile)+' '+JSON.stringify({pos:avatar().pos,retries:e.retries})).toBeLessThan(100);
  }
 }
 return {walk,press,tick};
}
describe('15-sector campaign',()=>{
 it('has distinct maps, complete assistance and preserved original save IDs',()=>{
  const rooms=campaign.map(make=>make());expect(rooms).toHaveLength(15);expect(new Set(rooms.map(r=>r.id)).size).toBe(15);
  expect(rooms.slice(0,4).map(r=>r.id)).toEqual(['room1a','room1b','room2','room3']);
  for(const r of rooms){expect(r.hints).toHaveLength(3);expect(r.objective).toBeTruthy();expect(isWallTile(r.playerStart.x,r.playerStart.y,r.walls)).toBe(false);}
  expect(new Set(rooms.map(r=>JSON.stringify([r.walls,r.panels,r.pressurePlates,r.lasers]))).size).toBe(15);
 });
 it('solves the twin-memory plates with a real split and the exit grace period',()=>{
  const e=createGameEngine(campaign[4]());e.screen='playing';const d=driver(e);
  d.walk({x:18,y:3});d.press(' ');d.walk({x:18,y:9});expect(e.room.doors[0].state).toBe('open');
  d.walk(e.room.exitTrigger.pos);expect(e.screen).toBe('roomClear');expect(e.retries).toBe(0);
 });
 it('solves the first superposition lesson with two controlled branches',()=>{
  const e=createGameEngine(campaign[0]());e.screen='playing';const d=driver(e);
  d.walk({x:19,y:2});d.press(' ');d.press('tab');d.walk({x:19,y:10});
  expect(e.room.pressurePlates.every(p=>p.active)).toBe(true);d.press('tab');d.walk({x:22,y:6});
  expect(e.screen).toBe('roomClear');expect(e.retries).toBe(0);
 });
 it('solves the observation lesson by latching its switch and parking a branch',()=>{
  const e=createGameEngine(campaign[1]());e.screen='playing';const d=driver(e);
  d.walk(e.room.switches[0].pos);d.press(' ');expect(e.room.switches[0].latched).toBe(true);
  d.walk(e.room.pressurePlates[0].pos);d.press(' ');d.press('tab');d.walk(e.room.exitTrigger.pos);
  expect(e.screen).toBe('roomClear');expect(e.retries).toBe(0);
 });
 it('accepts the actual X and H gate sequences in the gate lesson',()=>{
  const e=createGameEngine(campaign[2]());e.screen='playing';const d=driver(e);
  d.walk(e.room.panels[0].pos);d.press(' ');d.press('x');d.press('enter');
  expect(e.room.panels[0].solved).toBe(true);expect(e.room.lasers.every(l=>!l.active)).toBe(true);
  d.walk(e.room.panels[1].pos);d.press(' ');expect(e.screen).toBe('circuit');
  d.press('x');d.press('x');d.press('h');d.press('enter');
  expect(e.room.panels[1].solved).toBe(true);
  expect(e.room.doors[0].state).not.toBe('closed');
 });
 it('solves tutorial sector 4 through its actual pickup, circuit, receiver and exit flow',()=>{
  const e=createGameEngine(campaign[3]());e.screen='playing';const d=driver(e);
  d.walk(e.room.beaconPickup!);expect(e.beaconUnlocked).toBe(true);
  d.walk(e.room.panels[0].pos);d.press(' ');expect(e.screen).toBe('circuit');
  d.press('x');d.press('h');d.press('enter');expect(e.room.doors[0].state).toBe('superposed');
  d.walk({x:15,y:5});const sweep=e.room.lasers.find(l=>l.sweeping)!;
  let ready=0;while(!(sweep.sweeping!.pos<17.2&&sweep.sweeping!.direction===1)&&ready++<500)d.tick();
  expect(ready).toBeLessThan(500);e.state.avatars[0].facingDir={x:1,y:0};d.press('e');d.tick(20);
  expect(e.state.beacon?.pos.x).toBeCloseTo((e.room.beaconTarget!.pos.x+.5)*48);
  d.press('e');d.tick(26);
  expect(e.state.beacon).toBeNull();expect(e.state.avatars[0].pos.x).toBeGreaterThan(18*48);
  d.walk({x:19,y:6});d.walk({x:19,y:7});d.walk({x:21,y:7});d.walk({x:21,y:5});expect(e.screen).toBe('roomClear');expect(e.retries).toBe(0);
 });
 for(let index=5;index<15;index++)it('walks, programs and escapes sector '+(index+1),()=>{
  const e=createGameEngine(campaign[index]());e.screen='playing';const d=driver(e);
  if(e.room.beaconPickup)d.walk(e.room.beaconPickup);
  for(let i=0;i<e.room.panels.length;i++){
   d.walk(e.room.panels[i].pos);d.press(' ');expect(e.screen).toBe('circuit');
   for(const gate of e.room.panels[i].requiredSequence!)d.press(gate.toLowerCase());d.press('enter');expect(e.screen).toBe('playing');
  }
  if(e.room.membranes?.length){
   d.walk({x:16,y:6});
   // Wait for the moving firewall to leave the landing side; its lower edge leaves a route to the exit.
   const sweep=e.room.lasers.find(l=>l.sweeping);
   if(sweep){let timeout=0;while(!(sweep.sweeping!.pos>20&&sweep.sweeping!.direction===1)&&timeout++<700)d.tick();}
   e.state.avatars[e.state.controlledIndex].facingDir={x:1,y:0};d.press('e');d.tick(20);d.press('e');d.tick(26);
   expect(e.state.avatars[e.state.controlledIndex].pos.x).toBeGreaterThan(18*48);
   d.walk({x:19,y:8});
  }
  for(const sw of e.room.switches){d.walk(sw.pos);d.press(' ');}
  d.walk(e.room.exitTrigger.pos);d.tick();expect(e.screen).toBe('roomClear');expect(e.retries).toBe(0);
 });
 it('requires every repaired circuit before a later exit can complete',()=>{
  const e=createGameEngine(campaign[8]());e.screen='playing';e.state.avatars[0].pos=tileToPixel(21,8);updateGameEngine(e,1/60);expect(e.screen).toBe('playing');
 });
 it('keeps help across checkpoint retry, full restart and a new engine',()=>{
  const r=campaign[5]();r.id='hint-test';const e=createGameEngine(r);const initial=getFailures(r.id);
  restartFromCheckpoint(e);restartFromCheckpoint(e);expect(hintTier(e.failures-initial)).toBe(1);
  restartRoom(e);expect(e.retries).toBe(3);expect(e.failures).toBe(initial+3);
  e.activePanel=0;e.sequence=['H'];submitCircuit(e);expect(hintTier(e.failures-initial)).toBe(2);
  restartFromCheckpoint(e);restartFromCheckpoint(e);expect(hintTier(e.failures-initial)).toBe(3);
  expect(createGameEngine(r).failures).toBe(e.failures);
 });
 it('advances all movie shots and terminates both opening and ending',()=>{
  for(const ending of [false,true]){const shots=ending?endingShots:storyShots;let t=0;for(let i=0;i<shots.length;i++){expect(cinematicShot(t,ending).index).toBe(i);t=nextShotTime(t,ending);}expect(cinematicShot(t,ending).done).toBe(true);}
 });
});
