// Coherence (decoherence meter) system
import {
  COHERENCE_MAX,
  COHERENCE_DRAIN,
  COHERENCE_REGEN,
  COHERENCE_REGEN_LOCKOUT,
} from '../core/constants';

export interface CoherenceState {
  value: number;
  regenLockoutTimer: number;
  isDraining: boolean;
}

export function createCoherenceState(): CoherenceState {
  return {
    value: COHERENCE_MAX,
    regenLockoutTimer: 0,
    isDraining: false,
  };
}

/** Update coherence each frame.
 * drainActive: true when split or beacon active (single 8/s rate, not stacked)
 */
export function updateCoherence(state: CoherenceState, dt: number, drainActive: boolean): void {
  state.isDraining = drainActive;
  
  if (drainActive) {
    state.value -= COHERENCE_DRAIN * dt;
  } else if (state.regenLockoutTimer <= 0) {
    state.value += COHERENCE_REGEN * dt;
  }
  
  // Update lockout
  if (state.regenLockoutTimer > 0) {
    state.regenLockoutTimer -= dt;
  }
  
  // Clamp
  state.value = Math.max(0, Math.min(COHERENCE_MAX, state.value));
}

/** Apply regen lockout (after forced collapse) */
export function applyRegenLockout(state: CoherenceState): void {
  state.regenLockoutTimer = COHERENCE_REGEN_LOCKOUT;
}

/** Get coherence as 0-1 fraction */
export function getCoherenceFraction(state: CoherenceState): number {
  return state.value / COHERENCE_MAX;
}

/** Get threshold level: 0 = normal, 1 = light static (60%), 2 = desat (30%), 3 = heavy (10%) */
export function getCoherenceThreshold(state: CoherenceState): number {
  const pct = (state.value / COHERENCE_MAX) * 100;
  if (pct <= 10) return 3;
  if (pct <= 30) return 2;
  if (pct <= 60) return 1;
  return 0;
}

/** Deduct coherence, returns new value */
export function deductCoherence(state: CoherenceState, amount: number): number {
  state.value = Math.max(0, state.value - amount);
  return state.value;
}
