import { LOGICAL_WIDTH as W, LOGICAL_HEIGHT as H, TILE_SIZE as T } from './core/constants';
import { input } from './core/input';
import { audioManager as audio } from './core/audio';
import { GameLoop } from './core/loop';
import { Renderer, drawCat, polygon, label, CYAN, PINK } from './render/renderer';
import { drawTitleScreen } from './render/title';
import { MiniFeedRenderer, drawEdgePing } from './render/minifeed';
import { GameEngine, createGameEngine, updateGameEngine, restartRoom, restartFromCheckpoint, submitCircuit } from './game/engine';
import { getLaserPixelCoords, canInteractWithPanel } from './game/doors';
import { previewSequence } from './game/features';
import { getWarningUrgency } from './game/avatar';
import { formatTime, getStarCount } from './game/scoring';
import { getRun, markAttempted, wasAttempted, efficiency, ghostAt } from './game/progress';
import { saveManager } from './core/save';
import { campaign, campaignActs } from './game/campaign';
import { hintTier } from './game/progress';
import { voice } from './core/voice';
import { levelStory, briefingDuration } from './story/story';
import { drawCinematic, cinematicShot, nextShotTime, drawNull } from './render/cinematic';

const canvas=document.getElementById('game-canvas') as HTMLCanvasElement;
const display=canvas.getContext('2d')!;
const renderer=new Renderer(canvas),feed=new MiniFeedRenderer();
const ctx=renderer.getSceneCtx();
const factories=campaign;
const ids=campaign.map(make=>make().id);
const names=campaign.map(make=>make().name);
const objectives=campaign.map(make=>make().objective??'Reach the exit.');
const debug=new URLSearchParams(location.search).has('debug');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let engine:GameEngine|null=null,screen:'title'|'playing'|'end'|'cinematic'='title',roomIndex=0,time=0,showGhost=false;
let cinemaTime=0,cinemaPaused=false,cinemaEnding=false,cinemaAction:'start'|'return'|'report'='start',cinemaReturn:'title'|'playing'|'end'='title',lastShot=-1;
let shownHintTier=0,manualHintTier=1,hintReturn:'playing'|'circuit'='playing';
let lastCircuitSignature='',lastScreen='',lastSavedStats='';
const el=(id:string)=>document.getElementById(id)!;
const pauseDialog=el('pause-dialog') as HTMLDialogElement;
const helpDialog=el('help-dialog') as HTMLDialogElement;
const circuitDialog=el('circuit-dialog') as HTMLDialogElement;
const chaptersDialog=el('chapters-dialog') as HTMLDialogElement;
const hintDialog=el('hint-dialog') as HTMLDialogElement;
const dialogs=[pauseDialog,helpDialog,circuitDialog,chaptersDialog,hintDialog];
function beginStory(replay=false,ending=false){
 voice.stop();cinemaReturn=screen==='cinematic'?'title':screen;pause();closeDialogs();cinemaTime=0;cinemaPaused=false;cinemaEnding=ending;cinemaAction=ending?(replay?'return':'report'):replay?'return':'start';lastShot=-1;screen='cinematic';audio.playUIBlip();canvas.focus();
}
function nextFilmShot(){voice.stop();cinemaTime=nextShotTime(cinemaTime,cinemaEnding)+(cinemaPaused?.5:0);}
function finishStory(){voice.stop();if(cinemaAction==='start')startRoom(0);else if(cinemaAction==='report'){screen='end';engine=null;}else{screen=cinemaReturn;if(screen==='playing')resume();}canvas.focus();}
function showHint(automatic=false){
 if(!engine||screen!=='playing'||!['playing','paused','circuit'].includes(engine.screen))return;
 hintReturn=engine.screen==='circuit'?'circuit':'playing';
 manualHintTier=Math.max(manualHintTier,hintTier(engine.failures),1);shownHintTier=Math.max(shownHintTier,hintTier(engine.failures));
 engine.screen='paused';closeDialogs();updateHint(automatic);hintDialog.showModal();
}
function updateHint(automatic=false){
 if(!engine)return;const hints=engine.room.hints??[objectives[roomIndex]];
 el('hint-heading').textContent=manualHintTier===3?'ADA / THE WAY THROUGH':'ADA / A LITTLE HELP';
 el('hint-context').textContent=(automatic?'A few attempts, a little assistance. ':'')+names[roomIndex]+' · Hint '+manualHintTier+' of 3';
 el('hint-copy').textContent=hints[Math.min(manualHintTier-1,hints.length-1)];
 (el('hint-more') as HTMLButtonElement).disabled=manualHintTier>=3;
}
function closeHint(){hintDialog.close();if(engine)engine.screen=hintReturn;canvas.focus();}

function resize(){
 const dpr=Math.min(devicePixelRatio||1,2),scale=Math.min(innerWidth/W,innerHeight/H);
 const width=Math.floor(W*scale),height=Math.floor(H*scale);
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 canvas.style.width=width+'px';canvas.style.height=height+'px';
 display.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
}
addEventListener('resize',resize);document.addEventListener('fullscreenchange',()=>{resize();el('fullscreen').textContent=document.fullscreenElement?'F · Exit fullscreen':'F · Fullscreen';});resize();
function toast(text:string){el('toast').textContent=text;setTimeout(()=>{if(el('toast').textContent===text)el('toast').textContent='';},3500);}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Fullscreen is unavailable here. The game already fills this window.');}}
function closeDialogs(){for(const d of dialogs)if(d.open)d.close();}
function startRoom(index:number){voice.stop();closeDialogs();roomIndex=index;engine=createGameEngine(factories[index](),debug);screen='playing';engine.chapterIntroTimer=briefingDuration(index);shownHintTier=0;manualHintTier=1;markAttempted(ids[index]);canvas.focus();audio.playUIBlip();}
function pause(){if(screen==='playing'&&engine?.screen==='playing')engine.screen='paused';}
function resume(){closeDialogs();if(engine?.screen==='paused')engine.screen='playing';canvas.focus();}
function showHelp(){pause();if(pauseDialog.open)pauseDialog.close();helpDialog.showModal();}
function chapters(){pause();closeDialogs();el('chapter-list').replaceChildren();
 factories.forEach((make,index)=>{
  if(index%5===0){const heading=document.createElement('h3');heading.textContent=campaignActs[Math.floor(index/5)];el('chapter-list').append(heading);}
  const room=make(),stars=saveManager.getStars(room.id),best=getRun(room.id);
  const unlocked=debug||index===0||stars>0||saveManager.getStars(ids[index-1])>0;
  const b=document.createElement('button');b.className='chapter-button';b.disabled=!unlocked;
  const title=document.createElement('strong');title.textContent=`${String(index+1).padStart(2,'0')} / ${names[index]}`;
  const sub=document.createElement('span');sub.textContent=!unlocked?'LOCKED · COMPLETE PREVIOUS ROOM':`${'★'.repeat(stars)}${'☆'.repeat(3-stars)}  ${best?'BEST '+formatTime(best.time):wasAttempted(room.id)?'IN PROGRESS':'READY TO BREACH'}  · PAR ${formatTime(room.parTime)}`;
  b.append(title,sub);b.onclick=()=>startRoom(index);el('chapter-list').append(b);
 });chaptersDialog.showModal();
}
function advance(){if(!engine||engine.screen!=='roomClear')return;if(roomIndex<factories.length-1)startRoom(roomIndex+1);else beginStory(false,true);}

el('hint').onclick=()=>showHint();el('hint-close').onclick=closeHint;el('hint-more').onclick=()=>{manualHintTier=Math.min(3,manualHintTier+1);updateHint();};
el('voice-toggle').onclick=()=>{if(voice.blocked)voice.unlock();else voice.toggle();};el('ending').onclick=()=>beginStory(true,true);
el('story').onclick=()=>beginStory(true);el('skip-story').onclick=finishStory;
el('next-shot').onclick=()=>{nextFilmShot();};el('pause-story').onclick=()=>{cinemaPaused=!cinemaPaused;};
el('fullscreen').onclick=fullscreen;el('help').onclick=showHelp;el('close-help').onclick=resume;
el('menu').onclick=()=>{if(screen==='cinematic'){cinemaPaused=!cinemaPaused;}else if(screen==='title'||screen==='end')chapters();else if(engine?.screen==='paused')resume();else pause();};
el('sound').onclick=()=>audio.toggleMute();el('ghost').onclick=()=>{showGhost=!showGhost;toast(showGhost?'Best-run ghost enabled. Complete a room to record one.':'Best-run ghost hidden.');};
el('resume').onclick=resume;el('retry').onclick=()=>{if(engine){restartFromCheckpoint(engine);resume();}};
el('restart').onclick=()=>{if(engine){restartRoom(engine);resume();}};
el('select').onclick=chapters;el('close-chapters').onclick=()=>{closeDialogs();if(screen==='playing')resume();};
el('home').onclick=()=>{closeDialogs();engine=null;screen='title';};
el('gate-x').onclick=()=>addGate('X');el('gate-h').onclick=()=>addGate('H');
el('undo').onclick=()=>{engine?.sequence.pop();};el('run-circuit').onclick=()=>{if(engine)submitCircuit(engine);};
el('cancel-circuit').onclick=()=>{if(engine)engine.screen='playing';};
function addGate(g:'X'|'H'){if(engine&&engine.sequence.length<3){engine.sequence.push(g);engine.circuitError='';}}
for(const d of dialogs)d.addEventListener('cancel',event=>{event.preventDefault();input.update();if(d===hintDialog){closeHint();}else if(d===circuitDialog&&engine){engine.screen='playing';d.close();canvas.focus();}else resume();});
addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f'&&!e.repeat){e.preventDefault();void fullscreen();}if(e.key==='?'&&!e.repeat&&screen!=='cinematic')showHelp();if(e.key.toLowerCase()==='v'&&!e.repeat){voice.toggle();toast(voice.enabled?'Voice-over on':'Voice-over off');}});
addEventListener('blur',()=>{pause();voice.stop();if(screen==='cinematic')cinemaPaused=true;});document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();voice.stop();cinemaPaused=true;}});
canvas.addEventListener('click',()=>{if(screen==='title')beginStory();else if(screen==='cinematic')nextFilmShot();else if(screen==='end')chapters();else if(engine?.screen==='chapterIntro')engine.screen='playing';else if(engine?.screen==='roomClear'&&engine.roomClearTimer>1)advance();canvas.focus();});

function wrap(text:string,x:number,y:number,width:number,size=13,color='#a3b9be',align:CanvasTextAlign='left'){
 const words=text.split(' ');let line='';ctx.font=`${size}px monospace`;
 for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>width&&line){label(ctx,line,x,y,size,color,align);line=word;y+=size*1.6;}else line=next;}
 if(line)label(ctx,line,x,y,size,color,align);return y;
}
function panel(x:number,y:number,w:number,h:number){ctx.fillStyle='#0c222bea';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#45666b';ctx.strokeRect(x,y,w,h);}
function guidance(e:GameEngine){
 const room=e.room;
 if(room.doors.some(d=>d.observedLock))return 'DOOR OBSERVED · BAIT THE CAMERA WITH A BRANCH, THEN RE-RUN THE H CIRCUIT';
 if(roomIndex===0){const held=room.pressurePlates.filter(p=>p.active).length;if(held===2)return 'BOTH PLATES HELD · REACH THE OPEN EXIT';if(held===1)return 'ONE PLATE HELD · SPLIT, THEN GUIDE THE OTHER CAT TO THE FREE PLATE';return 'GO TO EITHER PLATE AND PRESS SPACE TO SPLIT MISO';}
 if(roomIndex===1){if(!room.switches[0]?.latched)return 'FIRST · REACH THE UPPER-RIGHT SWITCH AND PRESS SPACE';return room.pressurePlates[0]?.active?'PLATE HELD · TAKE THE CONTROLLED CAT TO THE EXIT':'NEXT · SPACE TO SPLIT, LEAVE A CAT ON THE LOWER-LEFT PLATE';}
 if(roomIndex===2){const next=room.panels.find(p=>!p.solved);return next?`TERMINAL · SPACE → TYPE ${next.requiredSequence?.join(', ')??next.gateType} → ENTER`:'GATES RESTORED · CROSS THE OPEN SHUTTER AND REACH THE EXIT';}
 if(room.beaconPickup&&!e.beaconUnlocked)return 'STEP 1 / 5 · WALK ONTO THE RECEIVER PICKUP TO COLLECT IT';
 if(room.beaconTarget&&e.state.avatars[0].pos.x<(room.beaconTarget.pos.x-.5)*T){
  const next=room.panels.find(p=>!p.solved);
  if(next)return `STEP 2 / 5 · TERMINAL · SPACE → TYPE ${next.requiredSequence?.join(', ')??next.gateType} → ENTER`;
  if(!e.state.beacon){const sweep=room.lasers.find(l=>l.sweeping)?.sweeping;return sweep&&!(sweep.pos<17.2&&sweep.direction===1)?'STEP 3 / 5 · WAIT FOR BEAM AT FAR LEFT, MOVING RIGHT':'STEP 3 / 5 · FACE RIGHT AT THE MIDDLE GAP · PRESS E TO THROW';}
  if(e.state.beacon.flight)return 'STEP 4 / 5 · RECEIVER IN FLIGHT · WAIT FOR IT TO LAND';
  if(!e.state.beacon.link.teleporting)return 'STEP 4 / 5 · RECEIVER LANDED · PRESS E AGAIN TO TRANSFER';
 }
 const memory=room.storyMemories?.find(m=>!m.collected);if(memory)return `MEMORY REQUIRED · RECOVER ${memory.label} BEFORE EXITING`;
 const next=room.panels.find(p=>!p.solved);if(next)return `REPAIR CIRCUIT · SPACE AT TERMINAL · ${next.requiredSequence?.join(' → ')??next.gateType} · ENTER`;
 const sw=room.switches.find(s=>!s.latched);if(sw)return `REACH ${sw.label??'THE SWITCH'} AND PRESS SPACE`;
 if(room.beaconTarget)return 'STEP 5 / 5 · GO DOWN TO ROW 6, MOVE RIGHT BELOW THE BEAM, THEN UP TO EXIT';
 if(room.pressurePlates.length&&room.pressurePlates.some(p=>!p.active))return 'HOLD BOTH PRESSURE PLATES AT ONCE · SPACE TO SPLIT';
 return 'OBJECTIVES COMPLETE · REACH THE MARKED EXIT';
}
function gameRender(e:GameEngine){
 renderer.time=e.time;renderer.clear();renderer.drawBackground();
 renderer.drawWalls([{x:0,y:0,w:24,h:1},{x:0,y:12,w:24,h:1},{x:0,y:1,w:1,h:11},{x:23,y:1,w:1,h:11},...e.room.walls],e.room.accentColor);
 const room=e.room,cat=e.state.avatars.find(a=>a.isControlled)!;
 // Checkpoint and alternate routes are gameplay landmarks.
 const cp=e.state.checkpoint.pos;ctx.strokeStyle=e.checkpointFlash>0?CYAN:'#476b65';ctx.lineWidth=1;ctx.strokeRect(cp.x-17,cp.y-17,34,34);label(ctx,'CP',cp.x,cp.y+28,8,'#83b8a7','center');
 for(const vent of room.vents??[])for(const p of [vent.from,vent.to]){const x=(p.x+.5)*T,y=(p.y+.5)*T;ctx.fillStyle='#182c38';ctx.fillRect(x-13,y-11,26,22);ctx.strokeStyle=vent.discovered?PINK:'#4f6372';ctx.strokeRect(x-13,y-11,26,22);for(let i=-7;i<9;i+=5){ctx.beginPath();ctx.moveTo(x-9,y+i);ctx.lineTo(x+9,y+i);ctx.stroke();}if(Math.hypot(cat.pos.x-x,cat.pos.y-y)<65)label(ctx,'SPACE / PHASE VENT',x,y-23,9,PINK,'center');}
 const ex=room.exitTrigger;renderer.drawExit(ex.pos.x*T,ex.pos.y*T,ex.size.x*T,ex.size.y*T);
 if(room.beaconTarget&&e.beaconUnlocked&&room.panels.every(p=>p.solved)){
  const x=(room.beaconTarget.pos.x+.5)*T,y=(room.beaconTarget.pos.y+.5)*T,pulse=1+Math.sin(e.time*3)*.08;
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.scale(pulse,pulse);ctx.strokeStyle='#8fe4c6';ctx.lineWidth=2;ctx.strokeRect(-18,-18,36,36);ctx.strokeStyle='#8fe4c677';ctx.strokeRect(-27,-27,54,54);ctx.restore();
  label(ctx,'TRANSFER DESTINATION',x,y-34,8,'#a4e7d2','center');
 }
 for(const d of room.doors){renderer.drawDoor(d.pos.x*T,d.pos.y*T,d.size.x*T,d.size.y*T,d.state,room.accentColor);if(d.observedLock)label(ctx,'OBSERVED',d.pos.x*T+d.size.x*T/2,d.pos.y*T-8,8,'#f09c7d','center');}
 for(const m of room.membranes??[]){ctx.strokeStyle='#d09bc77a';ctx.setLineDash([2,6]);ctx.strokeRect(m.x*T,m.y*T,m.w*T,m.h*T);ctx.setLineDash([]);label(ctx,'RECEIVER ONLY',(m.x+.5)*T,(m.y+m.h)*T+13,8,PINK,'center');}
 if(room.virusCore){const v=room.virusCore,clean=room.panels.every(p=>p.solved)&&room.switches.every(p=>p.latched);drawNull(ctx,(v.x+.5)*T,(v.y+.5)*T,.48,e.time,clean);label(ctx,clean?'NULL / PURGED':'NULL / CORE',(v.x+.5)*T,(v.y+2)*T,9,clean?CYAN:'#ec927e','center');if(room.switches[0]?.latched&&!clean)label(ctx,'ISOLATED / PURGE READY',(v.x+.5)*T,(v.y+2.5)*T,8,CYAN,'center');}
 for(const p of room.panels){renderer.drawPanel((p.pos.x+.5)*T,(p.pos.y+.5)*T,p.gateType,!!p.solved,room.accentColor);if(canInteractWithPanel(cat.pos,p))label(ctx,'SPACE / CIRCUIT',(p.pos.x+.5)*T,(p.pos.y-.15)*T,9,CYAN,'center');}
 for(const p of room.pressurePlates)renderer.drawPanel((p.pos.x+.5)*T,(p.pos.y+.5)*T,'plate',p.active,CYAN);
 for(const s of room.switches){renderer.drawPanel((s.pos.x+.5)*T,(s.pos.y+.5)*T,'switch',s.latched,CYAN);if(s.label)label(ctx,s.label,(s.pos.x+.5)*T,(s.pos.y+1)*T+9,9,s.latched?CYAN:'#d8bd90','center');}
 for(const memory of room.storyMemories??[]){if(memory.collected)continue;const x=(memory.pos.x+.5)*T,y=(memory.pos.y+.5)*T;polygon(ctx,[[x-13,y-16],[x+7,y-16],[x+14,y-9],[x+14,y+16],[x-13,y+16]],'#33414a','#e1c187');ctx.fillStyle='#e1c187';ctx.fillRect(x-7,y-9,13,4);ctx.fillRect(x-7,y,17,2);ctx.fillRect(x-7,y+6,11,2);label(ctx,memory.label,x,y-25,9,'#e1c187','center');}
 if(room.storyMark){const x=(room.storyMark.x+.5)*T,y=(room.storyMark.y+.5)*T;ctx.strokeStyle='#836d9277';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x-12+i*10,y-10);ctx.lineTo(x-16+i*10,y+8);ctx.stroke();}if(Math.hypot(cat.pos.x-x,cat.pos.y-y)<70)label(ctx,'UNINDEXED',x,y+26,8,'#99829f','center');}
 if(room.beaconPickup&&!e.beaconUnlocked){const p=room.beaconPickup;renderer.drawBeacon((p.x+.5)*T,(p.y+.5)*T);label(ctx,'WALK HERE / AUTO PICKUP',(p.x+.5)*T,(p.y-.1)*T,8,PINK,'center');}
 for(const laser of room.lasers){const p=getLaserPixelCoords(laser);renderer.drawLaser(p.start.x,p.start.y,p.end.x,p.end.y,laser.active);}
 room.cameras.forEach((camera,i)=>{const danger=Math.max(0,...e.state.avatars.filter(a=>a.warning.sourceCamera===i).map(getWarningUrgency));renderer.drawCameraCone(e.conePolygons[i]??[],danger);renderer.drawCameraBody((camera.pos.x+.5)*T,(camera.pos.y+.5)*T,camera.currentAngle*Math.PI/180);if(camera.lockOn.active)label(ctx,'BAITED '+camera.lockOn.timer.toFixed(1)+'s',(camera.pos.x+.5)*T,(camera.pos.y+1)*T,9,PINK,'center');});
 if(showGhost&&e.bestGhost.length){const g=ghostAt(e.bestGhost,e.state.roomTime);if(g&&Math.abs(g[0]-e.state.roomTime)<.3){ctx.save();ctx.globalAlpha=.2;drawCat(ctx,g[1],g[2],.7,0,e.time,'#cfc5ac');ctx.restore();label(ctx,'BEST',g[1],g[2]-24,8,'#a9a79a','center');}}
 if(e.hintTimer>0){ctx.save();ctx.globalAlpha=Math.min(1,e.hintTimer);ctx.strokeStyle='#b9b789';ctx.setLineDash([4,8]);ctx.strokeRect(ex.pos.x*T-5,ex.pos.y*T-5,ex.size.x*T+10,ex.size.y*T+10);ctx.restore();label(ctx,'OPENING → EXIT',(ex.pos.x+.5)*T,ex.pos.y*T-17,10,'#d7c792','center');}
 if(e.state.beacon){const b=e.state.beacon;renderer.drawBeaconLink(cat.pos.x,cat.pos.y,b.pos.x,b.pos.y,e.time*3);
  const travel=1-(b.flight??0)/.3,origin=b.origin??b.pos;
  const bx=origin.x+(b.pos.x-origin.x)*travel,by=origin.y+(b.pos.y-origin.y)*travel-Math.sin(travel*Math.PI)*42;
  renderer.drawBeacon(bx,by);
  if(b.link.teleporting){const t=b.link.classicalBitsPulse;const x=cat.pos.x+(b.pos.x-cat.pos.x)*t,y=cat.pos.y+(b.pos.y-cat.pos.y)*t;
   panel(x-19,y-13,38,24);label(ctx,e.transfer?.bits??'00',x,y+5,13,CYAN,'center');label(ctx,'CLASSICAL BITS → X/Z',x,y-21,9,CYAN,'center');}
 }
 if(e.state.avatars.length===2){const [a,b]=e.state.avatars;renderer.drawBeaconLink(a.pos.x,a.pos.y,b.pos.x,b.pos.y,e.time*4);}
 for(const a of e.state.avatars){renderer.drawAvatar(a.pos.x,a.pos.y,a.alive,a.isControlled,a.isControlled?CYAN:PINK,Math.atan2(a.facingDir.y,a.facingDir.x),a.isControlled&&Math.hypot(a.vel.x,a.vel.y)>1);
  if(a.warning.state==='active'){const u=getWarningUrgency(a);ctx.strokeStyle='#f18b70';ctx.lineWidth=3;ctx.beginPath();ctx.arc(a.pos.x,a.pos.y,30,-Math.PI/2,-Math.PI/2+u*Math.PI*2);ctx.stroke();label(ctx,a.warning.timer.toFixed(1)+'s / '+(a.isControlled?'ESCAPE':'TAB / R'),a.pos.x,a.pos.y-38,10,'#ffc0a1','center');}}
 if(e.splitShockwaveTimer>0&&!reduced){const t=1-e.splitShockwaveTimer/.4;for(let i=0;i<16;i++){const a=i*Math.PI/8,r=20+t*80;ctx.save();ctx.globalAlpha=1-t;polygon(ctx,[[cat.pos.x+Math.cos(a)*r,cat.pos.y+Math.sin(a)*r],[cat.pos.x+Math.cos(a+.12)*(r+9),cat.pos.y+Math.sin(a+.12)*(r+9)],[cat.pos.x+Math.cos(a+.17)*r,cat.pos.y+Math.sin(a+.17)*r]],i%2?PINK:CYAN);ctx.restore();}}
 if(e.gateSolveFxTimer>0&&e.gateSolveFxFrom&&e.gateSolveFxTo){const t=1-e.gateSolveFxTimer/.8,a=e.gateSolveFxFrom,b=e.gateSolveFxTo;ctx.strokeStyle='#9ce0bf';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);ctx.stroke();}
 if(e.collapseFlashTimer>0){const p=e.collapseResult?.removedAvatar?.pos;if(p&&!reduced){ctx.save();ctx.globalAlpha=e.collapseFlashTimer/.8;for(let i=0;i<10;i++){const r=(1-e.collapseFlashTimer/.8)*45;ctx.fillStyle=i%2?PINK:CYAN;ctx.fillRect(p.x+Math.sin(i*7)*r,p.y+Math.cos(i*5)*r,7,2);}ctx.restore();}panel(421,270,310,52);label(ctx,e.collapseResult?.type==='branchPruned'?'DECOY SPENT / CAMERA BAITED':e.collapseResult?.type==='measured'?'MEASURED / CHECKPOINT SAVED':'BRANCHES MERGED',576,301,14,'#ecc2a9','center');}
 if(e.teleportFlashTimer>0&&!reduced){ctx.fillStyle=`rgba(135,221,201,${e.teleportFlashTimer*.18})`;ctx.fillRect(0,0,W,624);}
 panel(200,42,752,34);label(ctx,guidance(e),576,64,11,'#d7e8dc','center');
 hud(e);
 const passive=e.state.avatars.find(a=>!a.isControlled);
 if(passive){feed.render(ctx,passive.pos,e.time);drawEdgePing(ctx,passive.pos,e.threatDistance,e.time);}
 if(e.noticeTimer>0){panel(300,548,552,32);label(ctx,e.notice,576,569,11,'#e8c9a2','center');}
 if(e.screen==='chapterIntro'){ctx.fillStyle='#081822eb';ctx.fillRect(0,0,W,H);label(ctx,'MILLIKELVIN VAULT / '+('SECTOR '+String(roomIndex+1).padStart(2,'0')+' / 15'),576,238,12,CYAN,'center');label(ctx,names[roomIndex],576,314,42,'#e9e6d7','center');wrap(objectives[roomIndex],576,363,850,15,'#99b8bf','center');wrap(room.missionControlLine,576,411,840,12,'#d4bc96','center');label(ctx,'SPACE OR CLICK TO ENTER',576,492,12,CYAN,'center');}
 if(e.screen==='roomClear')clearCard(e);
}
function hud(e:GameEngine){
 ctx.fillStyle='#0a1a23';ctx.fillRect(0,624,W,96);ctx.fillStyle='#0b1c25ef';ctx.fillRect(10,8,550,30);
 label(ctx,names[roomIndex].toUpperCase(),22,28,12,'#d4e2dc');
 const remaining=e.room.panels.filter(p=>!p.solved).length+e.room.switches.filter(p=>!p.latched).length+e.room.doors.filter(d=>d.isExit&&d.state==='closed').length;
 label(ctx,`GATES LEFT ${remaining}   ${formatTime(e.state.roomTime)} / PAR ${formatTime(e.room.parTime)}`,540,28,10,'#8eb4b4','right');
 for(let i=0;i<factories.length;i++){ctx.fillStyle=saveManager.getStars(ids[i])?CYAN:i===roomIndex?'#d5c49d':'#3d535e';ctx.fillRect(24+i*17,610,11,3);}
 label(ctx,'COHERENCE / '+Math.ceil(e.coherenceState.value)+'%',24,647,11,CYAN);
 for(let i=0;i<30;i++){ctx.fillStyle=i<e.coherenceState.value/100*30?(e.coherenceState.value<30?'#ed9279':CYAN):'#263b45';ctx.fillRect(24+i*8,659,5,9);}
 label(ctx,e.coherenceState.regenLockoutTimer>0?'RECOVERY LOCK '+e.coherenceState.regenLockoutTimer.toFixed(1)+'s':e.state.playerState==='superposed'?'TWO BRANCHES / −8 PER SEC':e.state.beacon?'LINK ACTIVE / −8 PER SEC':'CLASSICAL / +4 PER SEC',24,689,10,'#a0b5ba');
 label(ctx,e.room.chapter===3?'SPACE Circuit   E Beacon/transfer   B Replace   Q Merge':'SPACE Split/use   TAB Switch   Q Merge   R Recall',1127,647,11,'#bdd1d0','right');
 label(ctx,e.lastQuantum.text(),1127,672,13,PINK,'right');
 label(ctx,objectives[roomIndex],1127,696,10,'#94abb3','right');
 if(e.coherenceState.value<60&&!reduced){ctx.save();ctx.globalAlpha=(60-e.coherenceState.value)/600;ctx.fillStyle='#c2d4d7';for(let i=0;i<18;i++)ctx.fillRect((i*137+Math.floor(e.time*17)*37)%W,(i*71+Math.floor(e.time*13)*13)%624,24,1);ctx.restore();}
}
function clearCard(e:GameEngine){
 ctx.fillStyle='#030c14d9';ctx.fillRect(0,0,W,H);panel(266,127,620,470);
 const score=e.roomScore!,stars=getStarCount(score),rating=efficiency(stars,score.time,e.room.parTime,score.finalCoherence);
 label(ctx,'SECTOR SECURED',576,173,12,CYAN,'center');label(ctx,names[roomIndex],576,225,30,'#e9e6d7','center');
 label(ctx,'★'.repeat(stars)+'☆'.repeat(3-stars),576,290,39,'#d6bd84','center');
 label(ctx,`TIME ${formatTime(score.time)} / PAR ${formatTime(e.room.parTime)}   ·   COHERENCE ${Math.floor(score.finalCoherence)}%`,576,336,12,'#b7cecc','center');
 label(ctx,`QUANTUM EFFICIENCY ${rating}%   ·   RETRIES ${e.retries}`,576,366,12,CYAN,'center');
 wrap(levelStory[roomIndex].clear,576,410,530,14,'#d6cfb7','center');
 label(ctx,'Breach ✓   Efficient '+(score.efficient?'✓':'—')+'   Undetected '+(score.undetected?'✓':'—'),576,497,12,'#c0cdbd','center');
 label(ctx,'SPACE OR CLICK → '+(roomIndex===factories.length-1?'ERASE NULL / RETURN HOME':'NEXT SECTOR'),576,551,14,CYAN,'center');
}
function endRender(){
 ctx.fillStyle='#0b1b24';ctx.fillRect(0,0,W,H);label(ctx,'MISO IS HOME. FOR NOW.',576,105,43,CYAN,'center');label(ctx,'CHAPTER ONE COMPLETE / Null is gone. A second signal remains.',576,148,15,'#e4e5d4','center');
 let total=0,totalTime=0,totalRating=0;
 factories.forEach((make,i)=>{const r=make(),best=getRun(r.id),stars=saveManager.getStars(r.id);total+=stars;totalTime+=best?.time??0;totalRating+=best?efficiency(stars,best.time,r.parTime,best.coherence):0;
 const x=65+Math.floor(i/5)*365,y=245+(i%5)*54;
 if(i%5===0)label(ctx,campaignActs[Math.floor(i/5)],x,201,11,PINK);
 label(ctx,String(i+1).padStart(2,'0')+' / '+names[i],x,y,12,'#b4cbc9');label(ctx,'★'.repeat(stars)+'☆'.repeat(3-stars),x,y+22,15,'#d7bd85');label(ctx,best?formatTime(best.time):'—',x+300,y+22,11,CYAN,'right');});
 label(ctx,total+'/45 STARS   ·   BEST TIMES '+formatTime(totalTime)+'   ·   EFFICIENCY '+Math.round(totalRating/factories.length)+'%',576,575,16,PINK,'center');
 label(ctx,'SPACE OR CLICK → REPLAY A SECTOR',576,637,14,CYAN,'center');
}
function syncUI(){
 el('voice-toggle').textContent=voice.unavailable?'Voice unavailable':voice.blocked?'Enable voice':voice.enabled?'V · Voice on':'V · Voice off';el('voice-toggle').setAttribute('aria-pressed',String(voice.enabled));el('ending').hidden=screen==='cinematic'||!(debug||saveManager.getStars(ids[14])>0);
 el('game-controls').hidden=screen==='cinematic';el('cinema-controls').hidden=screen!=='cinematic'||(cinemaEnding&&cinematicShot(cinemaTime,true).shot.id==='cut');el('pause-story').textContent=cinemaPaused?'P · Resume film':'P · Pause film';
 (el('hint') as HTMLButtonElement).disabled=screen!=='playing'||!engine||!['playing','paused','circuit'].includes(engine.screen);
 (el('story') as HTMLButtonElement).disabled=screen==='cinematic';(el('help') as HTMLButtonElement).disabled=screen==='cinematic';
 if(screen==='playing'&&engine?.screen==='playing'&&hintTier(engine.failures)>shownHintTier)showHint(true);

 el('sound').textContent=audio.isMuted()?'Sound off':'Sound on';el('ghost').textContent=showGhost?'Ghost on':'Ghost off';
 if(screen==='playing'&&engine){
  const e=engine;
  if(e.screen==='paused'&&!dialogs.some(d=>d.open)){el('pause-info').textContent=`${names[roomIndex]} · ${formatTime(e.state.roomTime)} · ${Math.ceil(e.coherenceState.value)}% coherence`;pauseDialog.showModal();}
  if(e.screen==='circuit'){
   if(!circuitDialog.open)circuitDialog.showModal();
   const p=e.room.panels[e.activePanel],q=previewSequence(e.sequence),sig=e.sequence.join(',')+'|'+e.circuitError+'|'+e.activePanel;
   if(sig!==lastCircuitSignature){
    lastCircuitSignature=sig;el('circuit-title').textContent=p.gateType==='X'?'Laser-bank circuit':'Phase-shutter circuit';
    el('circuit-instruction').textContent='Engraved sequence: '+(p.requiredSequence??[p.gateType]).join(' → ')+'. Select the gates below, or type X and H.';
    el('slots').replaceChildren();for(let i=0;i<3;i++){const slot=document.createElement('div');slot.className='slot';slot.textContent=e.sequence[i]??'·';el('slots').append(slot);}
    el('circuit-vector').textContent=q.text();el('circuit-probability').textContent=`From |0⟩: P(0) ${Math.round(q.probability(0)*100)}% · P(1) ${Math.round(q.probability(1)*100)}%`;
    el('circuit-error').textContent=e.circuitError;
   }
  }else if(circuitDialog.open){circuitDialog.close();canvas.focus();lastCircuitSignature='';}
  const state=screen+e.screen+roomIndex;if(state!==lastScreen){lastScreen=state;el('status').textContent=names[roomIndex]+'. '+objectives[roomIndex]+'. '+e.screen;}
 }
}
const loop=new GameLoop(dt=>{
 time+=dt;
 if(screen==='cinematic'){
  if(input.wasPressed('escape'))finishStory();
  else{if(input.wasPressed('p'))cinemaPaused=!cinemaPaused;if(input.wasPressed(' ')||input.wasPressed('enter'))nextFilmShot();
   if(!cinemaPaused&&!document.hidden)cinemaTime+=dt;
   const shot=cinematicShot(cinemaTime,cinemaEnding);if(shot.done)finishStory();else if(shot.index!==lastShot){lastShot=shot.index;el('status').textContent=shot.shot.title+'. '+shot.shot.caption;if(!cinemaPaused){if(shot.shot.id==='transfer'||shot.shot.id==='return')audio.playTeleportPulse();else if(shot.shot.id==='null'||shot.shot.id==='claw')audio.playCollapseThud();else if(shot.shot.id==='celebrate')audio.playRoomClear();}}
  }
 }
 else if(screen==='title'&&!dialogs.some(d=>d.open)&&(input.wasPressed(' ')||input.wasPressed('enter')))beginStory();
 else if(screen==='end'&&!dialogs.some(d=>d.open)&&(input.wasPressed(' ')||input.wasPressed('enter')))chapters();
 else if(screen==='playing'&&engine){
  if(engine.screen==='roomClear'){
   engine.roomClearTimer+=dt;
   engine.time+=dt*.2;
   if(engine.roomClearTimer>1&&(input.wasPressed(' ')||input.wasPressed('enter')))advance();
  }else if(engine.screen==='paused'){
   if(pauseDialog.open&&(input.wasPressed(' ')||input.wasPressed('escape')))resume();
  }else updateGameEngine(engine,dt);
 }
 if(input.wasPressed('m')&&(screen!=='playing'||engine?.screen==='paused'))audio.toggleMute();
 syncUI();
 if(screen==='cinematic'){const shot=cinematicShot(cinemaTime,cinemaEnding);voice.sync(shot.shot.voiceId,shot.local,cinemaPaused||document.hidden,audio.isMuted());}
 else if(screen==='playing'&&engine?.screen==='chapterIntro')voice.sync('level-'+(roomIndex+1)+'-brief',briefingDuration(roomIndex)-engine.chapterIntroTimer,document.hidden,audio.isMuted());
 else if(screen==='playing'&&engine?.screen==='roomClear')voice.sync('level-'+(roomIndex+1)+'-clear',engine.roomClearTimer,document.hidden,audio.isMuted());
 else voice.stop();
 input.update();
},()=>{
 ctx.save();
 if(screen==='cinematic'){drawCinematic(ctx,cinemaTime,reduced,cinemaEnding);if(cinemaPaused){panel(22,91,190,25);label(ctx,'PAUSED / P TO RESUME',117,108,10,CYAN,'center');}}else if(screen==='title')drawTitleScreen(ctx,time);else if(screen==='end')endRender();else if(engine)gameRender(engine);
 ctx.restore();
 display.save();display.clearRect(0,0,W,H);
 if(engine&&screen==='playing'&&engine.coherenceState.value<30&&!reduced)display.filter=`saturate(${.55+engine.coherenceState.value*.015})`;
 const shake=engine&&engine.collapseFlashTimer>0&&!reduced?Math.sin(time*80)*engine.collapseFlashTimer*2:0;
 display.drawImage(renderer.getSceneCanvas(),shake,0,W,H);display.restore();
});loop.start();
