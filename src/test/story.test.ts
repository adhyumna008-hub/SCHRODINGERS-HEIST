import { afterEach, describe, expect, it, vi } from 'vitest';
import { campaign } from '../game/campaign';
import { createGameEngine, restartFromCheckpoint, updateGameEngine } from '../game/engine';
import { tileToPixel } from '../game/world';
import { input } from '../core/input';
import { openingFilm, endingFilm, levelStory, briefingDuration } from '../story/story';
import { VoicePlayer, voiceDuration, voiceTracks } from '../core/voice';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('Story campaign and ending',()=>{
 for(const index of [4,9,12])it('requires and checkpoints the memory in sector '+(index+1),()=>{
  const e=createGameEngine(campaign[index]());e.screen='playing';const memory=e.room.storyMemories![0];
  e.room.panels.forEach(p=>p.solved=true);e.room.doors=[];
  e.state.avatars[0].pos=tileToPixel(e.room.exitTrigger.pos.x,e.room.exitTrigger.pos.y);updateGameEngine(e,1/60);
  expect(e.screen).toBe('playing');expect(e.room.storyMemories![0].collected).toBe(false);
  e.state.avatars[0].pos=tileToPixel(memory.pos.x,memory.pos.y);updateGameEngine(e,1/60);expect(e.room.storyMemories![0].collected).toBe(true);
  restartFromCheckpoint(e);expect(e.room.storyMemories![0].collected).toBe(true);
 });
 it('cannot purge before isolation; both are required to finish level 15',()=>{
  const e=createGameEngine(campaign[14]());e.screen='playing';vi.spyOn(input,'wasPressed').mockImplementation(k=>k===' ');
  const use=(index:number)=>{const s=e.room.switches[index];e.state.avatars[0].pos=tileToPixel(s.pos.x,s.pos.y);updateGameEngine(e,1/60);};
  use(0);expect(e.room.switches[0].latched).toBe(false); // circuits remain unrepaired
  e.room.panels.forEach(p=>p.solved=true);use(1);expect(e.room.switches[1].latched).toBe(false);
  use(0);expect(e.room.switches[0].latched).toBe(true);use(1);expect(e.room.switches[1].latched).toBe(true);
  expect(e.room.doors.find(d=>d.isExit)!.state).toBe('open');
  e.state.avatars[0].pos=tileToPixel(21,8);updateGameEngine(e,1/60);expect(e.screen).toBe('roomClear');
 });
 it('celebrates outside the computer before the unidentified threat and hard cut',()=>{
  expect(endingFilm.map(s=>s.id)).toEqual(['purged','return','reunion','celebrate','peace','anomaly','claw','eye','threat','cut']);
  expect(endingFilm.slice(6,9).every(s=>s.speaker==='Unknown')).toBe(true);
  expect(endingFilm[9].caption).toBe('');expect(endingFilm[9].speaker).toBe('Silent');
 });
 it('has embedded PCM narration and enough scene time for every spoken line',()=>{
  expect(Object.keys(voiceTracks)).toHaveLength(47);
  for(const shot of [...openingFilm,...endingFilm]){
   if(!shot.caption)continue;expect(voiceDuration(shot.voiceId)).toBeGreaterThan(1);expect(shot.duration).toBeGreaterThan(voiceDuration(shot.voiceId)+.5);
  }
  for(const [id,track] of Object.entries(voiceTracks)){
   const raw=atob(track.src.split(',')[1]);expect(raw.slice(0,4),id).toBe('RIFF');expect(raw.slice(8,12)).toBe('WAVE');
   expect(raw.length).toBeGreaterThan(32000);expect(raw.length).toBeCloseTo(track.duration*32000+44,0);
   let energy=0;for(let i=44;i<raw.length;i+=512){let n=raw.charCodeAt(i)|(raw.charCodeAt(i+1)<<8);if(n>32767)n-=65536;energy+=Math.abs(n);}expect(energy,id+' contains sound').toBeGreaterThan(1000);
  }
  expect(levelStory).toHaveLength(15);levelStory.forEach((_,i)=>{expect(briefingDuration(i)).toBeGreaterThan(voiceDuration('level-'+(i+1)+'-brief'));expect(voiceDuration('level-'+(i+1)+'-clear')).toBeGreaterThan(1);});
 });
});

describe('Voice playback lifecycle',()=>{
 function media(){const mock={src:'',dataset:{} as Record<string,string>,preload:'',hidden:false,id:'',currentTime:0,muted:false,readyState:4,paused:true,setAttribute:vi.fn(),pause:vi.fn(),play:vi.fn()};
  mock.pause.mockImplementation(()=>mock.paused=true);mock.play.mockImplementation(()=>{mock.paused=false;return Promise.resolve();});
  vi.stubGlobal('document',{createElement:()=>mock,body:{append:vi.fn()}});return mock;
 }
 it('plays one clip, pauses it, seeks on resume, replaces on skip, and stops on exit',async()=>{
  const m=media(),v=new VoicePlayer();v.sync('intro-lab',1,false,false);await Promise.resolve();expect(m.play).toHaveBeenCalledTimes(1);
  v.sync('intro-lab',1.5,true,false);expect(m.paused).toBe(true);
  v.sync('intro-lab',3,false,false);await Promise.resolve();expect(m.currentTime).toBeCloseTo(2.55);expect(m.paused).toBe(false);
  v.sync('ending-claw',1,false,false);await Promise.resolve();expect(m.dataset.clip).toBe('ending-claw');
  v.stop();expect(m.paused).toBe(true);
 });
 it('honors both narration-off and global mute while retaining subtitles in the scene',async()=>{
  const m=media(),v=new VoicePlayer();v.sync('intro-lab',1,false,true);expect(m.muted).toBe(true);expect(m.play).not.toHaveBeenCalled();
  v.enabled=false;v.sync('intro-lab',1,false,false);expect(m.play).not.toHaveBeenCalled();
  v.enabled=true;v.sync('intro-lab',1,false,false);await Promise.resolve();expect(m.paused).toBe(false);
 });
 it('exposes a recoverable autoplay block and leaves silent shots silent',async()=>{
  const m=media();m.play.mockRejectedValueOnce(new DOMException('Blocked','NotAllowedError'));
  const v=new VoicePlayer();v.sync('intro-lab',1,false,false);await Promise.resolve();await Promise.resolve();expect(v.blocked).toBe(true);
  v.unlock();await Promise.resolve();expect(m.play).toHaveBeenCalledTimes(2);expect(v.blocked).toBe(false);
  v.sync('ending-cut',1,false,false);expect(m.paused).toBe(true);
 });
});
