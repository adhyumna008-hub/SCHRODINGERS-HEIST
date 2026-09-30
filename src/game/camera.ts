// Security camera system: cone generation, detection, sweep, lock-on
import { TILE_SIZE } from '../core/constants';
import { SecurityCamera, Vec2, Rect } from './types';
import { raycastAABB } from './world';

const NUM_RAYS = 24;
const DEG_TO_RAD = Math.PI / 180;

/** Update camera sweep angle */
export function updateCameraAngle(cam: SecurityCamera, time: number): void {
  if (cam.lockOn.active) {
    // During lock-on, point at the lock target
    const dx = cam.lockOn.targetPos.x - cam.pos.x;
    const dy = cam.lockOn.targetPos.y - cam.pos.y;
    cam.currentAngle = Math.atan2(dy, dx) / DEG_TO_RAD;
    cam.lockOn.timer -= 1 / 60;
    if (cam.lockOn.timer <= 0) {
      cam.lockOn.active = false;
    }
    return;
  }
  cam.currentAngle = cam.baseAngle + cam.amplitude * Math.sin(2 * Math.PI * time / cam.period);
}

/** Generate the vision cone polygon from raycasts */
export function generateConePolygon(
  cam: SecurityCamera,
  walls: Rect[],
  closedDoorRects: Rect[]
): Vec2[] {
  const originPx = {
    x: (cam.pos.x + 0.5) * TILE_SIZE,
    y: (cam.pos.y + 0.5) * TILE_SIZE,
  };
  const rangePx = cam.range * TILE_SIZE;
  const centerAngleRad = cam.currentAngle * DEG_TO_RAD;
  const halfAngleRad = cam.halfAngle * DEG_TO_RAD;
  
  const points: Vec2[] = [{ x: originPx.x, y: originPx.y }];
  
  for (let i = 0; i <= NUM_RAYS; i++) {
    const frac = i / NUM_RAYS;
    const angle = centerAngleRad - halfAngleRad + frac * 2 * halfAngleRad;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    
    const hitDist = raycastAABB(originPx.x, originPx.y, dx, dy, rangePx, walls, closedDoorRects);
    
    points.push({
      x: originPx.x + dx * hitDist,
      y: originPx.y + dy * hitDist,
    });
  }
  
  return points;
}

/** Check if an avatar circle intersects the cone polygon AND has line of sight */
export function isAvatarInCone(
  avatarPos: Vec2,   // pixel coords
  avatarRadius: number, // pixels
  conePolygon: Vec2[],
  cameraOrigin: Vec2,  // pixel coords of camera
  walls: Rect[],
  closedDoorRects: Rect[]
): boolean {
  // First check: is the avatar center inside the cone polygon?
  if (!pointInPolygon(avatarPos, conePolygon)) {
    // Also check if any point on the circle intersects
    // Simple: check center + 4 cardinal points
    const offsets = [
      { x: avatarRadius, y: 0 },
      { x: -avatarRadius, y: 0 },
      { x: 0, y: avatarRadius },
      { x: 0, y: -avatarRadius },
    ];
    let anyInside = false;
    for (const off of offsets) {
      if (pointInPolygon({ x: avatarPos.x + off.x, y: avatarPos.y + off.y }, conePolygon)) {
        anyInside = true;
        break;
      }
    }
    if (!anyInside) return false;
  }
  
  // Second check: line of sight from camera to avatar center
  const dx = avatarPos.x - cameraOrigin.x;
  const dy = avatarPos.y - cameraOrigin.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return true;
  const ndx = dx / dist;
  const ndy = dy / dist;
  const hitDist = raycastAABB(cameraOrigin.x, cameraOrigin.y, ndx, ndy, dist, walls, closedDoorRects);
  
  return hitDist >= dist - 2; // 2px tolerance
}

/** Point-in-polygon (ray casting algorithm) */
export function pointInPolygon(p: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if (((yi > p.y) !== (yj > p.y)) &&
        (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/** Check if a door rect is observed by any camera cone */
export function isDoorObserved(
  doorPos: Vec2,
  doorSize: Vec2,
  cameras: SecurityCamera[],
  conePolygons: Vec2[][],
  walls: Rect[],
  closedDoorRects: Rect[]
): boolean {
  // Check if any point of the door is in any cone
  const doorCenterPx = {
    x: (doorPos.x + doorSize.x / 2) * TILE_SIZE,
    y: (doorPos.y + doorSize.y / 2) * TILE_SIZE,
  };
  
  for (let c = 0; c < cameras.length; c++) {
    if (pointInPolygon(doorCenterPx, conePolygons[c])) {
      // Verify LOS
      const camOrigin = {
        x: (cameras[c].pos.x + 0.5) * TILE_SIZE,
        y: (cameras[c].pos.y + 0.5) * TILE_SIZE,
      };
      const dx = doorCenterPx.x - camOrigin.x;
      const dy = doorCenterPx.y - camOrigin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 2) return true;
      const ndx = dx / dist;
      const ndy = dy / dist;
      const hitDist = raycastAABB(camOrigin.x, camOrigin.y, ndx, ndy, dist, walls, closedDoorRects);
      if (hitDist >= dist - 2) return true;
    }
  }
  return false;
}

/** Start lock-on: camera rotates to target and holds */
export function startLockOn(cam: SecurityCamera, targetPos: Vec2, duration: number): void {
  cam.lockOn.active = true;
  cam.lockOn.targetPos = { ...targetPos };
  cam.lockOn.timer = duration;
}

/** Create a default security camera */
export function createCamera(
  posX: number, posY: number,
  baseAngle: number,
  amplitude: number,
  period: number,
  halfAngle: number,
  range: number
): SecurityCamera {
  return {
    pos: { x: posX, y: posY },
    baseAngle,
    amplitude,
    period,
    halfAngle,
    range,
    currentAngle: baseAngle,
    lockOn: { active: false, targetPos: { x: 0, y: 0 }, timer: 0 },
  };
}
