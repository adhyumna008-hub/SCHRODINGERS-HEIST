// Room data types for Schrödinger's Heist

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PlayerState = 'classical' | 'superposed';
export type AvatarRole = 'primary' | 'clone';
export type WarningState = 'none' | 'active' | 'expired';
export type DoorState = 'closed' | 'open' | 'superposed';
export type GateType = 'X' | 'H';

export interface Avatar {
  pos: Vec2;
  vel: Vec2;
  role: AvatarRole;
  isControlled: boolean;
  warning: {
    state: WarningState;
    timer: number;
    maxTime: number;
    sourceCamera: number; // index of camera that triggered
  };
  facingDir: Vec2; // last movement direction for beacon throw
  alive: boolean;
}

export interface SecurityCamera {
  pos: Vec2;         // tile position
  baseAngle: number; // degrees, 0 = right, 90 = down
  amplitude: number; // sweep amplitude in degrees
  period: number;    // sweep period in seconds
  halfAngle: number; // half of the cone angle
  range: number;     // range in tiles
  currentAngle: number; // computed each frame
  lockOn: {
    active: boolean;
    targetPos: Vec2;
    timer: number;
  };
}

export interface Laser {
  id: string;
  group: string;
  start: Vec2;    // tile coords
  end: Vec2;      // tile coords
  active: boolean;
  sweeping?: {    // for sweeping lasers in Room 3
    axis: 'x' | 'y';
    min: number;
    max: number;
    speed: number; // tiles/s
    pos: number;   // current position along axis
    direction: 1 | -1;
  };
}

export interface Panel {
  pos: Vec2;        // tile coords
  gateType: GateType;
  linkedIds: string[]; // IDs of linked doors/lasers
  interactRadius: number; // tiles, default 1.2
  activationCount: number; // how many times pressed (for X involution display)
}

export interface PressurePlate {
  pos: Vec2;
  linkedIds: string[];
  active: boolean;
}

export interface Switch {
  pos: Vec2;
  linkedIds: string[];
  latched: boolean;
}

export interface Door {
  id: string;
  pos: Vec2;       // tile top-left
  size: Vec2;      // size in tiles
  state: DoorState;
  defaultState: DoorState;
  inputs: string[];     // IDs of panels/plates/switches that control it
  inputType: 'all' | 'any'; // require all or any input
  graceTimer: number;   // 5s grace period countdown
  isExit: boolean;
}

export interface ExitTrigger {
  pos: Vec2;
  size: Vec2; // in tiles
}

export interface BeaconTarget {
  pos: Vec2; // tile coords for aim assist
}

export interface Beacon {
  pos: Vec2;
  active: boolean;
  link: {
    teleporting: boolean;
    teleportTimer: number;
    classicalBitsPulse: number; // animation progress 0-1
  };
}

export interface Checkpoint {
  pos: Vec2;
  coherence: number;
}

export interface RoomData {
  id: string;
  name: string;
  chapter: number;
  subtitle: string;
  accentColor: string;
  walls: Rect[];     // in tile coords
  cameras: SecurityCamera[];
  lasers: Laser[];
  panels: Panel[];
  pressurePlates: PressurePlate[];
  switches: Switch[];
  doors: Door[];
  exitTrigger: ExitTrigger;
  beaconTarget?: BeaconTarget;
  playerStart: Vec2;  // tile coords
  labNote: string;
  missionControlLine: string;
  parTime: number; // seconds
}

export interface GameState {
  playerState: PlayerState;
  avatars: Avatar[];
  controlledIndex: number;
  coherence: number;
  coherenceRegenLockout: number;
  beacon: Beacon | null;
  checkpoint: Checkpoint;
  measuredCount: number;
  roomTime: number;
  paused: boolean;
  roomCleared: boolean;
  collapseFreezeTimer: number;
  currentRoom: string;
  stars: { breach: boolean; efficient: boolean; undetected: boolean };
}

export interface InputFrame {
  dx: number;
  dy: number;
  split: boolean;
  tab: boolean;
  decohere: boolean;
  recall: boolean;
  beacon: boolean;
  restart: boolean;
  pause: boolean;
  mute: boolean;
  confirm: boolean;
  interact: boolean;
}

// Solution replay types
export interface ReplayFrame {
  frame: number;
  inputs: Partial<InputFrame>;
}

export interface ReplaySolution {
  roomId: string;
  frames: ReplayFrame[];
  expectedStars: number;
}
