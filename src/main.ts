// Main entry point: bootstrap, resize, main loop, render orchestration
import '@fontsource/orbitron/400.css';
import '@fontsource/rajdhani/400.css';
import '@fontsource/exo-2/400.css';

import { LOGICAL_WIDTH, LOGICAL_HEIGHT, TILE_SIZE, BG_COLOR, PLAYER_COLOR, PLAYFIELD_HEIGHT } from './core/constants';
import { input } from './core/input';
import { audioManager } from './core/audio';
import { GameLoop } from './core/loop';
import { Renderer } from './render/renderer';
import { HUDRenderer } from './render/hud';
import { PostFX } from './render/postfx';
import { MiniFeedRenderer, drawEdgePing } from './render/minifeed';
import {
  GameEngine, createGameEngine, updateGameEngine, resumeGame, restartRoom, GameScreen
} from './game/engine';
import { getCoherenceFraction, getCoherenceThreshold } from './game/coherence';
import { getWarningUrgency } from './game/avatar';
import { getLaserPixelCoords } from './game/doors';
import { calculateStars, getStarCount, formatTime } from './game/scoring';
import { tileToPixel } from './game/world';
import { generateConePolygon } from './game/camera';
import { createRoom1a } from './game/rooms/room1a';
import { createRoom1b } from './game/rooms/room1b';
import { createRoom2 } from './game/rooms/room2';
import { createRoom3 } from './game/rooms/room3';
import { RoomData } from './game/types';
import { saveManager } from './core/save';

// === GLOBALS ===
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const displayCtx = canvas.getContext('2d')!;

const renderer = new Renderer(canvas);
const hudRenderer = new HUDRenderer();
const miniFeedRenderer = new MiniFeedRenderer();
let postfx: PostFX | null = null;

// Try WebGL2 post-processing
try {
  postfx = new PostFX();
} catch {
  console.warn('WebGL2 unavailable, using Canvas2D fallback');
}

// Room sequence
const roomFactories = [createRoom1a, createRoom1b, createRoom2, createRoom3];
const roomIds = ['room1a', 'room1b', 'room2', 'room3'];
let currentRoomIndex = 0;

// Game state
let engine: GameEngine | null = null;
let gameScreen: 'title' | 'levelSelect' | 'playing' | 'endScreen' = 'title';
let titleAnimTime = 0;

// Debug mode
const debugMode = window.location.search.includes('debug');

// === RESIZE HANDLER ===
function resize() {
  const container = document.getElementById('game-container')!;
  const w = container.clientWidth;
  const h = container.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  
  const scale = Math.min(w / LOGICAL_WIDTH, h / LOGICAL_HEIGHT);
  const cw = Math.floor(LOGICAL_WIDTH * scale);
  const ch = Math.floor(LOGICAL_HEIGHT * scale);
  
  canvas.width = Math.floor(cw * dpr);
  canvas.height = Math.floor(ch * dpr);
  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;
  
  displayCtx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  displayCtx.imageSmoothingEnabled = true;
}

window.addEventListener('resize', resize);
resize();

// === AUDIO UNLOCK ===
function unlockAudio() {
  audioManager.toggleMute();
  audioManager.toggleMute(); // trigger context creation
  window.removeEventListener('click', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
}
window.addEventListener('click', unlockAudio);
window.addEventListener('keydown', unlockAudio);

// Auto-pause on tab blur
document.addEventListener('visibilitychange', () => {
  if (document.hidden && engine && engine.screen === 'playing') {
    engine.screen = 'paused';
  }
});

// === TITLE SCREEN ===
function drawTitleScreen(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  
  // Animated grid
  ctx.strokeStyle = '#FFFFFF';
  ctx.globalAlpha = 0.03;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= LOGICAL_WIDTH; x += TILE_SIZE) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, LOGICAL_HEIGHT);
  }
  for (let y = 0; y <= LOGICAL_HEIGHT; y += TILE_SIZE) {
    ctx.moveTo(0, y);
    ctx.lineTo(LOGICAL_WIDTH, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1.0;
  
  // Animated sweeping cone
  const sweepAngle = Math.sin(titleAnimTime * 0.5) * 0.3 + Math.PI / 2;
  const coneOrigin = { x: LOGICAL_WIDTH / 2, y: 50 };
  const coneLen = 400;
  const halfAngle = 0.3;
  
  ctx.beginPath();
  ctx.moveTo(coneOrigin.x, coneOrigin.y);
  ctx.lineTo(
    coneOrigin.x + Math.cos(sweepAngle - halfAngle) * coneLen,
    coneOrigin.y + Math.sin(sweepAngle - halfAngle) * coneLen
  );
  ctx.lineTo(
    coneOrigin.x + Math.cos(sweepAngle + halfAngle) * coneLen,
    coneOrigin.y + Math.sin(sweepAngle + halfAngle) * coneLen
  );
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 42, 61, 0.08)';
  ctx.fill();
  
  // Title
  ctx.save();
  ctx.shadowColor = '#4DE8FF';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#4DE8FF';
  ctx.font = '48px Orbitron, monospace';
  ctx.textAlign = 'center';
  ctx.fillText("SCHRÖDINGER'S HEIST", LOGICAL_WIDTH / 2, 300);
  ctx.shadowBlur = 0;
  
  // Subtitle
  ctx.fillStyle = '#FFB347';
  ctx.font = '20px Rajdhani, sans-serif';
  ctx.fillText('A Quantum Stealth Puzzle', LOGICAL_WIDTH / 2, 340);
  
  // Press Space
  const blink = Math.sin(titleAnimTime * 3) > 0;
  if (blink) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Exo 2, sans-serif';
    ctx.fillText('Press Space', LOGICAL_WIDTH / 2, 420);
  }
  
  // Credit
  ctx.fillStyle = '#555555';
  ctx.font = '12px Rajdhani, sans-serif';
  ctx.fillText('Quriosity: A Quantum Game Jam', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 40);
  ctx.restore();
}

// === LEVEL SELECT ===
function drawLevelSelect(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '32px Orbitron, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SELECT CHAPTER', LOGICAL_WIDTH / 2, 80);
  
  const rooms = [
    { name: 'CH.1 SUPERPOSITION', color: '#4DE8FF', ids: ['room1a', 'room1b'] },
    { name: 'CH.2 GATES', color: '#FFB347', ids: ['room2'] },
    { name: 'CH.3 TELEPORTATION', color: '#FF4D6D', ids: ['room3'] },
  ];
  
  const cardW = 280;
  const cardH = 160;
  const startX = (LOGICAL_WIDTH - rooms.length * (cardW + 40)) / 2 + 20;
  
  for (let i = 0; i < rooms.length; i++) {
    const x = startX + i * (cardW + 40);
    const y = 150;
    const unlocked = debugMode || i === 0 || isChapterComplete(i - 1);
    const alpha = unlocked ? 1.0 : 0.3;
    
    ctx.globalAlpha = alpha;
    
    // Card outline
    ctx.save();
    ctx.shadowColor = rooms[i].color;
    ctx.shadowBlur = unlocked ? 15 : 5;
    ctx.strokeStyle = rooms[i].color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cardW, cardH);
    ctx.restore();
    
    // Title
    ctx.fillStyle = rooms[i].color;
    ctx.font = '18px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(rooms[i].name, x + cardW / 2, y + 50);
    
    // Stars
    const stars = getChapterStars(i);
    const maxStars = rooms[i].ids.length * 3;
    ctx.fillStyle = '#FFB347';
    ctx.font = '14px Rajdhani, sans-serif';
    ctx.fillText(`★ ${stars} / ${maxStars}`, x + cardW / 2, y + 90);
    
    // Status
    if (!unlocked) {
      ctx.fillStyle = '#555555';
      ctx.font = '12px Rajdhani, sans-serif';
      ctx.fillText('LOCKED', x + cardW / 2, y + 120);
    } else {
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '12px Rajdhani, sans-serif';
      ctx.fillText(`Press ${i + 1} to play`, x + cardW / 2, y + 120);
    }
    
    ctx.globalAlpha = 1.0;
  }
  
  // Controls hint
  ctx.fillStyle = '#555555';
  ctx.font = '14px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Press 1, 2, or 3 to select a chapter. Esc to go back.', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 60);
}

function isChapterComplete(chapterIndex: number): boolean {
  if (chapterIndex === 0) {
    return saveManager.getStars('room1a') > 0 && saveManager.getStars('room1b') > 0;
  }
  if (chapterIndex === 1) {
    return saveManager.getStars('room2') > 0;
  }
  if (chapterIndex === 2) {
    return saveManager.getStars('room3') > 0;
  }
  return false;
}

function getChapterStars(chapterIndex: number): number {
  if (chapterIndex === 0) return saveManager.getStars('room1a') + saveManager.getStars('room1b');
  if (chapterIndex === 1) return saveManager.getStars('room2');
  if (chapterIndex === 2) return saveManager.getStars('room3');
  return 0;
}

// === END SCREEN ===
function drawEndScreen(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  
  ctx.save();
  ctx.shadowColor = '#4DE8FF';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#4DE8FF';
  ctx.font = '36px Orbitron, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('HEIST COMPLETE', LOGICAL_WIDTH / 2, 120);
  ctx.restore();
  
  const totalStars = saveManager.getStars('room1a') + saveManager.getStars('room1b') +
                     saveManager.getStars('room2') + saveManager.getStars('room3');
  
  ctx.fillStyle = '#FFB347';
  ctx.font = '24px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Total Stars: ${totalStars} / 12`, LOGICAL_WIDTH / 2, 180);
  
  // Quantum summary
  const notes = [
    'Superposition: A qubit explores multiple paths simultaneously.',
    'X Gate: A bit flip that is its own inverse (X² = I).',
    'H Gate: Creates superposition; observation collapses it.',
    'Teleportation: Entanglement + 2 classical bits move a state.',
    'Decoherence: Quantum behavior fades through environmental interaction.',
  ];
  
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '16px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < notes.length; i++) {
    ctx.fillText(notes[i], LOGICAL_WIDTH / 2, 240 + i * 30);
  }
  
  // Simplification notes
  ctx.fillStyle = '#777777';
  ctx.font = '13px Rajdhani, sans-serif';
  ctx.fillText('Simplifications: Observer chooses which branch survives (post-selection).',
    LOGICAL_WIDTH / 2, 430);
  ctx.fillText('Door is a single state, not full amplitude simulation. Teleports position, not qubit state.',
    LOGICAL_WIDTH / 2, 455);
  
  ctx.fillStyle = '#555555';
  ctx.font = '14px Rajdhani, sans-serif';
  ctx.fillText('Press Space to return to menu', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 60);
}

// === PAUSE SCREEN ===
function drawPauseOverlay(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '32px Orbitron, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', LOGICAL_WIDTH / 2, 200);
  
  const items = [
    '[Space] Resume',
    '[R] Restart Room',
    '[M] Mute: ' + (audioManager.isMuted() ? 'ON' : 'OFF'),
    '[Q] Quit to Select',
  ];
  
  ctx.font = '18px Rajdhani, sans-serif';
  ctx.fillStyle = '#AAAAAA';
  for (let i = 0; i < items.length; i++) {
    ctx.fillText(items[i], LOGICAL_WIDTH / 2, 270 + i * 35);
  }
  
  // Quantum info panel
  ctx.fillStyle = '#555555';
  ctx.font = '12px Rajdhani, sans-serif';
  ctx.fillText('— How this maps to real quantum computing —', LOGICAL_WIDTH / 2, 450);
  ctx.fillText('Split = superposition | Camera = measurement | X = NOT gate | H = Hadamard', LOGICAL_WIDTH / 2, 475);
  ctx.fillText('Beacon = entangled pair | Teleport = Bell measurement + 2 classical bits', LOGICAL_WIDTH / 2, 495);
  ctx.fillText('Coherence = decoherence model | Collapse = wavefunction reduction', LOGICAL_WIDTH / 2, 515);
}

// === MAIN RENDER ===
function renderGame(engine: GameEngine) {
  const ctx = renderer.getSceneCtx();
  renderer.clear();
  renderer.drawBackground();
  
  const room = engine.room;
  
  // Draw walls (including outer ring visual)
  const wallColor = room.accentColor.replace(/[0-9a-f]{2}$/i, '44'); // dim version of accent
  renderer.drawWalls([
    // Outer ring
    { x: 0, y: 0, w: 24, h: 1 },
    { x: 0, y: 12, w: 24, h: 1 },
    { x: 0, y: 1, w: 1, h: 11 },
    { x: 23, y: 1, w: 1, h: 11 },
    ...room.walls,
  ], room.accentColor);
  
  // Draw exit trigger
  const exit = room.exitTrigger;
  renderer.drawExit(
    exit.pos.x * TILE_SIZE, exit.pos.y * TILE_SIZE,
    exit.size.x * TILE_SIZE, exit.size.y * TILE_SIZE
  );
  
  // Draw doors
  for (const door of room.doors) {
    renderer.drawDoor(
      door.pos.x * TILE_SIZE, door.pos.y * TILE_SIZE,
      door.size.x * TILE_SIZE, door.size.y * TILE_SIZE,
      door.state, room.accentColor
    );
  }
  
  // Draw panels
  for (const panel of room.panels) {
    const color = panel.gateType === 'X' ? '#FFB347' : '#FFB347';
    renderer.drawPanel(
      (panel.pos.x + 0.5) * TILE_SIZE,
      (panel.pos.y + 0.5) * TILE_SIZE,
      panel.gateType, panel.activationCount > 0, color
    );
  }
  
  // Draw pressure plates
  for (const plate of room.pressurePlates) {
    renderer.drawPanel(
      (plate.pos.x + 0.5) * TILE_SIZE,
      (plate.pos.y + 0.5) * TILE_SIZE,
      'plate', plate.active, room.accentColor
    );
  }
  
  // Draw switches
  for (const sw of room.switches) {
    renderer.drawPanel(
      (sw.pos.x + 0.5) * TILE_SIZE,
      (sw.pos.y + 0.5) * TILE_SIZE,
      'switch', sw.latched, room.accentColor
    );
  }
  
  // Draw lasers
  for (const laser of room.lasers) {
    const lp = getLaserPixelCoords(laser);
    renderer.drawLaser(lp.start.x, lp.start.y, lp.end.x, lp.end.y, laser.active);
  }
  
  // Draw camera cones and bodies
  for (let i = 0; i < room.cameras.length; i++) {
    const cam = room.cameras[i];
    const cone = engine.conePolygons[i];
    
    // Determine alert level
    let alert = 0;
    for (const avatar of engine.state.avatars) {
      if (avatar.warning.state === 'active' && avatar.warning.sourceCamera === i) {
        alert = getWarningUrgency(avatar);
      }
    }
    
    renderer.drawCameraCone(cone, alert);
    renderer.drawCameraBody(
      (cam.pos.x + 0.5) * TILE_SIZE,
      (cam.pos.y + 0.5) * TILE_SIZE,
      cam.currentAngle * Math.PI / 180
    );
  }
  
  // Draw beacon and link
  if (engine.state.beacon?.active) {
    const beacon = engine.state.beacon;
    renderer.drawBeacon(beacon.pos.x, beacon.pos.y);
    
    const controlled = engine.state.avatars.find(a => a.isControlled);
    if (controlled) {
      const pulse = engine.time * 3; // animation speed
      renderer.drawBeaconLink(
        controlled.pos.x, controlled.pos.y,
        beacon.pos.x, beacon.pos.y,
        pulse
      );
      
      // Classical bits pulse during teleport
      if (beacon.link.teleporting) {
        const t = beacon.link.classicalBitsPulse;
        const mx = controlled.pos.x + (beacon.pos.x - controlled.pos.x) * t;
        const my = controlled.pos.y + (beacon.pos.y - controlled.pos.y) * t;
        
        ctx.save();
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // "2 classical bits" label
        if (t > 0.3 && t < 0.7) {
          ctx.font = '10px Exo 2, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('2 classical bits', mx, my - 15);
        }
        ctx.restore();
      }
    }
  }
  
  // Draw avatars (always on top)
  for (const avatar of engine.state.avatars) {
    if (!avatar.alive) continue;
    const color = avatar.isControlled ? PLAYER_COLOR : room.accentColor;
    renderer.drawAvatar(avatar.pos.x, avatar.pos.y, avatar.alive, avatar.isControlled, color);
  }
  
  // === MINI-FEED (passive clone camera view) ===
  if (engine.state.playerState === 'superposed') {
    const passive = engine.state.avatars.find(a => !a.isControlled && a.alive);
    if (passive) {
      miniFeedRenderer.render(ctx, passive.pos, engine.time);
      
      // Edge ping: check distance from passive clone to nearest camera cone
      let nearestConeDist = Infinity;
      for (let ci = 0; ci < room.cameras.length; ci++) {
        const cam = room.cameras[ci];
        const camPos = tileToPixel(cam.pos.x, cam.pos.y);
        const dx = passive.pos.x - camPos.x;
        const dy = passive.pos.y - camPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        nearestConeDist = Math.min(nearestConeDist, dist);
      }
      drawEdgePing(ctx, passive.pos, nearestConeDist, engine.time);
    }
  }
  
  // === HUD ===
  const coherenceFrac = getCoherenceFraction(engine.coherenceState);
  hudRenderer.drawCoherenceGauge(ctx, engine.coherenceState.value, 100);
  hudRenderer.drawControlsHint(ctx);
  hudRenderer.drawChapterLabel(ctx, `CH.${room.chapter} ${room.name}`, room.accentColor);
  hudRenderer.drawProgressDots(ctx, currentRoomIndex, roomIds.length);
  
  // Mission control line
  ctx.fillStyle = '#777777';
  ctx.font = '14px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(room.missionControlLine, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 20);
  
  // Warning overlay
  for (const avatar of engine.state.avatars) {
    if (avatar.warning.state === 'active') {
      const urgency = getWarningUrgency(avatar);
      hudRenderer.drawWarningOverlay(ctx, urgency);
      break;
    }
  }
  
  // Collapse flash text
  if (engine.collapseFlashTimer > 0) {
    if (engine.collapseResult?.type === 'measured') {
      hudRenderer.drawMeasuredText(ctx);
    } else if (engine.collapseResult?.type === 'branchPruned') {
      hudRenderer.drawBranchPrunedText(ctx);
    }
  }
  
  // Split shockwave effect
  if (engine.splitShockwaveTimer > 0) {
    const t = 1 - engine.splitShockwaveTimer / 0.4;
    const r = t * TILE_SIZE * 3;
    const alpha = 1 - t;
    ctx.save();
    ctx.strokeStyle = room.accentColor;
    ctx.lineWidth = 3;
    ctx.globalAlpha = alpha * 0.5;
    ctx.shadowColor = room.accentColor;
    ctx.shadowBlur = 15;
    const controlled = engine.state.avatars.find(a => a.isControlled);
    if (controlled) {
      ctx.beginPath();
      ctx.arc(controlled.pos.x, controlled.pos.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  
  // Teleport flash
  if (engine.teleportFlashTimer > 0) {
    const t = engine.teleportFlashTimer / 0.5;
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = t * 0.3;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.restore();
  }
  
  // Debug overlays
  if (engine.debugMode) {
    drawDebugOverlay(ctx, engine);
  }
  
  // Room clear card
  if (engine.screen === 'roomClear' && engine.roomScore) {
    hudRenderer.drawRoomClearCard(
      ctx,
      room.name,
      getStarCount(engine.roomScore),
      formatTime(engine.roomScore.time),
      Math.floor(engine.roomScore.finalCoherence),
      room.labNote
    );
  }
  
  // Chapter intro card
  if (engine.screen === 'chapterIntro') {
    hudRenderer.drawChapterCard(ctx, room.chapter, room.name, room.subtitle, room.accentColor);
  }
  
  // Pause overlay
  if (engine.screen === 'paused') {
    drawPauseOverlay(ctx);
  }
}

function drawDebugOverlay(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  ctx.fillStyle = '#00FF00';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`State: ${engine.state.playerState}`, 10, PLAYFIELD_HEIGHT + 20);
  ctx.fillText(`Coherence: ${engine.coherenceState.value.toFixed(1)}`, 10, PLAYFIELD_HEIGHT + 35);
  ctx.fillText(`Measured: ${engine.state.measuredCount}`, 10, PLAYFIELD_HEIGHT + 50);
  ctx.fillText(`Time: ${engine.state.roomTime.toFixed(1)}s`, 10, PLAYFIELD_HEIGHT + 65);
  ctx.fillText(`Screen: ${engine.screen}`, 200, PLAYFIELD_HEIGHT + 20);
  
  // Avatar positions
  for (const avatar of engine.state.avatars) {
    const tx = Math.floor(avatar.pos.x / TILE_SIZE);
    const ty = Math.floor(avatar.pos.y / TILE_SIZE);
    ctx.fillText(`Avatar(${avatar.role}): ${tx},${ty}`, 200, PLAYFIELD_HEIGHT + (avatar.isControlled ? 35 : 50));
  }
}

// === MAIN LOOP ===
const gameLoop = new GameLoop(
  // Update
  (dt: number) => {
    titleAnimTime += dt;
    
    if (gameScreen === 'title') {
      if (input.wasPressed(' ') || input.wasPressed('enter')) {
        gameScreen = 'levelSelect';
        audioManager.playUIBlip();
      }
    } else if (gameScreen === 'levelSelect') {
      handleLevelSelectInput();
    } else if (gameScreen === 'endScreen') {
      if (input.wasPressed(' ') || input.wasPressed('enter')) {
        gameScreen = 'title';
      }
    } else if (gameScreen === 'playing' && engine) {
      // Handle pause input
      if (engine.screen === 'paused') {
        handlePauseInput(engine);
      } else {
        updateGameEngine(engine, dt);
      }
      
      // Check if engine signals level select (room complete, advance)
      if (engine.screen === 'levelSelect') {
        // Save stars
        if (engine.roomScore) {
          const stars = getStarCount(engine.roomScore);
          const prev = saveManager.getStars(engine.room.id);
          if (stars > prev) saveManager.saveStars(engine.room.id, stars);
        }
        
        // Advance to next room
        currentRoomIndex++;
        if (currentRoomIndex >= roomIds.length) {
          gameScreen = 'endScreen';
        } else {
          startRoom(currentRoomIndex);
        }
      }
    }
    
    input.update();
  },
  // Render
  (_alpha: number) => {
    const sceneCtx = renderer.getSceneCtx();
    const sceneCanvas = renderer.getSceneCanvas();
    
    if (gameScreen === 'title') {
      drawTitleScreen(sceneCtx);
    } else if (gameScreen === 'levelSelect') {
      drawLevelSelect(sceneCtx);
    } else if (gameScreen === 'endScreen') {
      drawEndScreen(sceneCtx);
    } else if (gameScreen === 'playing' && engine) {
      renderGame(engine);
    }
    
    // Composite scene canvas to display canvas  
    displayCtx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    
    const coherence = (gameScreen === 'playing' && engine) ? getCoherenceFraction(engine.coherenceState) : 1;
    const chromatic = (gameScreen === 'playing' && engine && engine.collapseFlashTimer > 0) 
      ? engine.collapseFlashTimer / 0.8 : 0;
    const time = (gameScreen === 'playing' && engine) ? engine.time : titleAnimTime;
    
    if (postfx) {
      try {
        postfx.render(sceneCanvas, { coherence, chromaticAberration: chromatic, time });
        displayCtx.drawImage(postfx.getCanvas(), 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      } catch {
        displayCtx.drawImage(sceneCanvas, 0, 0);
      }
    } else {
      displayCtx.drawImage(sceneCanvas, 0, 0);
    }
  }
);

function handleLevelSelectInput() {
  if (input.wasPressed('1')) {
    currentRoomIndex = 0;
    startRoom(0);
  } else if (input.wasPressed('2') && (debugMode || isChapterComplete(0))) {
    currentRoomIndex = 2;
    startRoom(2);
  } else if (input.wasPressed('3') && (debugMode || isChapterComplete(1))) {
    currentRoomIndex = 3;
    startRoom(3);
  } else if (input.wasPressed('escape')) {
    gameScreen = 'title';
  }
}

function handlePauseInput(engine: GameEngine) {
  if (input.wasPressed(' ') || input.wasPressed('escape')) {
    resumeGame(engine);
  } else if (input.wasPressed('r')) {
    restartRoom(engine);
  } else if (input.wasPressed('m')) {
    audioManager.toggleMute();
  } else if (input.wasPressed('q')) {
    gameScreen = 'levelSelect';
  }
}

function startRoom(index: number) {
  const room = roomFactories[index]();
  engine = createGameEngine(room, debugMode);
  gameScreen = 'playing';
}

// Start the game
gameLoop.start();
