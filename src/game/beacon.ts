// Beacon and teleport system
import { TILE_SIZE, BEACON_RANGE, BEACON_AIM_ANGLE, TELEPORT_DELAY } from '../core/constants';
import { Beacon, Vec2, Rect, BeaconTarget } from './types';
import { raycastAABB } from './world';

const DEG_TO_RAD = Math.PI / 180;

/** Create a new beacon at position */
export function createBeacon(pos: Vec2): Beacon {
  return {
    pos: { x: pos.x, y: pos.y },
    active: true,
    link: {
      teleporting: false,
      teleportTimer: 0,
      classicalBitsPulse: 0,
    },
  };
}

/**
 * Calculate beacon landing position.
 * Uses aim assist: if beaconTarget is within 35 deg and four tiles and path is clear,
 * lands exactly on that tile. Otherwise lands on last free tile before a wall.
 */
export function calculateBeaconLanding(
  originPx: Vec2,
  facingDir: Vec2,
  beaconTarget: BeaconTarget | undefined,
  walls: Rect[],
  closedDoorRects: Rect[]
): Vec2 | null {
  const rangePx = BEACON_RANGE * TILE_SIZE;
  
  // Check aim assist first
  if (beaconTarget) {
    const targetPx = {
      x: (beaconTarget.pos.x + 0.5) * TILE_SIZE,
      y: (beaconTarget.pos.y + 0.5) * TILE_SIZE,
    };
    const toTarget = {
      x: targetPx.x - originPx.x,
      y: targetPx.y - originPx.y,
    };
    const dist = Math.sqrt(toTarget.x * toTarget.x + toTarget.y * toTarget.y);
    
    if (dist <= rangePx && dist > 0) {
      // Check angle
      const facingAngle = Math.atan2(facingDir.y, facingDir.x);
      const targetAngle = Math.atan2(toTarget.y, toTarget.x);
      let angleDiff = Math.abs(targetAngle - facingAngle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
      
      if (angleDiff <= BEACON_AIM_ANGLE * DEG_TO_RAD) {
        // Check path is clear
        const ndx = toTarget.x / dist;
        const ndy = toTarget.y / dist;
        const hitDist = raycastAABB(originPx.x, originPx.y, ndx, ndy, dist, walls, closedDoorRects);
        
        if (hitDist >= dist - 4) { // 4px tolerance
          return targetPx;
        }
      }
    }
  }
  
  // No aim assist: throw in facing direction, land on last free tile before wall
  const ndx = facingDir.x;
  const ndy = facingDir.y;
  const mag = Math.sqrt(ndx * ndx + ndy * ndy);
  if (mag === 0) return null;
  
  const dx = ndx / mag;
  const dy = ndy / mag;
  
  const hitDist = raycastAABB(originPx.x, originPx.y, dx, dy, rangePx, walls, closedDoorRects);
  
  // Back off by half a tile from the wall
  const landDist = Math.max(0, hitDist - TILE_SIZE * 0.5);
  // A blocked throw must fail clearly; silently placing the receiver at the
  // cat's feet looks like a broken teleport and can trap the player in a loop.
  if (landDist < TILE_SIZE * 0.25) return null;
  
  return {
    x: originPx.x + dx * landDist,
    y: originPx.y + dy * landDist,
  };
}

/** Start teleport sequence */
export function startTeleport(beacon: Beacon): void {
  beacon.link.teleporting = true;
  beacon.link.teleportTimer = TELEPORT_DELAY;
  beacon.link.classicalBitsPulse = 0;
}

/** Update teleport timer. Returns true when teleport should execute. */
export function updateTeleport(beacon: Beacon, dt: number): boolean {
  if (!beacon.link.teleporting) return false;
  
  beacon.link.teleportTimer -= dt;
  beacon.link.classicalBitsPulse = 1 - (beacon.link.teleportTimer / TELEPORT_DELAY);
  
  if (beacon.link.teleportTimer <= 0) {
    return true; // Execute teleport
  }
  return false;
}

/** Check if a position (in pixels) collides with any active laser */
export function isPositionInLaser(
  pos: Vec2,
  laserStart: Vec2,
  laserEnd: Vec2,
  threshold: number // pixels
): boolean {
  // Point-to-line-segment distance
  const dx = laserEnd.x - laserStart.x;
  const dy = laserEnd.y - laserStart.y;
  const lenSq = dx * dx + dy * dy;
  
  if (lenSq === 0) {
    const d = Math.sqrt((pos.x - laserStart.x) ** 2 + (pos.y - laserStart.y) ** 2);
    return d < threshold;
  }
  
  let t = ((pos.x - laserStart.x) * dx + (pos.y - laserStart.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  
  const nearX = laserStart.x + t * dx;
  const nearY = laserStart.y + t * dy;
  const dist = Math.sqrt((pos.x - nearX) ** 2 + (pos.y - nearY) ** 2);
  
  return dist < threshold;
}

/** Destroy beacon and return null */
export function destroyBeacon(): null {
  return null;
}
