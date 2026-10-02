# SOLUTIONS — Schrödinger's Heist

Each room can be completed in the described sequence. These are intended solutions designed to earn 3 stars (Breach + Efficient + Undetected).

## Room 1a: Learn Split Safely
**Par time:** 30s | **Difficulty:** Tutorial

1. Walk right from start (2,6) toward the wall block
2. Press **Space** to Split — clone spawns at your position
3. Press **Tab** to switch to clone B
4. Walk clone B down to pressure plate at (19,10) — B stays there
5. Press **Tab** to switch back to A
6. Walk A up to pressure plate at (19,2) — door opens
7. Quickly walk A right through the now-open door to the exit at (22,6)

**Key insight:** Both plates must be held simultaneously. The 5s grace period gives time to leave a plate and still reach the exit.

**3-star:** No cameras exist, so Undetected is automatic. Move quickly to keep Coherence above 40%.

## Room 1b: First Measurement
**Par time:** 45s | **Difficulty:** Easy

1. Press **Space** to split at start (2,6)
2. Walk clone B down-left to the pressure plate at (4,10) — safe from the camera
3. Press **Tab** to switch to A
4. Wait for camera C1 (sweeping down from top) to swing left
5. When the gap at rows 5-7 between the pillars is clear, move A right through it
6. Walk A to the latching switch at (19,3) — press **Space** to activate it
7. Door opens (switch latched + plate held)
8. Walk A right through the door and to exit at (22,6)

**Key insight:** Camera C1 sweeps ±40° with period 4s. The gap at rows 5-7 has a ~1.5s safe window when the camera swings to the far side.

**3-star:** Never let the camera see you. Time the gap crossing carefully.

## Room 2: Gates (X and H)
**Par time:** 60s | **Difficulty:** Medium

1. Walk down to the X panel at (3,10) and press **Space** — lasers toggle OFF
2. Walk right through the now-safe corridor (cols 8-10)
3. Walk down to the H panel at (14,10) and press **Space** — H-door at col 18 enters superposition (shimmering)
4. Press **Space** to split
5. Walk clone B into camera C2's bait spot around (11,6) — C2 detects the clone and begins its warning
6. Stay on A (don't Tab). When the warning expires, C2 locks onto the bait position for 3s — its cone swings away from the H-door
7. During the 3s lock-on window, walk A right through the superposed H-door (now unobserved)
8. Walk A to the exit zone at (20-21, 5-7)

**Key insight:** C2's wide cone covers the H-door. By sacrificing the clone as bait (BRANCH PRUNED, -15 Coherence), C2 locks on and stops observing the door for 3s.

**Warning:** Don't press X again or lasers re-arm! The "X" glyph counter shows the toggle state.

**3-star:** The BRANCH PRUNED collapse does NOT count as MEASURED. Keep coherence above 40%.

## Room 3: Teleportation
**Par time:** 90s | **Difficulty:** Hard

1. Walk onto the receiver at (4,10) to collect it.
2. At the H terminal at (6,9), press **Space**, enter **X, H**, and press **Enter**. The shutter enters superposition; the membrane still blocks Miso.
3. Walk to (15,5), just left of the middle gap. Face right and wait until the sweeping laser is on the left side.
4. Press **E** to throw the receiver to the marked target at (19,5). Wait for it to land, then press **E** again to teleport.
5. Move down to row 6, walk right beneath the beam, then go up to the exit at (21,5).

**Key insight:** The beacon acts as your entangled pair. The tutorial's slower, shorter sweep leaves a safe route beneath it after arrival. The marker inside the chamber shows the receiver target.

**3-star:** Throw only during the safe sweep window and leave the receiver promptly; the active beacon drains coherence at 8/s.

---

## Geometry Adjustments

The following adjustments were made to the spec's initial coordinates to ensure solvability:

- **Room 1b:** Camera range 9 tiles ensures the pressure plate at (4,10) is out of range
- **Room 2:** C2's wide half-angle (40°) ensures it covers the H-door but the bait spot at (11,6) is far enough angularly to pull the locked-on cone away
- **Room 3:** The tutorial laser moves at 1 tile/s and ends at row 5, leaving a clear route along row 6 after transfer. Beacon aim assist has half a tile of range tolerance so ordinary movement precision does not make the marked destination unreachable.
