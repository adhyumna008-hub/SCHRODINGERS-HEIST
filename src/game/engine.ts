// Main Game Engine: orchestrates all game systems
import { TILE_SIZE, PLAYER_RADIUS, FIXED_DT, COHERENCE_MAX,
  WARNING_TIME_CONTROLLED, WARNING_TIME_PASSIVE, RECALL_COHERENCE_COST,
  RECALL_RANGE, BAIT_COHERENCE_COST, BEACON_AIM_ANGLE
} from '../core/constants';
import { QuantumState, teleportState } from './quantum';
import { cloneRoom, getRun, saveRun, GhostFrame, markAttempted, getFailures, recordFailure } from './progress';
import { distanceToCone, sequenceMatches, previewSequence } from './features';
import { saveManager } from '../core/save';
import { getStarCount } from './scoring';
import { input } from '../core/input';
import { audioManager } from '../core/audio';
import { eventBus } from '../core/events';
import {
  GameState, Avatar, RoomData, Vec2, Rect, InputFrame,
  SecurityCamera, Door, Laser, Panel, PressurePlate, Switch,
  Beacon, DoorState
} from './types';
import { createAvatar, moveAvatar, spawnCloneAtPosition, switchControl,
  startWarning, cancelWarning, updateWarning, getWarningUrgency, recallClone
} from './avatar';
import { resolveCollisions, tileToPixel } from './world';
import {
  updateCameraAngle, generateConePolygon, isAvatarInCone, isDoorObserved, startLockOn
} from './camera';
import {
  createCoherenceState, updateCoherence, deductCoherence, applyRegenLockout,
  getCoherenceFraction, getCoherenceThreshold, CoherenceState
} from './coherence';
import { performCollapse, isMeasuredEvent, shouldMoveCheckpoint, CollapseResult } from './collapse';
import {
  calculateBeaconLanding, createBeacon, startTeleport, updateTeleport, destroyBeacon
} from './beacon';
import {
  getDoorCollisionRect, updateDoor, superposeDoor, collapseDoor,
  canInteractWithPanel, activatePanel,
  updatePressurePlate, canActivateSwitch, activateSwitch,
  toggleLaserGroup, checkLaserCollision, updateSweepingLaser, getLaserPixelCoords
} from './doors';
import { calculateStars, RoomScore } from './scoring';

export type GameScreen = 'title' | 'levelSelect' | 'playing' | 'paused' | 'roomClear' | 'chapterIntro' | 'endScreen' | 'circuit';

export interface GameEngine {
  checkpointRoom: RoomData;
  activePanel: number;
  sequence: ('X'|'H')[];
  circuitError: string;
  notice: string;
  noticeTimer: number;
  hintTimer: number;
  respawnGrace: number;
  retries: number;
  failures: number;
  beaconUnlocked: boolean;
  ghost: GhostFrame[];
  bestGhost: GhostFrame[];
  ghostClock: number;
  pingTimer: number;
  threatDistance: number;
  heartbeatTimer: number;
  checkpointFlash: number;
  initialRoom: RoomData;
  carrier: QuantumState;
  transfer: ReturnType<typeof teleportState> | null;
  lastQuantum: QuantumState;
  quantumMessage: string;
  state: GameState;
  room: RoomData;
  coherenceState: CoherenceState;
  screen: GameScreen;
  conePolygons: Vec2[][];
  roomScore: RoomScore | null;
  collapseResult: CollapseResult | null;
  collapseFlashTimer: number;
  splitShockwaveTimer: number;
  teleportFlashTimer: number;
  gateSolveFxTimer: number;
  gateSolveFxFrom: Vec2 | null;
  gateSolveFxTo: Vec2 | null;
  chapterIntroTimer: number;
  roomClearTimer: number;
  time: number;
  debugMode: boolean;
}

/** Create a new game engine for a room */
export function createGameEngine(room: RoomData, debugMode: boolean = false): GameEngine {
  const startPx = tileToPixel(room.playerStart.x, room.playerStart.y);
  const avatar = createAvatar(room.playerStart.x, room.playerStart.y, 'primary', true);
  
  return {
    checkpointRoom: cloneRoom(room),
    activePanel: -1, sequence: [], circuitError: '',
    notice: '', noticeTimer: 0, hintTimer: 0, respawnGrace: 0,
    retries: 0, failures: getFailures(room.id), beaconUnlocked: !room.beaconPickup,
    ghost: [], bestGhost: getRun(room.id)?.ghost??[], ghostClock: 0,
    pingTimer: 0, threatDistance: Infinity, heartbeatTimer: 0, checkpointFlash: 1.5,
    initialRoom: structuredClone(room),
    carrier: new QuantumState().apply(QuantumState.H),
    transfer: null,
    lastQuantum: new QuantumState(),
    quantumMessage: 'Approach X or H to inspect the gate register.',
    state: {
      playerState: 'classical',
      avatars: [avatar],
      controlledIndex: 0,
      coherence: COHERENCE_MAX,
      coherenceRegenLockout: 0,
      beacon: null,
      checkpoint: { pos: { ...startPx }, coherence: COHERENCE_MAX },
      measuredCount: 0,
      roomTime: 0,
      paused: false,
      roomCleared: false,
      collapseFreezeTimer: 0,
      currentRoom: room.id,
      stars: { breach: false, efficient: false, undetected: false },
    },
    room,
    coherenceState: createCoherenceState(),
    screen: 'chapterIntro',
    conePolygons: room.cameras.map(() => []),
    roomScore: null,
    collapseResult: null,
    collapseFlashTimer: 0,
    splitShockwaveTimer: 0,
    teleportFlashTimer: 0,
    gateSolveFxTimer: 0,
    gateSolveFxFrom: null,
    gateSolveFxTo: null,
    chapterIntroTimer: 2.5,
    roomClearTimer: 0,
    time: 0,
    debugMode,
  };
}

/** Get the controlled avatar */
function getControlled(engine: GameEngine): Avatar | null {
  return engine.state.avatars.find(a => a.isControlled && a.alive) ?? null;
}

/** Get passive (non-controlled) avatar */
function getPassive(engine: GameEngine): Avatar | null {
  return engine.state.avatars.find(a => !a.isControlled && a.alive) ?? null;
}

/** Get closed door rects for collision */
function getClosedDoorRects(engine: GameEngine): Rect[] {
  const rects: Rect[] = [];
  for (const door of engine.room.doors) {
    const r = getDoorCollisionRect(door);
    if (r) rects.push(r);
  }
  return rects;
}

/** Main update - called at fixed 60Hz */
export function updateGameEngine(engine: GameEngine, dt: number): void {
  if (engine.screen === 'circuit') {
    if(input.wasPressed('escape')) {engine.screen='playing';return;}
    if(input.wasPressed('backspace'))engine.sequence.pop();
    for(const gate of ['X','H'] as const)if(input.wasPressed(gate.toLowerCase())&&engine.sequence.length<3){engine.sequence.push(gate);engine.circuitError='';}
    if(input.wasPressed('enter'))submitCircuit(engine);
    return;
  }
  if (engine.screen === 'chapterIntro') {
    engine.chapterIntroTimer -= dt;
    if (engine.chapterIntroTimer <= 0 || input.wasPressed(' ') || input.wasPressed('enter')) {
      engine.screen = 'playing';
    }
    return;
  }
  
  if (engine.screen === 'roomClear') {
    engine.roomClearTimer += dt;
    if (engine.roomClearTimer > 1.0 && (input.wasPressed(' ') || input.wasPressed('enter'))) {
      engine.screen = 'levelSelect'; // Signal to advance
    }
    return;
  }
  
  if (engine.screen !== 'playing') return;
  
  // Handle pause
  if (input.wasPressed('Escape') || input.wasPressed('escape')) {
    engine.screen = 'paused';
    return;
  }
  
  // Handle mute
  if (input.wasPressed('m')) {
    audioManager.toggleMute();
  }
  
  // Debug mode keys
  if (engine.debugMode) {
    if (input.wasPressed('n')) {
      // Skip room
      completeRoom(engine);
      return;
    }
    if (input.wasPressed('g')) {
      // Grant full coherence
      engine.coherenceState.value = COHERENCE_MAX;
    }
  }
  
  // Collapse freeze frame
  if (engine.state.collapseFreezeTimer > 0) {
    const actionKeys=[' ','tab','q','r','c','e','b','backspace','escape'];
    const actionRequested=actionKeys.some(key=>input.wasPressed(key));
    if(!actionRequested){engine.state.collapseFreezeTimer-=dt;return;}
    // The impact pause is cosmetic; never eat a one-frame player command.
    engine.state.collapseFreezeTimer=0;
  }
  
  // Flash timers
  if (engine.collapseFlashTimer > 0) engine.collapseFlashTimer -= dt;
  if (engine.splitShockwaveTimer > 0) engine.splitShockwaveTimer -= dt;
  if (engine.teleportFlashTimer > 0) engine.teleportFlashTimer -= dt;
  if (engine.gateSolveFxTimer > 0) engine.gateSolveFxTimer -= dt;
  engine.noticeTimer=Math.max(0,engine.noticeTimer-dt);
  engine.hintTimer=Math.max(0,engine.hintTimer-dt);
  engine.respawnGrace=Math.max(0,engine.respawnGrace-dt);
  engine.checkpointFlash=Math.max(0,engine.checkpointFlash-dt);
  engine.pingTimer-=dt;engine.heartbeatTimer-=dt;
  
  engine.time += dt;
  engine.state.roomTime += dt;
  
  // Handle restart
  if (input.wasPressed('backspace') || (input.wasPressed('r')&&input.isDown('shift'))) {
    if(input.isDown('shift'))restartRoom(engine);else restartFromCheckpoint(engine);
    return;
  }
  
  let controlled = getControlled(engine);
  if (!controlled) return;
  
  const closedDoors = getClosedDoorRects(engine);
  
  // === MOVEMENT ===
  let dx = 0, dy = 0;
  if (input.isDown('w') || input.isDown('arrowup')) dy -= 1;
  if (input.isDown('s') || input.isDown('arrowdown')) dy += 1;
  if (input.isDown('a') || input.isDown('arrowleft')) dx -= 1;
  if (input.isDown('d') || input.isDown('arrowright')) dx += 1;
  
  const movementDoors = [...closedDoors, ...(engine.room.membranes??[])];
  if (!engine.state.beacon?.link.teleporting) moveAvatar(controlled, dx, dy, engine.room.walls, movementDoors);
  
  // === SPLIT (Space) ===
  if (input.wasPressed(' ')) {
    handleSpacePress(engine, controlled, closedDoors);
    if(engine.screen!=='playing')return;
  }
  
  // === TAB (switch avatar) ===
  if (input.wasPressed('tab') && engine.state.playerState === 'superposed') {
    engine.state.controlledIndex = switchControl(engine.state.avatars);
    audioManager.playSwitch();
    controlled = getControlled(engine)!;
  }
  
  // === Q (voluntary decohere) ===
  if (input.wasPressed('q') && engine.state.playerState === 'superposed') {
    const result = performCollapse(controlled, null, engine.state.avatars, engine.room.cameras, engine.coherenceState);
    handleCollapseResult(engine, result);
    engine.state.playerState = 'classical';
    engine.state.avatars = engine.state.avatars.filter(a => a.alive);
    engine.state.controlledIndex = 0;
    if (engine.state.avatars[0]) engine.state.avatars[0].isControlled = true;
  }
  
  // === R (recall) ===
  if ((input.wasPressed('r')||input.wasPressed('c')) && engine.state.playerState === 'superposed') {
    const passive = getPassive(engine);
    if (passive && engine.coherenceState.value >= RECALL_COHERENCE_COST) {
      if(recallClone(passive, controlled.pos, RECALL_RANGE, engine.room.walls, movementDoors)){
        deductCoherence(engine.coherenceState, RECALL_COHERENCE_COST);
        audioManager.playSwitch(); notify(engine,'RECALLED / −25 COHERENCE');
      }else notify(engine,'RECALL BLOCKED / MOVE INTO A CLEAR LINE');
    }else notify(engine,'RECALL NEEDS 25 COHERENCE');
  }
  if(engine.room.beaconPickup&&!engine.beaconUnlocked){
    const p=tileToPixel(engine.room.beaconPickup.x,engine.room.beaconPickup.y);
    if(Math.hypot(controlled.pos.x-p.x,controlled.pos.y-p.y)<34){
      engine.beaconUnlocked=true;notify(engine,'RECEIVER ACQUIRED / E TO THROW · E AGAIN TO TRANSFER');audioManager.playGateSolve();
    }
  }
  
  // === E (beacon throw / teleport) ===
  if (input.wasPressed('b') || (input.wasPressed('e')&&input.isDown('shift'))) {
    if(!engine.state.beacon?.link.teleporting){engine.state.beacon=null;handleBeaconAction(engine,controlled,closedDoors);}
  } else if (input.wasPressed('e')) {
    handleBeaconAction(engine, controlled, closedDoors);
  }
  
  // === UPDATE CAMERAS ===
  for (let i = 0; i < engine.room.cameras.length; i++) {
    updateCameraAngle(engine.room.cameras[i], engine.time);
    engine.conePolygons[i] = generateConePolygon(
      engine.room.cameras[i], engine.room.walls, closedDoors
    );
  }
  
  // === CAMERA DETECTION ===
  const passive=getPassive(engine);
  engine.threatDistance=passive?Math.min(...engine.conePolygons.map(p=>distanceToCone(passive.pos,p))):Infinity;
  if(passive&&engine.threatDistance<3*TILE_SIZE&&engine.pingTimer<=0){
    audioManager.playClonePing();engine.pingTimer=.25+.75*Math.min(1,engine.threatDistance/(3*TILE_SIZE));
  }
  for (const avatar of engine.state.avatars) {
    if (!avatar.alive) continue;
    if(engine.respawnGrace>0)continue;
    
    let seenByAny = false;
    for (let ci = 0; ci < engine.room.cameras.length; ci++) {
      const cam = engine.room.cameras[ci];
      const camOriginPx = tileToPixel(cam.pos.x, cam.pos.y);
      const seen = isAvatarInCone(
        avatar.pos, PLAYER_RADIUS * TILE_SIZE,
        engine.conePolygons[ci], camOriginPx,
        engine.room.walls, closedDoors
      );
      
      if (seen) {
        seenByAny = true;
        if (avatar.warning.state !== 'active') {
          const warnTime = avatar.isControlled ? WARNING_TIME_CONTROLLED : WARNING_TIME_PASSIVE;
          startWarning(avatar, warnTime, ci);
          audioManager.playWarningBeep(0);
          eventBus.emit('warning', { avatar, camera: ci });
        }
      }
    }
    
    if (!seenByAny && avatar.warning.state === 'active') {
      cancelWarning(avatar);
      eventBus.emit('warningCancel', { avatar });
    }
    
    // Update warning timer
    if (avatar.warning.state === 'active') {
      const expired = updateWarning(avatar, dt);
      // Play escalating beep
      const urgency = getWarningUrgency(avatar);
      if (urgency > 0.5 && Math.floor(engine.time*8)!==Math.floor((engine.time-dt)*8)) {
        audioManager.playWarningBeep(urgency);
      }
      
      if (expired) {
        // Collapse!
        const ctrl = getControlled(engine)!;
        const result = performCollapse(ctrl, avatar, engine.state.avatars, engine.room.cameras, engine.coherenceState);
        handleCollapseResult(engine, result);
        engine.state.avatars = engine.state.avatars.filter(a => a.alive);
        if (engine.state.avatars.length <= 1) {
          engine.state.playerState = 'classical';
        }
        engine.state.controlledIndex = engine.state.avatars.findIndex(a => a.isControlled);
        if (engine.state.controlledIndex === -1 && engine.state.avatars.length > 0) {
          engine.state.avatars[0].isControlled = true;
          engine.state.controlledIndex = 0;
        }
        break; // Don't process more avatars this frame
      }
    }
  }
  
  // === H-DOOR OBSERVATION (camera collapses superposed doors) ===
  for (const door of engine.room.doors) {
    if (door.quantum && door.state !== 'closed') {
      const observed = isDoorObserved(
        door.pos, door.size,
        engine.room.cameras, engine.conePolygons,
        engine.room.walls, closedDoors
      );
      if (observed) {
        collapseDoor(door);
        door.observedLock=true;
        door.state='closed'; // Facility interlock, separate from the sampled quantum register.
        if(door.quantum) engine.lastQuantum = door.quantum;
        engine.quantumMessage = 'Measurement recorded. Observer safety interlock CLOSED. Re-arm H when clear.';
        notify(engine,'DOOR OBSERVED / SAFETY INTERLOCK CLOSED');
        const overlap=engine.state.avatars.some(a=>a.pos.x>(door.pos.x*TILE_SIZE-PLAYER_RADIUS*TILE_SIZE)&&a.pos.x<((door.pos.x+door.size.x)*TILE_SIZE+PLAYER_RADIUS*TILE_SIZE)&&a.pos.y>(door.pos.y*TILE_SIZE-PLAYER_RADIUS*TILE_SIZE)&&a.pos.y<((door.pos.y+door.size.y)*TILE_SIZE+PLAYER_RADIUS*TILE_SIZE));
        if(overlap){restartFromCheckpoint(engine);notify(engine,'CROSSING INTERRUPTED / CHECKPOINT RESTORED');return;}
        audioManager.playCollapseThud();
      }
    }
  }
  
  // === PRESSURE PLATES ===
  const avatarPositions = engine.state.avatars.filter(a => a.alive).map(a => a.pos);
  for (const plate of engine.room.pressurePlates) {
    updatePressurePlate(plate, avatarPositions);
  }
  
  // === DOOR UPDATES ===
  for (const door of engine.room.doors) {
    if (door.quantum || door.state === 'superposed') continue; // Quantum doors retain measured basis states.
    
    const satisfied = checkDoorInputsSatisfied(engine, door);
    updateDoor(door, satisfied, dt);
  }
  
  // === SWEEPING LASERS ===
  for (const laser of engine.room.lasers) {
    updateSweepingLaser(laser, dt);
  }
  
  // === LASER COLLISION ===
  for (const avatar of engine.state.avatars) {
    if (!avatar.alive) continue;
    const hitLaser = checkLaserCollision(avatar.pos, PLAYER_RADIUS * TILE_SIZE, engine.room.lasers);
    if (hitLaser && engine.respawnGrace<=0) {
      handleLaserDeath(engine, avatar);
      return;
    }
  }
  
  // === BEACON UPDATE ===
  if (engine.state.beacon?.active) {
    engine.state.beacon.flight=Math.max(0,(engine.state.beacon.flight??0)-dt);
    // Check beacon laser collision (mirror to player)
    const hitLaser = checkLaserCollision(engine.state.beacon.pos, 8, engine.room.lasers);
    if (hitLaser && !engine.state.beacon.flight && engine.respawnGrace<=0) {
      // Beacon hit -> mirror to player -> death
      engine.state.beacon = null;
      handleLaserDeath(engine, getControlled(engine)!);
      notify(engine,'BEACON HIT / LINK DAMAGE · CHECKPOINT RESTORED');
      return;
    }
    
    // Update teleport
    if (engine.state.beacon.link.teleporting) {
      const done = updateTeleport(engine.state.beacon, dt);
      if (done) {
        executeTeleport(engine);
      }
    }
  }
  
  // === COHERENCE ===
  const draining = engine.state.playerState === 'superposed' || (engine.state.beacon?.active ?? false);
  updateCoherence(engine.coherenceState, dt, draining);
  engine.state.coherence = engine.coherenceState.value;
  
  if (engine.coherenceState.value <= 0 && engine.state.playerState === 'superposed') {
    // Forced collapse
    const ctrl = getControlled(engine)!;
    const result = performCollapse(ctrl, null, engine.state.avatars, engine.room.cameras, engine.coherenceState);
    handleCollapseResult(engine, result);
    engine.state.avatars = engine.state.avatars.filter(a => a.alive);
    engine.state.playerState = 'classical';
    engine.state.controlledIndex = 0;
    if (engine.state.avatars[0]) engine.state.avatars[0].isControlled = true;
    applyRegenLockout(engine.coherenceState);
  }
  
  // Beacon dies on coherence 0
  if (engine.coherenceState.value <= 0 && engine.state.beacon) {
    engine.state.beacon = null;
    applyRegenLockout(engine.coherenceState);
    notify(engine,'COHERENCE LOST / LINK SEVERED · RECOVERING');
  }
  if(engine.coherenceState.value<=10&&engine.heartbeatTimer<=0){audioManager.playHeartbeat();engine.heartbeatTimer=1.3;}
  engine.ghostClock+=dt;
  if(engine.ghostClock>=.1){
    engine.ghostClock-=.1;const a=getControlled(engine),b=getPassive(engine);
    if(a&&engine.ghost.length<12000)engine.ghost.push([Math.round(engine.state.roomTime*10)/10,Math.round(a.pos.x),Math.round(a.pos.y),b?Math.round(b.pos.x):undefined,b?Math.round(b.pos.y):undefined]);
  }
  
  // === EXIT CHECK ===
  // Restored memories are story objectives, retained with other solved world state on retry.
  const collector=getControlled(engine);
  for(const memory of engine.room.storyMemories??[]){
    const p=tileToPixel(memory.pos.x,memory.pos.y);
    if(!memory.collected&&collector&&Math.hypot(collector.pos.x-p.x,collector.pos.y-p.y)<28){
      memory.collected=true;engine.checkpointRoom=cloneRoom(engine.room);
      notify(engine,'MEMORY RECOVERED / '+memory.label);audioManager.playGateSolve();
    }
  }
  const ctrl = getControlled(engine);
  if (ctrl) {
    const exit = engine.room.exitTrigger;
    const exitPx = {
      x: exit.pos.x * TILE_SIZE,
      y: exit.pos.y * TILE_SIZE,
      w: exit.size.x * TILE_SIZE,
      h: exit.size.y * TILE_SIZE,
    };
    if (ctrl.pos.x >= exitPx.x && ctrl.pos.x <= exitPx.x + exitPx.w &&
        ctrl.pos.y >= exitPx.y && ctrl.pos.y <= exitPx.y + exitPx.h) {
      // Check if exit door is open or superposed
      const exitDoor = engine.room.doors.find(d => d.isExit);
      if ((!exitDoor || exitDoor.state !== 'closed') && (!engine.room.requireAllCircuits || engine.room.panels.every(p=>p.solved)) && (engine.room.storyMemories??[]).every(m=>m.collected)) {
        completeRoom(engine);
      }else if(engine.noticeTimer<=0&&(engine.room.storyMemories??[]).some(m=>!m.collected)){
        notify(engine,'RETURN ARCHIVE MISSING / COLLECT THE MEMORY');
      }
    }
  }
}

function handleSpacePress(engine: GameEngine, controlled: Avatar, closedDoors: Rect[]): void {
  // Check if near a panel or switch first
  for (const panel of engine.room.panels) {
    if (canInteractWithPanel(controlled.pos, panel)) {
      engine.activePanel=engine.room.panels.indexOf(panel);
      engine.sequence=[];engine.circuitError='';engine.screen='circuit';
      return;
    }
  }
  for(const vent of engine.room.vents??[]){
    const ends=[[vent.from,vent.to],[vent.to,vent.from]];
    for(const [from,to] of ends){
      const p=tileToPixel(from.x,from.y);
      if(Math.hypot(controlled.pos.x-p.x,controlled.pos.y-p.y)<32){
        if(engine.state.playerState!=='superposed'){notify(engine,'PHASE VENT / SPLIT TO ENTER');return;}
        controlled.pos=tileToPixel(to.x,to.y);vent.discovered=true;
        engine.teleportFlashTimer=.2;notify(engine,'SHORTCUT DISCOVERED / PHASE VENT');return;
      }
    }
  }
  
  for (const sw of engine.room.switches) {
    if (canActivateSwitch(controlled.pos, sw) && !sw.latched) {
      if(sw.requiresPanels&&engine.room.panels.some(p=>!p.solved)){notify(engine,'REPAIR ALL CIRCUITS BEFORE ISOLATION');return;}
      if(sw.requiresSwitches?.some(i=>!engine.room.switches[i]?.latched)){notify(engine,'ISOLATE THE CORE AT THE UPPER SWITCH FIRST');return;}
      activateSwitch(sw);
      engine.checkpointRoom=cloneRoom(engine.room);
      audioManager.playSwitch();
      return;
    }
  }
  
  // Split
  if (engine.state.playerState === 'classical') {
    const clone = spawnCloneAtPosition({ ...controlled.pos });
    engine.state.avatars.push(clone);
    engine.state.playerState = 'superposed';
    engine.splitShockwaveTimer = 0.4;
    audioManager.playSplit();
    eventBus.emit('split', {});
  }
}

function handleGateActivation(engine: GameEngine, gateType: 'X' | 'H', linkedIds: string[], panel: Panel): void {
  if (gateType === 'X') {
    panel.quantum ??= new QuantumState();
    panel.quantum.apply(QuantumState.X);
    engine.lastQuantum = panel.quantum;
    engine.quantumMessage = 'X swaps amplitudes. X twice restores the initial state.';
    // Toggle laser group
    for (const id of linkedIds) {
      for (const laser of engine.room.lasers) if(laser.group === id) laser.active = panel.quantum.probability(0) > .5;
    }
    audioManager.playGateSolve();
    engine.gateSolveFxTimer = 0.8;
    engine.gateSolveFxFrom = tileToPixel(panel.pos.x, panel.pos.y);
    eventBus.emit('gateActivated', { type: 'X' });
  } else if (gateType === 'H') {
    // Superpose linked doors
    for (const id of linkedIds) {
      const door = engine.room.doors.find(d => d.id === id);
      if (door) {
        superposeDoor(door);
        engine.lastQuantum = door.quantum!;
        engine.quantumMessage = 'H mixes amplitudes. H twice restores the initial state.';
        audioManager.playGateSolve();
        engine.gateSolveFxTimer = 0.8;
        engine.gateSolveFxFrom = tileToPixel(panel.pos.x, panel.pos.y);
        engine.gateSolveFxTo = tileToPixel(door.pos.x, door.pos.y);
        eventBus.emit('gateActivated', { type: 'H' });
      }
    }
  }
}

function handleBeaconAction(engine: GameEngine, controlled: Avatar, closedDoors: Rect[]): void {
  if(engine.room.chapter<3){notify(engine,'RECEIVER UNLOCKS IN SECTOR 3');return;}
  if(!engine.beaconUnlocked){notify(engine,'FIND THE RECEIVER PICKUP BEFORE DEPLOYING');return;}
  if(engine.coherenceState.value<=0){notify(engine,'WAIT FOR COHERENCE TO RECOVER');return;}
  if (engine.state.beacon?.active) {
    if(engine.state.beacon.flight){notify(engine,'RECEIVER IN FLIGHT');return;}
    if (!engine.state.beacon.link.teleporting) {
      // Start teleport
      startTeleport(engine.state.beacon);
      engine.transfer = teleportState(engine.carrier);
      engine.quantumMessage = `Bell result ${engine.transfer.bits} → receiver correction ${engine.transfer.correction}.`;
      audioManager.playTeleportPulse();
    }
  } else {
    // Throw beacon
    const landing = calculateBeaconLanding(
      controlled.pos,
      controlled.facingDir,
      engine.room.beaconTarget,
      engine.room.walls,
      closedDoors
    );
    if (landing) {
      engine.state.beacon = createBeacon(landing);
      engine.state.beacon.origin={...controlled.pos};engine.state.beacon.flight=.3;
      audioManager.playSwitch();
      eventBus.emit('beaconThrown', { pos: landing });
    }else notify(engine,'THROW BLOCKED / MOVE CLEAR OF THE WALL AND FACE THE DESTINATION');
  }
}

function executeTeleport(engine: GameEngine): void {
  const controlled = getControlled(engine);
  if (!controlled || !engine.state.beacon) return;
  
  // Move player to beacon position
  if(engine.transfer) {
    engine.carrier = engine.transfer.output;
    engine.lastQuantum = engine.carrier;
    engine.quantumMessage = `Transferred |+⟩ with bits ${engine.transfer.bits}; X/Z correction complete.`;
  }
  controlled.pos.x = engine.state.beacon.pos.x;
  controlled.pos.y = engine.state.beacon.pos.y;
  
  // Destroy beacon
  engine.state.beacon = null;
  
  // Effects
  engine.teleportFlashTimer = 0.5;
  audioManager.playRoomClear(); // big bloom sound
  eventBus.emit('beaconTeleport', {});
}

function handleLaserDeath(engine: GameEngine, avatar: Avatar): void {
  // Respawn at checkpoint
  restartFromCheckpoint(engine);
}

export function restartFromCheckpoint(engine: GameEngine): void {
  const cp = engine.state.checkpoint;
  engine.room=cloneRoom(engine.checkpointRoom);
  engine.retries++;
  engine.failures=recordFailure(engine.room.id);
  engine.respawnGrace=.8;engine.checkpointFlash=1;
  
  // Reset to single avatar at checkpoint
  engine.state.avatars = [createAvatar(0, 0, 'primary', true)];
  engine.state.avatars[0].pos = { ...cp.pos };
  engine.state.controlledIndex = 0;
  engine.state.playerState = 'classical';
  engine.coherenceState.value = cp.coherence;
  engine.state.beacon = null;
  engine.state.collapseFreezeTimer = 0;
  
  engine.lastQuantum = new QuantumState();
  engine.transfer=null;engine.coherenceState.regenLockoutTimer=0;
  
  // Reset cameras
  for (const cam of engine.room.cameras) {
    cam.lockOn.active = false;
  }
}

function handleCollapseResult(engine: GameEngine, result: CollapseResult): void {
  engine.collapseResult = result;
  engine.collapseFlashTimer = 0.8;
  engine.state.collapseFreezeTimer = result.freezeTime;
  
  if (isMeasuredEvent(result)) {
    engine.state.measuredCount++;
    engine.state.checkpoint = {
      pos: { ...result.keptAvatar.pos },
      coherence: engine.coherenceState.value,
    };
    engine.checkpointRoom=cloneRoom(engine.room);
    engine.checkpointFlash=1.5;engine.respawnGrace=.75;
    audioManager.playCollapseThud();
    eventBus.emit('measured', {});
  } else if (result.type === 'branchPruned') {
    engine.hintTimer=4;notify(engine,'OBSERVER BAITED / 3 SECOND OPENING');
    audioManager.playCollapseThud();
    eventBus.emit('branchPruned', {});
  } else if (result.type === 'forcedCoherence') {
    engine.failures=recordFailure(engine.room.id);
    audioManager.playCollapseThud();
    eventBus.emit('coherenceZero', {});
  }
}

function checkDoorInputsSatisfied(engine: GameEngine, door: Door): boolean {
  // Check all plates linked to this door
  const activePlates = engine.room.pressurePlates
    .filter(p => p.linkedIds.includes(door.id) && p.active);
  
  // Check all switches linked to this door
  const activeSwitch = engine.room.switches
    .filter(s => s.linkedIds.includes(door.id) && s.latched);
  
  const totalActive = activePlates.length + activeSwitch.length;
  
  // Count total inputs pointing at this door
  const totalPlates = engine.room.pressurePlates.filter(p => p.linkedIds.includes(door.id));
  const totalSwitches = engine.room.switches.filter(s => s.linkedIds.includes(door.id));
  const totalInputs = totalPlates.length + totalSwitches.length;
  
  if (totalInputs === 0) return false;
  
  if (door.inputType === 'all') {
    return totalActive >= totalInputs;
  } else {
    return totalActive > 0;
  }
}

function completeRoom(engine: GameEngine): void {
  engine.state.roomCleared = true;
  engine.screen = 'roomClear';
  engine.roomClearTimer = 0;
  
  engine.roomScore = calculateStars(
    engine.coherenceState.value,
    COHERENCE_MAX,
    engine.state.measuredCount,
    engine.state.roomTime
  );
  const stars=getStarCount(engine.roomScore);
  saveManager.saveStars(engine.room.id,Math.max(stars,saveManager.getStars(engine.room.id)));
  saveRun(engine.room.id,{time:engine.state.roomTime,coherence:engine.coherenceState.value,stars,retries:engine.retries,ghost:engine.ghost});
  
  audioManager.playRoomClear();
  eventBus.emit('roomClear', { score: engine.roomScore });
}

/** Resume from pause */
export function resumeGame(engine: GameEngine): void {
  if (engine.screen === 'paused') {
    engine.screen = 'playing';
  }
}

/** Restart room from scratch */
export function restartRoom(engine: GameEngine): void {
  const retries=engine.retries+1;
  recordFailure(engine.room.id);
  const newEngine = createGameEngine(structuredClone(engine.initialRoom), engine.debugMode);
  Object.assign(engine, newEngine);
  engine.retries=retries;
  engine.screen = 'playing';
}

export function notify(engine:GameEngine,message:string){engine.notice=message;engine.noticeTimer=3;}

export function submitCircuit(engine:GameEngine):boolean {
  const panel=engine.room.panels[engine.activePanel];if(!panel)return false;
  engine.lastQuantum=previewSequence(engine.sequence);
  if(!sequenceMatches(panel,engine.sequence)){
    engine.failures=recordFailure(engine.room.id);
    engine.circuitError='Circuit rejected. Match the engraved gate order; outputs remain safe.';
    audioManager.playWarningBeep(.2);return false;
  }
  // Evaluate the complete sequence; only a validated sequence changes the actuator.
  for(const gate of engine.sequence){
    if(panel.gateType==='X'){
      panel.quantum??=new QuantumState();panel.quantum.apply(QuantumState[gate]);
    }else{
      for(const id of panel.linkedIds){const d=engine.room.doors.find(d=>d.id===id);if(!d)continue;
        if(d.observedLock){d.quantum=new QuantumState();d.observedLock=false;}
        d.quantum??=new QuantumState();d.quantum.apply(QuantumState[gate]);
        d.state=d.quantum.probability(0)>1-1e-8?'closed':d.quantum.probability(1)>1-1e-8?'open':'superposed';
        engine.lastQuantum=d.quantum;engine.gateSolveFxTo=tileToPixel(d.pos.x,d.pos.y);
      }
    }
  }
  if(panel.gateType==='X'){
    engine.lastQuantum=panel.quantum!;
    for(const laser of engine.room.lasers)if(panel.linkedIds.includes(laser.group)){
      laser.active=panel.quantum!.probability(0)>.5;
      engine.gateSolveFxTo=tileToPixel(laser.start.x,laser.start.y);
    }
  }
  panel.solved=true;panel.activationCount++;engine.gateSolveFxTimer=.8;
  engine.checkpointRoom=cloneRoom(engine.room);
  engine.gateSolveFxFrom=tileToPixel(panel.pos.x,panel.pos.y);
  engine.quantumMessage=engine.sequence.join(' → ')+' applied. X² = H² = I.';
  engine.screen='playing';audioManager.playGateSolve();notify(engine,'CIRCUIT ACCEPTED / '+engine.sequence.join(' → '));
  return true;
}
