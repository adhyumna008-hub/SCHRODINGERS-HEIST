import { RoomData } from '../types';

export function createRoom1b(): RoomData {
  return {
    id: 'room1b',
    name: 'SUPERPOSITION',
    chapter: 1,
    subtitle: 'First Measurement',
    accentColor: '#4DE8FF',
    walls: [
      { x: 8, y: 4, w: 3, h: 4 },
      { x: 14, y: 1, w: 2, h: 4 },
      { x: 14, y: 8, w: 2, h: 4 },
      { x: 21, y: 5, w: 2, h: 1 },
      { x: 21, y: 7, w: 2, h: 1 }
    ],
    cameras: [
      {
        pos: { x: 12, y: 0 },
        baseAngle: 90,
        amplitude: 40,
        period: 4,
        halfAngle: 20,
        range: 9,
        currentAngle: 90,
        lockOn: { active: false, targetPos: { x: 0, y: 0 }, timer: 0 }
      }
    ],
    lasers: [],
    panels: [],
    pressurePlates: [
      { pos: { x: 4, y: 10 }, linkedIds: ['door_exit'], active: false }
    ],
    switches: [
      { pos: { x: 19, y: 3 }, linkedIds: ['door_exit'], latched: false }
    ],
    doors: [
      {
        id: 'door_exit',
        pos: { x: 21, y: 6 },
        size: { x: 2, y: 1 },
        state: 'closed',
        defaultState: 'closed',
        inputs: [],
        inputType: 'all',
        graceTimer: 0,
        isExit: true
      }
    ],
    exitTrigger: { pos: { x: 22, y: 6 }, size: { x: 1, y: 1 } },
    playerStart: { x: 2, y: 6 },
    labNote: 'Split: a qubit in superposition explores both paths; measurement collapses it to one.',
    missionControlLine: 'They can see you now. Use that.',
    parTime: 45
  };
}
