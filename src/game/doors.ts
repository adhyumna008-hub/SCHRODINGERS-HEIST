// Door, panel, plate, switch, laser systems
import { TILE_SIZE, DOOR_GRACE_PERIOD } from '../core/constants';
import { QuantumState } from './quantum';
import { Door, Panel, PressurePlate, Switch, Laser, Vec2, DoorState, Rect } from './types';

// ============ DOORS ============

export function createDoor(
  id: string,
  x: number, y: number,
  w: number, h: number,
  inputs: string[],
  inputType: 'all' | 'any' = 'all',
  isExit: boolean = false,
  defaultState: DoorState = 'closed'
): Door {
  return {
    id, pos: { x, y }, size: { x: w, y: h },
    state: defaultState, defaultState,
    inputs, inputType,
    graceTimer: 0, isExit,
  };
}

/** Get the door rect in tile coordinates for collision */
export function getDoorCollisionRect(door: Door): Rect | null {
  if (door.state === 'closed') {
    return { x: door.pos.x, y: door.pos.y, w: door.size.x, h: door.size.y };
  }
  return null; // open or superposed doors don't block
}

/** Update door state based on its inputs being satisfied */
export function updateDoor(
  door: Door,
  inputsSatisfied: boolean,
  dt: number
): void {
  if (door.state === 'superposed') {
    // H-door: don't change via normal input logic
    return;
  }
  
  if (inputsSatisfied) {
    door.state = 'open';
    door.graceTimer = DOOR_GRACE_PERIOD;
  } else if (door.graceTimer > 0) {
    door.graceTimer -= dt;
    if (door.graceTimer <= 0) {
      door.state = 'closed';
      door.graceTimer = 0;
    }
  } else if (door.state === 'open') {
    door.state = 'closed';
  }
}

/** Set a door to superposed state (H-gate) */
export function superposeDoor(door: Door): void {
  if (door.observedLock) { door.quantum = new QuantumState(); door.observedLock = false; }
  door.quantum ??= new QuantumState(door.state === 'open' ? [0,1] : [1,0]);
  door.quantum.apply(QuantumState.H);
  door.state = door.quantum.probability(0) > 1-1e-8 ? 'closed' : door.quantum.probability(1) > 1-1e-8 ? 'open' : 'superposed';
}

/** Collapse a superposed door to closed */
export function collapseDoor(door: Door, random = Math.random): void {
  if (door.state === 'superposed') {
    door.quantum ??= new QuantumState().apply(QuantumState.H);
    door.state = door.quantum.measure(random) === 0 ? 'closed' : 'open';
  }
}

// ============ PANELS ============

export function createPanel(
  x: number, y: number,
  gateType: 'X' | 'H',
  linkedIds: string[],
  interactRadius: number = 1.2
): Panel {
  return {
    pos: { x, y },
    gateType,
    linkedIds,
    interactRadius,
    activationCount: 0,
  };
}

/** Check if avatar is close enough to interact with panel */
export function canInteractWithPanel(avatarPosPx: Vec2, panel: Panel): boolean {
  const panelPx = {
    x: (panel.pos.x + 0.5) * TILE_SIZE,
    y: (panel.pos.y + 0.5) * TILE_SIZE,
  };
  const dx = avatarPosPx.x - panelPx.x;
  const dy = avatarPosPx.y - panelPx.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist <= panel.interactRadius * TILE_SIZE;
}

/** Activate a panel. Returns the gate type for the caller to handle. */
export function activatePanel(panel: Panel): { gateType: 'X' | 'H'; linkedIds: string[] } {
  panel.activationCount++;
  return { gateType: panel.gateType, linkedIds: panel.linkedIds };
}

// ============ PRESSURE PLATES ============

export function createPressurePlate(x: number, y: number, linkedIds: string[]): PressurePlate {
  return { pos: { x, y }, linkedIds, active: false };
}

/** Check if any avatar is standing on the plate */
export function updatePressurePlate(plate: PressurePlate, avatarPositions: Vec2[]): void {
  const platePx = {
    x: (plate.pos.x + 0.5) * TILE_SIZE,
    y: (plate.pos.y + 0.5) * TILE_SIZE,
  };
  const threshold = TILE_SIZE * 0.6;
  
  plate.active = avatarPositions.some(pos => {
    const dx = Math.abs(pos.x - platePx.x);
    const dy = Math.abs(pos.y - platePx.y);
    return dx < threshold && dy < threshold;
  });
}

// ============ SWITCHES ============

export function createSwitch(x: number, y: number, linkedIds: string[]): Switch {
  return { pos: { x, y }, linkedIds, latched: false };
}

/** Check if avatar can activate switch */
export function canActivateSwitch(avatarPosPx: Vec2, sw: Switch): boolean {
  const swPx = {
    x: (sw.pos.x + 0.5) * TILE_SIZE,
    y: (sw.pos.y + 0.5) * TILE_SIZE,
  };
  const dx = avatarPosPx.x - swPx.x;
  const dy = avatarPosPx.y - swPx.y;
  return Math.sqrt(dx * dx + dy * dy) <= TILE_SIZE * 1.2;
}

/** Toggle switch latch */
export function activateSwitch(sw: Switch): void {
  if (!sw.latched) sw.latched = true;
}

// ============ LASERS ============

export function createLaser(
  id: string,
  group: string,
  startX: number, startY: number,
  endX: number, endY: number,
  active: boolean = true
): Laser {
  return {
    id, group,
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
    active,
  };
}

export function createSweepingLaser(
  id: string, group: string,
  axis: 'x' | 'y',
  fixedCoord: number,
  min: number, max: number,
  speed: number,
  perpStart: number, perpEnd: number,
  active: boolean = true
): Laser {
  const laser: Laser = {
    id, group, active,
    start: axis === 'x' 
      ? { x: min, y: perpStart }
      : { x: perpStart, y: min },
    end: axis === 'x'
      ? { x: min, y: perpEnd }
      : { x: perpEnd, y: min },
    sweeping: {
      axis, min, max, speed, pos: min, direction: 1,
    },
  };
  return laser;
}

/** Update sweeping laser position */
export function updateSweepingLaser(laser: Laser, dt: number): void {
  if (!laser.sweeping || !laser.active) return;
  const s = laser.sweeping;
  s.pos += s.speed * s.direction * dt;
  
  if (s.pos >= s.max) {
    s.pos = s.max;
    s.direction = -1;
  } else if (s.pos <= s.min) {
    s.pos = s.min;
    s.direction = 1;
  }
  
  // Update laser positions
  if (s.axis === 'x') {
    laser.start.x = s.pos;
    laser.end.x = s.pos;
  } else {
    laser.start.y = s.pos;
    laser.end.y = s.pos;
  }
}

/** Get laser line in pixel coords */
export function getLaserPixelCoords(laser: Laser): { start: Vec2; end: Vec2 } {
  return {
    start: {
      x: (laser.start.x + 0.5) * TILE_SIZE,
      y: (laser.start.y + 0.5) * TILE_SIZE,
    },
    end: {
      x: (laser.end.x + 0.5) * TILE_SIZE,
      y: (laser.end.y + 0.5) * TILE_SIZE,
    },
  };
}

/** Toggle all lasers in a group */
export function toggleLaserGroup(lasers: Laser[], group: string): void {
  for (const l of lasers) {
    if (l.group === group) {
      l.active = !l.active;
    }
  }
}

/** Check if an avatar circle hits any active laser in pixel space */
export function checkLaserCollision(
  avatarPos: Vec2,
  avatarRadius: number, // pixels
  lasers: Laser[]
): Laser | null {
  for (const laser of lasers) {
    if (!laser.active) continue;
    const lp = getLaserPixelCoords(laser);
    
    // Point-to-segment distance
    const dx = lp.end.x - lp.start.x;
    const dy = lp.end.y - lp.start.y;
    const lenSq = dx * dx + dy * dy;
    
    let t: number;
    if (lenSq === 0) {
      t = 0;
    } else {
      t = Math.max(0, Math.min(1,
        ((avatarPos.x - lp.start.x) * dx + (avatarPos.y - lp.start.y) * dy) / lenSq
      ));
    }
    
    const nearX = lp.start.x + t * dx;
    const nearY = lp.start.y + t * dy;
    const dist = Math.sqrt((avatarPos.x - nearX) ** 2 + (avatarPos.y - nearY) ** 2);
    
    if (dist < avatarRadius + 4) { // 4px laser thickness
      return laser;
    }
  }
  return null;
}
