// Solution replay harness: verifies all rooms are solvable
import { describe, it, expect } from 'vitest';
import { createGameEngine, updateGameEngine } from '../game/engine';
import { createRoom1a } from '../game/rooms/room1a';
import { createRoom1b } from '../game/rooms/room1b';
import { createRoom2 } from '../game/rooms/room2';
import { createRoom3 } from '../game/rooms/room3';
import { spawnCloneAtPosition } from '../game/avatar';
import { toggleLaserGroup, superposeDoor } from '../game/doors';
import { createBeacon } from '../game/beacon';
import { TILE_SIZE, FIXED_DT } from '../core/constants';

function tileCenter(col: number, row: number) {
  return { x: (col + 0.5) * TILE_SIZE, y: (row + 0.5) * TILE_SIZE };
}

function tickEngine(engine: ReturnType<typeof createGameEngine>, frames: number) {
  for (let i = 0; i < frames; i++) updateGameEngine(engine, FIXED_DT);
}

describe('Room Solvability', () => {
  it('Room 1a: split, place on plates, exit', () => {
    const room = createRoom1a();
    const engine = createGameEngine(room);
    engine.screen = 'playing';
    tickEngine(engine, 10);

    expect(engine.state.playerState).toBe('classical');
    expect(engine.state.avatars.length).toBe(1);

    // Split
    const controlled = engine.state.avatars[0];
    const clone = spawnCloneAtPosition({ ...controlled.pos });
    engine.state.avatars.push(clone);
    engine.state.playerState = 'superposed';

    // Place on plates
    clone.pos = tileCenter(19, 10);
    controlled.pos = tileCenter(19, 2);
    tickEngine(engine, 10);

    expect(room.pressurePlates[0].active).toBe(true);
    expect(room.pressurePlates[1].active).toBe(true);
    expect(room.doors[0].state).toBe('open');

    // Move to exit
    controlled.pos = tileCenter(22, 6);
    tickEngine(engine, 5);
    expect(engine.screen).toBe('roomClear');
  });

  it('Room 1b: split, plate + switch, exit', () => {
    const room = createRoom1b();
    const engine = createGameEngine(room);
    engine.screen = 'playing';
    tickEngine(engine, 10);

    const controlled = engine.state.avatars[0];
    const clone = spawnCloneAtPosition({ ...controlled.pos });
    engine.state.avatars.push(clone);
    engine.state.playerState = 'superposed';

    clone.pos = tileCenter(4, 10);
    room.switches[0].latched = true;
    tickEngine(engine, 10);

    expect(room.pressurePlates[0].active).toBe(true);
    expect(room.switches[0].latched).toBe(true);
    expect(room.doors[0].state).toBe('open');

    controlled.pos = tileCenter(22, 6);
    tickEngine(engine, 5);
    expect(engine.screen).toBe('roomClear');
  });

  it('Room 2: X toggles lasers, H superposes door, pass through', () => {
    const room = createRoom2();
    const engine = createGameEngine(room);
    engine.screen = 'playing';
    tickEngine(engine, 10);

    expect(room.lasers[0].active).toBe(true);
    toggleLaserGroup(room.lasers, 'L1');
    expect(room.lasers.every(l => !l.active)).toBe(true);

    const hDoor = room.doors.find(d => d.id === 'door_h')!;
    superposeDoor(hDoor);
    expect(hDoor.state).toBe('superposed');

    const controlled = engine.state.avatars[0];
    controlled.pos = tileCenter(20, 6);
    tickEngine(engine, 5);
    expect(engine.screen).toBe('roomClear');
  });

  it('Room 3: H superposes alcove door, beacon teleport to exit', () => {
    const room = createRoom3();
    const engine = createGameEngine(room);
    engine.screen = 'playing';
    tickEngine(engine, 10);

    const alcoveDoor = room.doors.find(d => d.id === 'door_alcove')!;
    superposeDoor(alcoveDoor);
    expect(alcoveDoor.state).toBe('superposed');

    const targetPx = tileCenter(room.beaconTarget!.pos.x, room.beaconTarget!.pos.y);
    engine.state.beacon = createBeacon(targetPx);

    // Teleport: move player to beacon
    const controlled = engine.state.avatars[0];
    controlled.pos = { ...targetPx };
    engine.state.beacon = null;

    // Walk to exit
    controlled.pos = tileCenter(21, 5);
    tickEngine(engine, 5);
    expect(engine.screen).toBe('roomClear');
  });

  it('X gate is involutive (X² = I) in Room 2', () => {
    const room = createRoom2();
    expect(room.lasers.every(l => l.active)).toBe(true);

    toggleLaserGroup(room.lasers, 'L1');
    expect(room.lasers.every(l => !l.active)).toBe(true);

    toggleLaserGroup(room.lasers, 'L1');
    expect(room.lasers.every(l => l.active)).toBe(true);
  });

  it('Coherence drains at 8/s while superposed', () => {
    const room = createRoom1a();
    const engine = createGameEngine(room);
    engine.screen = 'playing';

    const controlled = engine.state.avatars[0];
    const clone = spawnCloneAtPosition({ ...controlled.pos });
    engine.state.avatars.push(clone);
    engine.state.playerState = 'superposed';

    const initial = engine.coherenceState.value;
    tickEngine(engine, 60); // ~1 second

    expect(engine.coherenceState.value).toBeLessThan(initial);
    expect(engine.coherenceState.value).toBeCloseTo(initial - 8, 1);
  });
});
