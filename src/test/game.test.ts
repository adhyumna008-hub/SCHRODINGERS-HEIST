// Unit tests for core game systems
import { describe, it, expect } from 'vitest';

// === COHERENCE TESTS ===
import {
  createCoherenceState,
  updateCoherence,
  deductCoherence,
  applyRegenLockout,
  getCoherenceFraction,
  getCoherenceThreshold,
} from '../game/coherence';

describe('Coherence', () => {
  it('starts at max (100)', () => {
    const state = createCoherenceState();
    expect(state.value).toBe(100);
  });

  it('drains at 8/s when active', () => {
    const state = createCoherenceState();
    updateCoherence(state, 1.0, true); // 1 second drain
    expect(state.value).toBeCloseTo(92, 1);
  });

  it('regens at 4/s when not draining', () => {
    const state = createCoherenceState();
    state.value = 50;
    updateCoherence(state, 1.0, false);
    expect(state.value).toBeCloseTo(54, 1);
  });

  it('clamps to 0-100', () => {
    const state = createCoherenceState();
    state.value = 2;
    updateCoherence(state, 1.0, true);
    expect(state.value).toBe(0);

    const state2 = createCoherenceState();
    state2.value = 99;
    updateCoherence(state2, 1.0, false);
    expect(state2.value).toBe(100);
  });

  it('regen lockout prevents regen for 3s', () => {
    const state = createCoherenceState();
    state.value = 50;
    applyRegenLockout(state);
    updateCoherence(state, 1.0, false);
    expect(state.value).toBe(50); // no regen during lockout
    
    updateCoherence(state, 2.0, false); // 3s total lockout
    expect(state.value).toBe(50); // still locked
    
    updateCoherence(state, 0.5, false); // lockout expired
    expect(state.value).toBeCloseTo(52, 1);
  });

  it('threshold levels are correct', () => {
    const state = createCoherenceState();
    state.value = 80;
    expect(getCoherenceThreshold(state)).toBe(0); // normal

    state.value = 55;
    expect(getCoherenceThreshold(state)).toBe(1); // light static

    state.value = 25;
    expect(getCoherenceThreshold(state)).toBe(2); // desat

    state.value = 5;
    expect(getCoherenceThreshold(state)).toBe(3); // heavy
  });

  it('deduction works', () => {
    const state = createCoherenceState();
    deductCoherence(state, 15);
    expect(state.value).toBe(85);
  });

  it('fraction returns 0-1', () => {
    const state = createCoherenceState();
    expect(getCoherenceFraction(state)).toBe(1);
    state.value = 50;
    expect(getCoherenceFraction(state)).toBe(0.5);
  });
});

// === X GATE INVOLUTION ===
import { toggleLaserGroup } from '../game/doors';
import { Laser } from '../game/types';

describe('X Gate Involution', () => {
  it('X applied once toggles lasers off', () => {
    const lasers: Laser[] = [
      { id: 'l1', group: 'L1', start: { x: 0, y: 0 }, end: { x: 0, y: 10 }, active: true },
      { id: 'l2', group: 'L1', start: { x: 1, y: 0 }, end: { x: 1, y: 10 }, active: true },
    ];
    toggleLaserGroup(lasers, 'L1');
    expect(lasers[0].active).toBe(false);
    expect(lasers[1].active).toBe(false);
  });

  it('X applied twice restores original (X² = I)', () => {
    const lasers: Laser[] = [
      { id: 'l1', group: 'L1', start: { x: 0, y: 0 }, end: { x: 0, y: 10 }, active: true },
    ];
    toggleLaserGroup(lasers, 'L1'); // off
    toggleLaserGroup(lasers, 'L1'); // on again
    expect(lasers[0].active).toBe(true);
  });

  it('only toggles the specified group', () => {
    const lasers: Laser[] = [
      { id: 'l1', group: 'L1', start: { x: 0, y: 0 }, end: { x: 0, y: 10 }, active: true },
      { id: 'l2', group: 'L2', start: { x: 1, y: 0 }, end: { x: 1, y: 10 }, active: true },
    ];
    toggleLaserGroup(lasers, 'L1');
    expect(lasers[0].active).toBe(false);
    expect(lasers[1].active).toBe(true);
  });
});

// === WARNING TIMERS ===
import { createAvatar, startWarning, cancelWarning, updateWarning, getWarningUrgency } from '../game/avatar';

describe('Warning Timers', () => {
  it('controlled avatar has 0.5s warning', () => {
    const avatar = createAvatar(5, 5, 'primary', true);
    startWarning(avatar, 0.5, 0);
    expect(avatar.warning.state).toBe('active');
    expect(avatar.warning.maxTime).toBe(0.5);
  });

  it('passive clone has 1.75s warning', () => {
    const avatar = createAvatar(5, 5, 'clone', false);
    startWarning(avatar, 1.75, 0);
    expect(avatar.warning.state).toBe('active');
    expect(avatar.warning.maxTime).toBe(1.75);
  });

  it('warning expires after timer runs out', () => {
    const avatar = createAvatar(5, 5, 'primary', true);
    startWarning(avatar, 0.5, 0);
    const expired = updateWarning(avatar, 0.5);
    expect(expired).toBe(true);
    expect(avatar.warning.state).toBe('expired');
  });

  it('warning can be cancelled (escaped)', () => {
    const avatar = createAvatar(5, 5, 'primary', true);
    startWarning(avatar, 0.5, 0);
    cancelWarning(avatar);
    expect(avatar.warning.state).toBe('none');
  });

  it('urgency goes from 0 to 1 as timer depletes', () => {
    const avatar = createAvatar(5, 5, 'primary', true);
    startWarning(avatar, 1.0, 0);
    expect(getWarningUrgency(avatar)).toBeCloseTo(0, 1);
    
    updateWarning(avatar, 0.5);
    expect(getWarningUrgency(avatar)).toBeCloseTo(0.5, 1);
  });
});

// === COLLAPSE TABLE ===
import { performCollapse, isMeasuredEvent, shouldMoveCheckpoint } from '../game/collapse';
import { SecurityCamera } from '../game/types';

describe('Collapse Rules', () => {
  const makeCam = (): SecurityCamera => ({
    pos: { x: 5, y: 0 },
    baseAngle: 90, amplitude: 40, period: 4, halfAngle: 20, range: 9,
    currentAngle: 90,
    lockOn: { active: false, targetPos: { x: 0, y: 0 }, timer: 0 },
  });

  it('controlled avatar seen = MEASURED, checkpoint moves', () => {
    const controlled = createAvatar(5, 5, 'primary', true);
    const clone = createAvatar(3, 3, 'clone', false);
    const coh = createCoherenceState();
    const result = performCollapse(controlled, controlled, [controlled, clone], [makeCam()], coh);
    
    expect(result.type).toBe('measured');
    expect(isMeasuredEvent(result)).toBe(true);
    expect(shouldMoveCheckpoint(result)).toBe(true);
    expect(clone.alive).toBe(false);
  });

  it('passive clone seen (bait) = BRANCH PRUNED, -15 coherence', () => {
    const controlled = createAvatar(5, 5, 'primary', true);
    const clone = createAvatar(3, 3, 'clone', false);
    clone.warning.sourceCamera = 0;
    const coh = createCoherenceState();
    const result = performCollapse(controlled, clone, [controlled, clone], [makeCam()], coh);
    
    expect(result.type).toBe('branchPruned');
    expect(isMeasuredEvent(result)).toBe(false);
    expect(result.coherenceCost).toBe(15);
    expect(coh.value).toBe(85);
    expect(clone.alive).toBe(false);
  });

  it('voluntary decohere (Q) = no penalty, no MEASURED', () => {
    const controlled = createAvatar(5, 5, 'primary', true);
    const clone = createAvatar(3, 3, 'clone', false);
    const coh = createCoherenceState();
    const result = performCollapse(controlled, null, [controlled, clone], [], coh);
    
    expect(result.type).toBe('voluntary');
    expect(isMeasuredEvent(result)).toBe(false);
    expect(result.freezeTime).toBe(0);
  });

  it('forced coherence collapse = regen lockout', () => {
    const controlled = createAvatar(5, 5, 'primary', true);
    const clone = createAvatar(3, 3, 'clone', false);
    const coh = createCoherenceState();
    coh.value = 0;
    const result = performCollapse(controlled, null, [controlled, clone], [], coh);
    
    expect(result.type).toBe('forcedCoherence');
    expect(isMeasuredEvent(result)).toBe(false);
    expect(coh.regenLockoutTimer).toBe(3);
  });
});

// === CAMERA DETECTION ===
import { pointInPolygon } from '../game/camera';

describe('Camera Detection', () => {
  it('point inside triangle polygon returns true', () => {
    const polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 10 },
    ];
    expect(pointInPolygon({ x: 3, y: 5 }, polygon)).toBe(true);
  });

  it('point outside polygon returns false', () => {
    const polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 10 },
    ];
    expect(pointInPolygon({ x: 20, y: 5 }, polygon)).toBe(false);
  });
});

// === SCORING ===
import { calculateStars, getStarCount } from '../game/scoring';

describe('Star Scoring', () => {
  it('gives 3 stars for perfect run', () => {
    const score = calculateStars(100, 100, 0, 20);
    expect(getStarCount(score)).toBe(3);
  });

  it('gives 2 stars if coherence below 40%', () => {
    const score = calculateStars(30, 100, 0, 20);
    expect(score.efficient).toBe(false);
    expect(getStarCount(score)).toBe(2);
  });

  it('gives 2 stars if measured events > 0', () => {
    const score = calculateStars(100, 100, 1, 20);
    expect(score.undetected).toBe(false);
    expect(getStarCount(score)).toBe(2);
  });

  it('gives 1 star if both fail', () => {
    const score = calculateStars(20, 100, 3, 60);
    expect(getStarCount(score)).toBe(1);
  });
});

// === WORLD / COLLISION ===
import { isWallTile, tileToPixel, pixelToTile, circleAABB } from '../game/world';

describe('World', () => {
  it('outer ring tiles are always walls', () => {
    expect(isWallTile(0, 0, [])).toBe(true);
    expect(isWallTile(23, 12, [])).toBe(true);
    expect(isWallTile(0, 6, [])).toBe(true);
  });

  it('interior tiles are not walls unless specified', () => {
    expect(isWallTile(5, 5, [])).toBe(false);
    expect(isWallTile(5, 5, [{ x: 5, y: 5, w: 1, h: 1 }])).toBe(true);
  });

  it('tile to pixel conversion is correct', () => {
    const p = tileToPixel(0, 0);
    expect(p.x).toBe(24); // (0+0.5)*48
    expect(p.y).toBe(24);
  });

  it('circle-AABB detects collision', () => {
    const push = circleAABB(50, 50, 10, 55, 40, 20, 20);
    expect(push).not.toBeNull();
  });

  it('circle-AABB returns null for no collision', () => {
    const push = circleAABB(0, 0, 5, 100, 100, 10, 10);
    expect(push).toBeNull();
  });
});

// === BEACON ===
import { createBeacon, startTeleport, updateTeleport } from '../game/beacon';

describe('Beacon Teleport', () => {
  it('teleport has 0.4s delay', () => {
    const beacon = createBeacon({ x: 100, y: 100 });
    startTeleport(beacon);
    expect(beacon.link.teleporting).toBe(true);
    expect(beacon.link.teleportTimer).toBeCloseTo(0.4, 2);
  });

  it('teleport completes after delay', () => {
    const beacon = createBeacon({ x: 100, y: 100 });
    startTeleport(beacon);
    
    let done = updateTeleport(beacon, 0.3);
    expect(done).toBe(false);
    
    done = updateTeleport(beacon, 0.2);
    expect(done).toBe(true);
  });

  it('classical bits pulse progresses 0 to 1', () => {
    const beacon = createBeacon({ x: 100, y: 100 });
    startTeleport(beacon);
    
    updateTeleport(beacon, 0.2);
    expect(beacon.link.classicalBitsPulse).toBeCloseTo(0.5, 1);
  });
});

// === H-DOOR OBSERVATION ===
import { superposeDoor, collapseDoor, createDoor } from '../game/doors';

describe('H-Door', () => {
  it('superpose sets door to superposed state', () => {
    const door = createDoor('test', 5, 5, 1, 2, [], 'all', false, 'closed');
    superposeDoor(door);
    expect(door.state).toBe('superposed');
  });

  it('collapse sets superposed door to closed', () => {
    const door = createDoor('test', 5, 5, 1, 2, [], 'all', false, 'closed');
    superposeDoor(door);
    collapseDoor(door);
    expect(door.state).toBe('closed');
  });

  it('collapse does not affect non-superposed door', () => {
    const door = createDoor('test', 5, 5, 1, 2, [], 'all', false, 'closed');
    door.state = 'open';
    collapseDoor(door);
    expect(door.state).toBe('open');
  });
});
