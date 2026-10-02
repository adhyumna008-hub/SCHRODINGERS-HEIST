import { RoomData } from '../types';

export function createRoom3(): RoomData {
  return {
    id: 'room3',
    membranes: [{x:16,y:5,w:1,h:2}],
    beaconPickup: {x:4,y:10},
    vents: [{from:{x:7,y:8},to:{x:14,y:7}}],
    name: 'TELEPORTATION',
    chapter: 3,
    subtitle: 'Quantum Teleportation',
    accentColor: '#FF4D6D',
    walls: [
      { x: 16, y: 3, w: 7, h: 1 },
      { x: 16, y: 8, w: 7, h: 1 },
      { x: 22, y: 4, w: 1, h: 4 },
      { x: 16, y: 4, w: 1, h: 1 },
      { x: 16, y: 7, w: 1, h: 1 }
    ],
    // This is the teleportation tutorial. Keep the moving laser as its single
    // hazard so the receiver, gate and transfer sequence stays legible.
    cameras: [],
    lasers: [
      {
        id: 'sweep1',
        group: 'L_sweep',
        start: { x: 17, y: 4 },
        end: { x: 17, y: 5 },
        active: true,
        sweeping: { axis: 'x', min: 17, max: 21, speed: 1, pos: 17, direction: 1 }
      },
      { id: 'floor1', group: 'L_floor', start: { x: 10, y: 9 }, end: { x: 19, y: 9 }, active: true },
      { id: 'floor2', group: 'L_floor', start: { x: 10, y: 11 }, end: { x: 19, y: 11 }, active: true }
    ],
    panels: [
      { pos: { x: 6, y: 9 }, gateType: 'H', requiredSequence:['X','H'], linkedIds: ['door_alcove'], interactRadius: 1.2, activationCount: 0 }
    ],
    pressurePlates: [],
    switches: [],
    doors: [
      {
        id: 'door_alcove',
        pos: { x: 16, y: 5 },
        size: { x: 1, y: 2 },
        state: 'closed',
        defaultState: 'closed',
        inputs: [],
        inputType: 'all',
        graceTimer: 0,
        isExit: false
      }
    ],
    exitTrigger: { pos: { x: 21, y: 5 }, size: { x: 1, y: 1 } },
    beaconTarget: { pos: { x: 19, y: 5 } },
    playerStart: { x: 2, y: 10 },
    labNote: 'Teleportation transfers a state with entanglement, two classical bits and X/Z correction.',
    missionControlLine: 'The membrane blocks Miso; the receiver passes through. E throws it. E again transfers you.',
    parTime: 90
  };
}
