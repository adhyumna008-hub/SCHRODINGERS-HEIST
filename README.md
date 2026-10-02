# Schrödinger’s Heist — The Millikelvin Vault

A full-window, procedural Canvas 2D quantum stealth game. 15 sectors across three story acts, a voiced eight-shot opening and a ten-shot ending. The existing foil-cat / cryogenic-vault art direction is retained.

## Play

Open `dist/index.html` in a desktop browser. It is a self-contained HTML file with inline JavaScript, CSS, procedural graphics and synthesized sound. No server or external assets are needed. The game fits the browser window without scrolling. Press **F** or the Fullscreen button for browser fullscreen; Escape exits it where supported. A keyboard is required.

```sh
npm install
npm run dev
npm test
npm run build
```

The build type-checks TypeScript and packages a standalone `dist/index.html`. The root HTML is the development entry. Vite development preview: http://127.0.0.1:3000.

## Miso & the Null Protocol

Miso, the laboratory cat, accidentally opens the quantum computer’s return channel and wakes inside it as a foil familiar. A virus called Null is deleting the computer’s memories. ADA, its surviving intelligence, guides Miso through fifteen sectors to repair the system, purge the core, and return home.

Begin plays a voiced, eight-shot procedural 2.5D film with a wide lab establishing shot, cat close-up, console insert, overhead transfer, tunnel, virus reveal, dialogue shot and final tracking view. Space advances a shot; P pauses; Escape skips. Replay story is available from the toolbar. Reduced-motion settings retain all scenes and captions with static cameras. The ten-shot ending follows sector 15: purge, transfer home, reunion with Doctor Lin, the laboratory celebrating Miso, then a disconnected monitor and three glimpses of an unidentified threat. Only claw tips and an eye slit are visible. Its final line is followed by a silent hard cut and “To be continued.” Replay finale unlocks after completing sector 15.

ADA offers progressively stronger room-specific hints after 2, 4 and 6 retries, circuit rejections or forced split-coherence collapses. Failure history survives room restarts and browser reloads. Hints pause play and never penalize stars. The Hint button lets players request all three tiers immediately.

## Anime-inspired 2.5D animation

The opening and ending use a painted laboratory backdrop with independent foreground framing, characters, rain, dust and camera layers. Code-drawn cel-shaded character rigs provide Miso’s blinking eyes, articulated tail and gait, ear and head motion, three-quarter and rear views, reaching paw, jump, portal tumble, landing squash and a sleeping pose. Researcher rigs use two-bone arm IK for applause, cheering and petting, facial expressions, blinking and mouth movement driven by 24 Hz amplitude envelopes from the embedded dialogue. This is amplitude-driven mouth animation, not phoneme-level lip synchronization.

The quantum corridor uses perspective projection and depth-sorted architecture. Action beats use eased anticipation, impact and recovery, while the camera interpolates smoothly and character poses update at 24 fps. All scenes remain seekable and deterministic: pause freezes the visual pose and skip moves directly to the next shot. Reduced motion disables camera travel and large spatial effects. The last threat stays cropped to fragments in darkness, followed by a silent hard cut.

The background was generated with the built-in image tool and is embedded in the build. Art source and exact prompt: src/assets/ART-DIRECTION.md. Animation code: src/render/anime-actors.ts, anime-scenes.ts and animation.ts. Rebuilding the voices also refreshes their amplitude envelopes.

## Voice-over and narrative objectives

47 prerecorded synthetic voice clips are embedded in the standalone HTML, covering both films and all 15 briefings/debriefings. Narrator, ADA, and Doctor Lin use distinct installed Windows voices; Null and the unidentified threat have pitch and echo processing. No runtime speech service, network call or speech-engine installation is required. V toggles narration, M mutes all audio, and captions remain available. Pausing, skipping, switching scenes and returning to gameplay stop or synchronize the current recording. A blocked-autoplay button lets the player enable voice explicitly.

Three mandatory memory archives anchor the return journey: Identity at the upper plate in sector 5, Destination inside sector 10, and the Return Key inside sector 13. Collection survives checkpoint retries. Exits require their archive. Unindexed marks in sectors 7, 11 and 14 foreshadow an unexplained signal. Sector 15 requires all circuits, then the upper ISOLATE switch, then the lower PURGE switch before escape.

The script lives in src/story/script.json. To regenerate recordings on Windows, run scripts/generate-voices.ps1 with PowerShell; it uses installed SAPI voices and scripts/process-voices.mjs to resample and process the output. The generated src/assets/voices.json is checked in so ordinary builds are platform-independent. The standalone file is approximately 16 MB because the narration is included as uncompressed WAV rather than streamed.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Space | Nearby circuit / switch / phase vent; otherwise split |
| Tab | Switch controlled cat |
| Q | Merge into the controlled cat |
| R or C | Recall the other cat up to four tiles, costing 25 coherence; blocked by walls |
| E | Throw receiver / transfer after it lands (chapter 3) |
| B or Shift+E | Replace receiver |
| Backspace | Retry checkpoint, retaining solved circuits and switches |
| Shift+R | Restart the entire room |
| Escape | Pause; close an open dialog |
| F / M | Fullscreen / mute |

Circuit programmer: select X/H buttons or type X/H, Backspace removes a slot, Enter submits, Escape cancels. The simulation pauses while programming. The engraved sequence indicates the circuit wiring. Incorrect sequences preview the math but leave the physical outputs unchanged. Re-applying X twice returns the laser bank to its initial state.

## Room flow

- **Calibration:** reach the upper-right plate, split there, and guide one cat to the lower plate. The exit remains open for five seconds after a plate is released.
- **Witness Gallery:** leave a cat on the lower-left plate, reach the upper-right switch, then the exit. Time the camera sweep or use the phase-vent route.
- **Switchyard:** program X to disable the laser bank. At the phase shutter enter X, X, H. An observer closes the safety lock; bait the observer or time its sweep before re-arming the door.
- **Sealed Receiver:** collect the receiver near the entrance. Program X, H. Approach the gap, face right and throw the receiver across the membrane. Wait for it to land, then press E again. A moving laser threatens the receiver and the transferred cat. A vent shortens the approach without bypassing the sealed chamber.

The in-game How to play screen contains the complete guide. The original tutorial rooms and Twin Memory have optional split-only vent shortcuts. Sectors 6–8 introduce different circuit sequences and corridor approaches. Sectors 9–15 combine sealed receivers, firewall banks and moving lasers. The final sector requires three repaired circuits and the core purge switch.

## Awareness, failure and retry

The active cat has a 0.5-second camera warning; the unattended cat has 1.75 seconds. Switching does not shorten a warning already in progress. At expiry, the currently controlled cat survives. If it was measured, its location becomes a checkpoint. If a passive cat was sacrificed, coherence drops by 15 and the camera watches its location for three seconds. A brief exit hint follows baiting.

Threat pings measure distance to the raycast cone, not the camera body, and play a distinct blip within three tiles. The live synthetic decoy feed and timer rings help track the other cat.

Coherence drains at 8/sec while split or a receiver is active, never double-counted; it recovers at 4/sec otherwise. Zero triggers forced collapse/link loss and a three-second recovery lock. Low coherence adds static, desaturation and a heartbeat. Failed receiver hazards retry the checkpoint. Retries preserve circuit and switch progress, with a short grace period to escape a dangerous checkpoint. Whole-room restart restores the original puzzle.

## Replay and scoring

Three stars: breach the exit, retain at least 40% coherence, and finish with no measured events. Best stars and fastest-run time, coherence and ghost path are stored locally. The Ghost button toggles the saved route. Chapter selection shows locked, attempted and completed rooms. Clear cards include par times, retries and lab notes. The final report combines stars, pace and coherence into Quantum Efficiency. Browser storage restrictions fall back to session memory.

## Quantum fidelity

X/H/Z use real-amplitude matrix multiplication. This is sufficient for the gate set used. The three-qubit teleportation simulator prepares an entangled pair, performs Bell measurement, sends two classical result bits and applies conditional X/Z correction. The state vector is visible in the HUD and circuit preview.

An H-door measurement samples squared amplitudes, but the facility's **classical safety interlock** closes the physical door regardless of that sample. Re-arming resets the interlocked register before applying the programmed circuit. This gives the PDFs' deterministic observation puzzle without presenting forced closure as a quantum measurement law.

Independent cats, chosen survivors, passable superposed doors, spatial transfer, phase vents, shared beacon damage and the coherence energy budget are gameplay abstractions. Entanglement does not send damage or information instantly. These distinctions are also in the in-game field notes.

## Validation and scope

Campaign tests drive actual movement, circuit keyboard input, split plates, beacon transfer and final purge through all eleven added rooms with hazards enabled. They also verify hint persistence, all-circuit exit requirements and cinematic timing. The tests cover quantum identities and all teleportation outcomes, input-driven calibration, circuit input, progress-preserving retries, wall-safe Recall, beacon pickup/replacement/flight, hazard correlation, observer interlocks, threat distance, vent access and saved runs. Browser checks cover the full-window layout, menus, help and packaged build. A full manual playthrough of every alternate route has not been performed.

See `FEATURES.md` for the PDF-to-implementation audit and conflicts resolved. PDF visual instructions and submission/publication instructions are outside this change. No external images, fonts or audio are requested at runtime. Embedded synthetic voice recordings are generated locally.

Debug query `?debug` unlocks chapter selection. N completes the room and G restores coherence; these do not operate in ordinary play.
