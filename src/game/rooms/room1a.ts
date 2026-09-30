import { RoomData } from '../types';

export function createRoom1a(): RoomData {
  return {
    id: 'room1a',
    name: 'SUPERPOSITION',
    chapter: 1,
    subtitle: 'Learn to Split',
    accentColor: '#4DE8FF',
    walls: [
      { x: 6, y: 4, w: 2, h: 5 },
      { x: 21, y: 5, w: 2, h: 1 },
      { x: 21, y: 7, w: 2, h: 1 }
    ],
    cameras: [],
    lasers: [],
    panels: [],
    pressurePlates: [
      { pos: { x: 19, y: 2 }, linkedIds: ['door_exit'], active: false },
      { pos: { x: 19, y: 10 }, linkedIds: ['door_exit'], active: false }
    ],
    switches: [],
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
    missionControlLine: 'Two of you. One exit. Make it work.',
    parTime: 30
  };
}
