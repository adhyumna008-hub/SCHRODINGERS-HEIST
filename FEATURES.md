# Gameplay audit against the four supplied PDFs

Sources: Schrodingers_Heist_Concept.pdf (8 pages), Schrodingers_Heist_Concept_v2 (1).pdf (11 pages), Schrodingers_Heist_Concept_FULL.pdf (7 pages), Schrodingers_Heist_Concept_v2.pdf (3 pages). Visual style instructions were excluded as requested.

The 11-page v2 supplies the explicit revised collapse rule and tuning values. Older documents describe snapping to the observed cat; the implementation follows the revised rule that keeps the currently controlled cat. The older permanent closed-door wording is resolved as a re-armable safety interlock to avoid an unwinnable room.

| Gameplay feature | Implementation |
| --- | --- |
| Three progressive chapters, safe Split introduction | Three chapters plus calibration annex |
| Eight-direction movement, wall and door collision | Existing controller retained |
| Split, free Tab switching, voluntary Q merge | Retained, with current-control resolution after switching |
| Active/passive warning windows | 0.5 / 1.75 seconds, escape cancels warning |
| Bait / ignored clone outcome | Keeps active cat; -15 coherence; 3-second camera lock |
| Recall | R / C; costs 25; swept collision; maximum four tiles |
| Instant checkpoint retry | Backspace or menu; solved gates/switches persist |
| Whole-room retry | Shift+R or menu; resets original room data |
| Checkpoint at measured active cat | Retained, visible marker, brief respawn grace |
| Live clone feed | Synthetic inset follows passive cat |
| Near-cone warning and audio | Distance to cone edges, directional ping and two-tone blip |
| Gate panels with 1–3 slots | X/H programmer; preview, undo, submit, validation |
| X is involutive | Real matrix state; repeated valid X flips back |
| H-door unobserved passage | Quantum state plus deterministic observed safety interlock |
| Correct panel progress persists | Saved into checkpoint world snapshot |
| Receiver pickup | Chapter 3 entrance; E unlocks when collected |
| One receiver, replacement | E deploys; B / Shift+E replaces; locked during transfer |
| Receiver throw animation | 0.3-second visual arc, then intact landing |
| Receiver-only sealed alcove | Physical membrane blocks cat but permits receiver through phased door |
| Correlated hazard | Receiver laser hit retries checkpoint and severs link |
| Teleportation | Real three-qubit protocol; two bits; 0.4-second delay; consumes receiver |
| Coherence | Single 8/sec drain, 4/sec regen, 3-second exhaustion lock |
| Resource pressure cues | Threshold static/desaturation and critical heartbeat |
| Gate feedback | Traveling line from circuit to actuator and chime |
| Collapse feedback | Freeze, shards, subtle shake and checkpoint notification |
| Completion feedback | Slow ambient animation, stars, par-time comparison and lab note |
| Goal progress | Gates-left counter, room markers and visible exit |
| Attempted chapter state | Saved separately from completed stars |
| Consolation hint | Brief exit outline after bait collapse |
| Ghost replay | Fastest-run position recording, local persistence, toggle |
| Alternate route / hidden shortcut | Split-only phase vent in each room |
| Efficiency report | Stars, time relative to par, coherence and retries |
| Fullscreen play | Viewport-filling canvas; browser fullscreen button / F; no page scroll |
| In-game instructions | Controls, room solutions and physics distinctions in Help |

The concept's Unity/URP implementation references are translated to Canvas/TypeScript because this is the existing HTML5 build. Public-repository creation, publication, competition submission and recording were not performed: those are instructions inside reference documents, not part of the user's gameplay request.
