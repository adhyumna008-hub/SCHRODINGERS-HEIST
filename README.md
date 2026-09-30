# SCHRÖDINGER'S HEIST

A quantum-powered stealth puzzle game built for **Quriosity: A Quantum Game Jam**.

> You are a quantum-powered thief breaking into a secure facility where the laws of physics are your only lockpicks.

## Quick Start

```bash
npm install
npm run dev     # Start dev server at http://localhost:3000
npm run build   # Production build to dist/
npm run test    # Run tests
```

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Move |
| Space | Split (when Classical) / Interact with panel |
| Tab | Switch controlled avatar (while Superposed) |
| Q | Decohere (voluntary collapse, no penalty) |
| R | Recall clone (pulls passive clone toward you, -25 Coherence) |
| E | Throw beacon / Teleport (second press) |
| Backspace | Instant restart from checkpoint |
| Escape | Pause |
| M | Mute |

## Rooms

### Chapter 1: SUPERPOSITION (Rooms 1a, 1b)
**Verb taught:** Split — become two avatars exploring simultaneously.

- **1a** (no cameras): Split and place each avatar on a pressure plate to open the exit.
- **1b** (one camera): Time your movement through the camera sweep gap. Use the clone for the pressure plate while you hit the switch and reach the exit.

### Chapter 2: GATES (X and H)
**Verbs taught:** X-gate toggles lasers (involutive: X² = I), H-gate superposes a door.

Disable lasers with X, superpose the H-door, then bait a camera's attention so it stops observing the door — allowing you to pass through.

### Chapter 3: TELEPORTATION
**Verb taught:** Beacon + Teleport using quantum entanglement.

Throw a beacon through the superposed door into a sealed alcove, then teleport to it. Time the teleport during safe laser windows.

## Quantum Fidelity Notes

### Primary Track: Quantum Teleportation
The beacon represents an entangled pair shared between sender and receiver. Pressing E a second time performs a Bell-basis measurement — the **"2 classical bits"** pulse that travels along the link represents the classical channel required by the teleportation protocol. The ~0.4s delay models the speed-of-light constraint on classical information. The original (beacon) is destroyed and the state appears at the destination — matching the "destroy-original, recreate-elsewhere" nature of quantum teleportation.

**Simplification:** We teleport the player's position rather than an arbitrary qubit state. The classical channel delay is a fixed 0.4s rather than being distance-dependent.

### Secondary Track: Quantum Logic Gates (X, H)
- **X gate (NOT):** Bit flip. Applied twice returns to original state (X² = I, involutive). In-game: toggling lasers on/off.
- **H gate (Hadamard):** Creates superposition |0⟩ → (|0⟩+|1⟩)/√2. In-game: the door enters a "superposed" state (passable) until observed by a camera, which collapses it to closed.

**Simplification:** The door is a single classical object in superposition, not a full amplitude simulation.

### Superposition & Measurement
Splitting creates a two-branch superposition. A security camera acts as a measurement device — observing an avatar collapses the superposition to a single branch.

**Simplification:** The player (observer) chooses which branch survives by controlling one avatar. This is a stated simplification of post-selection.

### Decoherence
The Coherence meter models the gradual loss of quantum behavior through interaction with the environment. As coherence drops, visual degradation (static, desaturation, grain) increases — representing the transition from quantum to classical behavior.

## Scoring

Stars per room (persisted in localStorage):
- ⭐ **Breach:** Reach the exit
- ⭐ **Efficient:** Finish with ≥ 40% Coherence remaining
- ⭐ **Undetected:** Finish with zero MEASURED events (deliberate bait/BRANCH PRUNED collapses don't count)

## Technical Notes

- **Stack:** Vite + TypeScript (strict), Canvas 2D rendering, WebAudio synthesis
- **Resolution:** 1152×720 logical (24×13 tiles at 48px + 96px HUD), letterboxed
- **Post-processing:** Canvas 2D bloom fallback (1/4 scale blur, additive composite), vignette, film grain
- **Deterministic:** Fixed 60Hz timestep, seeded PRNG for gameplay logic
- **No external assets:** All visuals are procedural vector drawing, all audio is WebAudio synthesis
- **Fonts (pre-made):** Orbitron, Rajdhani, Exo 2 (bundled via @fontsource, no CDN)

## Debug Mode

Add `?debug` to the URL. Overlays colliders, timers, and coherence values.
- **N** — Skip to next room
- **G** — Grant full coherence

## Design Decisions

- Unity was specified in the concept PDF but we built for the web to be instantly playable in a browser
- The Coherence drain rate is a single 8/s (not stacked) when either split or beacon is active
- Camera warning times: 0.5s for controlled avatar, 1.75s for passive clone (giving time to react)
- Bait collapse costs 15 Coherence but does NOT count as a MEASURED event

## License

Built for Quriosity: A Quantum Game Jam.
