// World: tile grid, collision detection, wall management
import { TILE_SIZE, GRID_COLS, GRID_ROWS, PLAYER_RADIUS } from '../core/constants';
import { Vec2, Rect } from './types';

/** Check if a tile position is a wall */
export function isWallTile(col: number, row: number, walls: Rect[]): boolean {
  // Outer ring is always wall
  if (col <= 0 || col >= GRID_COLS - 1 || row <= 0 || row >= GRID_ROWS - 1) return true;
  for (const w of walls) {
    if (col >= w.x && col < w.x + w.w && row >= w.y && row < w.y + w.h) return true;
  }
  return false;
}

/** Convert tile coords to pixel center */
export function tileToPixel(col: number, row: number): Vec2 {
  return { x: (col + 0.5) * TILE_SIZE, y: (row + 0.5) * TILE_SIZE };
}

/** Convert pixel coords to tile coords (floor) */
export function pixelToTile(px: number, py: number): Vec2 {
  return { x: Math.floor(px / TILE_SIZE), y: Math.floor(py / TILE_SIZE) };
}

/** Get pixel rect for a wall tile rect */
export function wallRectToPixels(r: Rect): { x: number; y: number; w: number; h: number } {
  return {
    x: r.x * TILE_SIZE,
    y: r.y * TILE_SIZE,
    w: r.w * TILE_SIZE,
    h: r.h * TILE_SIZE,
  };
}

/** Circle-AABB collision. Returns push vector or null. */
export function circleAABB(
  cx: number, cy: number, cr: number,
  rx: number, ry: number, rw: number, rh: number
): Vec2 | null {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX;
  const dy = cy - nearY;
  const distSq = dx * dx + dy * dy;
  if (distSq >= cr * cr) return null;
  if (distSq === 0) return { x: cr, y: 0 }; // inside, push right
  const dist = Math.sqrt(distSq);
  const overlap = cr - dist;
  return { x: (dx / dist) * overlap, y: (dy / dist) * overlap };
}

/** Build a set of all wall tile rects including outer ring + room walls + closed doors */
export function getCollisionRects(walls: Rect[], closedDoorRects: Rect[]): Rect[] {
  const rects: Rect[] = [];
  
  // Outer ring
  // Top row
  rects.push({ x: 0, y: 0, w: GRID_COLS, h: 1 });
  // Bottom row
  rects.push({ x: 0, y: GRID_ROWS - 1, w: GRID_COLS, h: 1 });
  // Left col (excluding corners)
  rects.push({ x: 0, y: 1, w: 1, h: GRID_ROWS - 2 });
  // Right col
  rects.push({ x: GRID_COLS - 1, y: 1, w: 1, h: GRID_ROWS - 2 });
  
  // Room walls
  for (const w of walls) rects.push(w);
  
  // Closed doors as walls
  for (const d of closedDoorRects) rects.push(d);
  
  return rects;
}

/** Resolve avatar circle collider against all wall rects. Mutates pos. */
export function resolveCollisions(
  pos: Vec2, radiusTiles: number, walls: Rect[], closedDoorRects: Rect[]
): void {
  const radiusPx = radiusTiles * TILE_SIZE;
  const allRects = getCollisionRects(walls, closedDoorRects);
  
  // Multiple iterations for corner cases
  for (let iter = 0; iter < 4; iter++) {
    let pushed = false;
    for (const r of allRects) {
      const pr = wallRectToPixels(r);
      const push = circleAABB(pos.x, pos.y, radiusPx, pr.x, pr.y, pr.w, pr.h);
      if (push) {
        pos.x += push.x;
        pos.y += push.y;
        pushed = true;
      }
    }
    if (!pushed) break;
  }
}

/** Raycast from origin in direction, return hit distance in pixels or maxDist */
export function raycast(
  ox: number, oy: number,
  dx: number, dy: number,
  maxDist: number,
  walls: Rect[],
  closedDoorRects: Rect[]
): number {
  const allRects = getCollisionRects(walls, closedDoorRects);
  let minDist = maxDist;
  const step = TILE_SIZE * 0.25; // quarter-tile precision
  
  // Use DDA-like stepping
  for (let t = 0; t < maxDist; t += step) {
    const px = ox + dx * t;
    const py = oy + dy * t;
    const tc = Math.floor(px / TILE_SIZE);
    const tr = Math.floor(py / TILE_SIZE);
    
    for (const r of allRects) {
      if (tc >= r.x && tc < r.x + r.w && tr >= r.y && tr < r.y + r.h) {
        minDist = Math.min(minDist, t);
        return minDist;
      }
    }
  }
  return minDist;
}

/** Proper raycast against AABBs, returns exact intersection distance */
export function raycastAABB(
  ox: number, oy: number,
  dx: number, dy: number,
  maxDist: number,
  walls: Rect[],
  closedDoorRects: Rect[]
): number {
  const allRects = getCollisionRects(walls, closedDoorRects);
  let minT = maxDist;
  
  for (const r of allRects) {
    const pr = wallRectToPixels(r);
    const t = rayAABBIntersect(ox, oy, dx, dy, pr.x, pr.y, pr.w, pr.h);
    if (t !== null && t < minT && t >= 0) {
      minT = t;
    }
  }
  return minT;
}

function rayAABBIntersect(
  ox: number, oy: number, dx: number, dy: number,
  rx: number, ry: number, rw: number, rh: number
): number | null {
  let tmin = -Infinity;
  let tmax = Infinity;
  
  if (dx !== 0) {
    const t1 = (rx - ox) / dx;
    const t2 = (rx + rw - ox) / dx;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  } else {
    if (ox < rx || ox > rx + rw) return null;
  }
  
  if (dy !== 0) {
    const t1 = (ry - oy) / dy;
    const t2 = (ry + rh - oy) / dy;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  } else {
    if (oy < ry || oy > ry + rh) return null;
  }
  
  if (tmax < 0 || tmin > tmax) return null;
  return tmin >= 0 ? tmin : tmax >= 0 ? 0 : null;
}

/** Merge adjacent wall rects into outline polygons for rendering */
export function mergeWallOutlines(walls: Rect[]): Rect[] {
  // For now, return as-is. Rendering draws each rect as a glow outline.
  // Merging into complex polygons is a stretch goal.
  return walls;
}

/** Line of sight check: is the path from (ax,ay) to (bx,by) clear of walls? */
export function hasLineOfSight(
  ax: number, ay: number,
  bx: number, by: number,
  walls: Rect[],
  closedDoorRects: Rect[]
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return true;
  const ndx = dx / dist;
  const ndy = dy / dist;
  const hitDist = raycastAABB(ax, ay, ndx, ndy, dist, walls, closedDoorRects);
  return hitDist >= dist - 1; // 1px tolerance
}
