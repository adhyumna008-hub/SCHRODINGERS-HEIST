// Avatar system: movement, split, tab, decohere, collapse
import { TILE_SIZE, PLAYER_SPEED, PLAYER_RADIUS, FIXED_DT } from '../core/constants';
import { Avatar, Vec2, Rect } from './types';
import { resolveCollisions } from './world';

/** Create a new avatar at tile position */
export function createAvatar(tileX: number, tileY: number, role: 'primary' | 'clone', isControlled: boolean): Avatar {
  return {
    pos: {
      x: (tileX + 0.5) * TILE_SIZE,
      y: (tileY + 0.5) * TILE_SIZE,
    },
    vel: { x: 0, y: 0 },
    role,
    isControlled,
    warning: {
      state: 'none',
      timer: 0,
      maxTime: 0,
      sourceCamera: -1,
    },
    facingDir: { x: 1, y: 0 },
    alive: true,
  };
}

/** Update avatar movement with input */
export function moveAvatar(
  avatar: Avatar,
  inputDx: number,
  inputDy: number,
  walls: Rect[],
  closedDoorRects: Rect[]
): void {
  if (!avatar.alive || !avatar.isControlled) return;
  
  // Normalize diagonal
  let dx = inputDx;
  let dy = inputDy;
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag > 0) {
    dx /= mag;
    dy /= mag;
    // Update facing direction
    avatar.facingDir = { x: dx, y: dy };
  }
  
  const speed = PLAYER_SPEED * TILE_SIZE; // px/s
  avatar.vel.x = dx * speed;
  avatar.vel.y = dy * speed;
  
  // Apply velocity
  avatar.pos.x += avatar.vel.x * FIXED_DT;
  avatar.pos.y += avatar.vel.y * FIXED_DT;
  
  // Resolve collisions
  resolveCollisions(avatar.pos, PLAYER_RADIUS, walls, closedDoorRects);
}

/** Clone spawn: create a clone at the same position as the source */
export function spawnClone(source: Avatar): Avatar {
  return createAvatar(0, 0, 'clone', false);
  // Position will be set to source's pixel position
}

export function spawnCloneAtPosition(pos: Vec2): Avatar {
  const clone: Avatar = {
    pos: { x: pos.x, y: pos.y },
    vel: { x: 0, y: 0 },
    role: 'clone',
    isControlled: false,
    warning: {
      state: 'none',
      timer: 0,
      maxTime: 0,
      sourceCamera: -1,
    },
    facingDir: { x: 1, y: 0 },
    alive: true,
  };
  return clone;
}

/** Switch control between two avatars */
export function switchControl(avatars: Avatar[]): number {
  const current = avatars.findIndex(a => a.isControlled);
  if (current === -1 || avatars.length < 2) return current;
  
  const next = (current + 1) % avatars.length;
  avatars[current].isControlled = false;
  avatars[next].isControlled = true;
  return next;
}

/** Start a warning on an avatar */
export function startWarning(avatar: Avatar, maxTime: number, cameraIndex: number): void {
  if (avatar.warning.state === 'active') return;
  avatar.warning.state = 'active';
  avatar.warning.timer = maxTime;
  avatar.warning.maxTime = maxTime;
  avatar.warning.sourceCamera = cameraIndex;
}

/** Cancel a warning */
export function cancelWarning(avatar: Avatar): void {
  avatar.warning.state = 'none';
  avatar.warning.timer = 0;
  avatar.warning.sourceCamera = -1;
}

/** Update warning timer, returns true if expired */
export function updateWarning(avatar: Avatar, dt: number): boolean {
  if (avatar.warning.state !== 'active') return false;
  avatar.warning.timer -= dt;
  if (avatar.warning.timer <= 0) {
    avatar.warning.state = 'expired';
    return true;
  }
  return false;
}

/** Get warning urgency 0-1 (1 = about to expire) */
export function getWarningUrgency(avatar: Avatar): number {
  if (avatar.warning.state !== 'active') return 0;
  return 1 - (avatar.warning.timer / avatar.warning.maxTime);
}

/** Recall: move passive clone toward controlled avatar */
export function recallClone(
  clone: Avatar,
  controlledPos: Vec2,
  maxRange: number, // tiles
  walls: Rect[],
  closedDoorRects: Rect[]
): boolean {
  const rangePx = maxRange * TILE_SIZE;
  const dx = controlledPos.x - clone.pos.x;
  const dy = controlledPos.y - clone.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist < 1) return false;
  
  const moveDist = Math.min(dist, rangePx);
  const ndx = dx / dist;
  const ndy = dy / dist;
  
  const before = { ...clone.pos };
  // Sweep in small increments: recall must never jump through solid cover.
  for (let moved=0;moved<moveDist;moved+=4) {
    const step=Math.min(4,moveDist-moved),prev={...clone.pos};
    clone.pos.x+=ndx*step; clone.pos.y+=ndy*step;
    resolveCollisions(clone.pos, PLAYER_RADIUS, walls, closedDoorRects);
    if(Math.hypot(clone.pos.x-prev.x,clone.pos.y-prev.y)<step*.5)break;
  }
  return Math.hypot(clone.pos.x-before.x,clone.pos.y-before.y)>1;
}

/** Get distance between two avatars in tiles */
export function avatarDistanceTiles(a: Avatar, b: Avatar): number {
  const dx = a.pos.x - b.pos.x;
  const dy = a.pos.y - b.pos.y;
  return Math.sqrt(dx * dx + dy * dy) / TILE_SIZE;
}
