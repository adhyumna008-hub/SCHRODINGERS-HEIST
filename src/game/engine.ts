// Main Game Engine: orchestrates all game systems
import { TILE_SIZE, PLAYER_RADIUS, FIXED_DT, COHERENCE_MAX,
  WARNING_TIME_CONTROLLED, WARNING_TIME_PASSIVE, RECALL_COHERENCE_COST,
  RECALL_RANGE, BAIT_COHERENCE_COST, BEACON_AIM_ANGLE
} from '../core/constants';
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

export type GameScreen = 'title' | 'levelSelect' | 'playing' | 'paused' | 'roomClear' | 'chapterIntro' | 'endScreen';

export interface GameEngine {
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
    engine.state.collapseFreezeTimer -= dt;
    return;
  }
  
  // Flash timers
  if (engine.collapseFlashTimer > 0) engine.collapseFlashTimer -= dt;
  if (engine.splitShockwaveTimer > 0) engine.splitShockwaveTimer -= dt;
  if (engine.teleportFlashTimer > 0) engine.teleportFlashTimer -= dt;
  if (engine.gateSolveFxTimer > 0) engine.gateSolveFxTimer -= dt;
  
  engine.time += dt;
  engine.state.roomTime += dt;
  
  // Handle restart
  if (input.wasPressed('backspace')) {
    restartFromCheckpoint(engine);
    return;
  }
  
  const controlled = getControlled(engine);
  if (!controlled) return;
  
  const closedDoors = getClosedDoorRects(engine);
  
  // === MOVEMENT ===
  let dx = 0, dy = 0;
  if (input.isDown('w') || input.isDown('arrowup')) dy -= 1;
  if (input.isDown('s') || input.isDown('arrowdown')) dy += 1;
  if (input.isDown('a') || input.isDown('arrowleft')) dx -= 1;
  if (input.isDown('d') || input.isDown('arrowright')) dx += 1;
  
  moveAvatar(controlled, dx, dy, engine.room.walls, closedDoors);
  
  // === SPLIT (Space) ===
  if (input.wasPressed(' ')) {
    handleSpacePress(engine, controlled, closedDoors);
  }
  
  // === TAB (switch avatar) ===
  if (input.wasPressed('tab') && engine.state.playerState === 'superposed') {
    engine.state.controlledIndex = switchControl(engine.state.avatars);
    audioManager.playSwitch();
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
  if (input.wasPressed('r') && engine.state.playerState === 'superposed') {
    const passive = getPassive(engine);
    if (passive) {
      recallClone(passive, controlled.pos, RECALL_RANGE, engine.room.walls, closedDoors);
      deductCoherence(engine.coherenceState, RECALL_COHERENCE_COST);
      audioManager.playSwitch();
    }
  }
  
  // === E (beacon throw / teleport) ===
  if (input.wasPressed('e')) {
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
  for (const avatar of engine.state.avatars) {
    if (!avatar.alive) continue;
    
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
      if (urgency > 0.5) {
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
    if (door.state === 'superposed') {
      const observed = isDoorObserved(
        door.pos, door.size,
        engine.room.cameras, engine.conePolygons,
        engine.room.walls, closedDoors
      );
      if (observed) {
        collapseDoor(door);
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
    if (door.state === 'superposed') continue; // H-doors managed separately
    
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
    if (hitLaser) {
      handleLaserDeath(engine, avatar);
      break;
    }
  }
  
  // === BEACON UPDATE ===
  if (engine.state.beacon?.active) {
    // Check beacon laser collision (mirror to player)
    const hitLaser = checkLaserCollision(engine.state.beacon.pos, 8, engine.room.lasers);
    if (hitLaser) {
      // Beacon hit -> mirror to player -> death
      engine.state.beacon = null;
      handleLaserDeath(engine, getControlled(engine)!);
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
  }
  
  // === EXIT CHECK ===
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
      if (!exitDoor || exitDoor.state !== 'closed') {
        completeRoom(engine);
      }
    }
  }
}

function handleSpacePress(engine: GameEngine, controlled: Avatar, closedDoors: Rect[]): void {
  // Check if near a panel or switch first
  for (const panel of engine.room.panels) {
    if (canInteractWithPanel(controlled.pos, panel)) {
      const { gateType, linkedIds } = activatePanel(panel);
      handleGateActivation(engine, gateType, linkedIds, panel);
      return;
    }
  }
  
  for (const sw of engine.room.switches) {
    if (canActivateSwitch(controlled.pos, sw) && !sw.latched) {
      activateSwitch(sw);
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
    // Toggle laser group
    for (const id of linkedIds) {
      toggleLaserGroup(engine.room.lasers, id);
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
  if (engine.state.beacon?.active) {
    if (!engine.state.beacon.link.teleporting) {
      // Start teleport
      startTeleport(engine.state.beacon);
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
      audioManager.playSwitch();
      eventBus.emit('beaconThrown', { pos: landing });
    }
  }
}

function executeTeleport(engine: GameEngine): void {
  const controlled = getControlled(engine);
  if (!controlled || !engine.state.beacon) return;
  
  // Move player to beacon position
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

function restartFromCheckpoint(engine: GameEngine): void {
  const cp = engine.state.checkpoint;
  
  // Reset to single avatar at checkpoint
  engine.state.avatars = [createAvatar(0, 0, 'primary', true)];
  engine.state.avatars[0].pos = { ...cp.pos };
  engine.state.controlledIndex = 0;
  engine.state.playerState = 'classical';
  engine.coherenceState.value = cp.coherence;
  engine.state.beacon = null;
  engine.state.collapseFreezeTimer = 0;
  
  // Reset doors to default
  for (const door of engine.room.doors) {
    door.state = door.defaultState;
    door.graceTimer = 0;
  }
  
  // Reset switches
  for (const sw of engine.room.switches) {
    sw.latched = false;
  }
  
  // Reset lasers to default active state
  for (const laser of engine.room.lasers) {
    laser.active = true; // default
    if (laser.sweeping) {
      laser.sweeping.pos = laser.sweeping.min;
      laser.sweeping.direction = 1;
    }
  }
  
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
    audioManager.playCollapseThud();
    eventBus.emit('measured', {});
  } else if (result.type === 'branchPruned') {
    audioManager.playCollapseThud();
    eventBus.emit('branchPruned', {});
  } else if (result.type === 'forcedCoherence') {
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
  const newEngine = createGameEngine(engine.room, engine.debugMode);
  Object.assign(engine, newEngine);
  engine.screen = 'playing';
}
