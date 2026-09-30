import { RoomData } from '../types';

export function createRoom2(): RoomData {
  return {
    id: 'room2',
    name: 'GATES',
    chapter: 2,
    subtitle: 'X and H',
    accentColor: '#FFB347',
    walls: [
      { x: 18, y: 1, w: 1, h: 4 },
      { x: 18, y: 8, w: 1, h: 4 }
    ],
    cameras: [
      {
        pos: { x: 12, y: 0 },
        baseAngle: 90,
        amplitude: 30,
        period: 4,
        halfAngle: 20,
        range: 8,
        currentAngle: 90,
        lockOn: { active: false, targetPos: { x: 0, y: 0 }, timer: 0 }
      },
      {
        pos: { x: 14, y: 0 },
        baseAngle: 90,
        amplitude: 5,
        period: 10,
        halfAngle: 40,
        range: 9,
        currentAngle: 90,
        lockOn: { active: false, targetPos: { x: 0, y: 0 }, timer: 0 }
      }
    ],
    lasers: [
      { id: 'laser_8', group: 'L1', start: { x: 8, y: 1 }, end: { x: 8, y: 11 }, active: true },
      { id: 'laser_9', group: 'L1', start: { x: 9, y: 1 }, end: { x: 9, y: 11 }, active: true },
      { id: 'laser_10', group: 'L1', start: { x: 10, y: 1 }, end: { x: 10, y: 11 }, active: true }
    ],
    panels: [
      { pos: { x: 3, y: 10 }, gateType: 'X', linkedIds: ['L1'], interactRadius: 1.2, activationCount: 0 },
      { pos: { x: 14, y: 10 }, gateType: 'H', linkedIds: ['door_h'], interactRadius: 1.2, activationCount: 0 }
    ],
    pressurePlates: [],
    switches: [],
    doors: [
      {
        id: 'door_h',
        pos: { x: 18, y: 5 },
        size: { x: 1, y: 3 },
        state: 'closed',
        defaultState: 'closed',
        inputs: [],
        inputType: 'all',
        graceTimer: 0,
        isExit: false
      }
    ],
    exitTrigger: { pos: { x: 20, y: 5 }, size: { x: 2, y: 3 } },
    playerStart: { x: 2, y: 4 },
    labNote: 'X applied twice returns the qubit to its start state. H puts the door in superposition; looking at it collapses it.',
    missionControlLine: 'Gates change the rules. Learn which ones.',
    parTime: 60
  };
}
