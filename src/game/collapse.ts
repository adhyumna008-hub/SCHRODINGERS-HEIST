// Collapse system: handles measurement, branch pruning, forced collapse
import { BAIT_COHERENCE_COST, BAIT_LOCKOUT_TIME, COLLAPSE_FREEZE_TIME } from '../core/constants';
import { Avatar, SecurityCamera, Vec2 } from './types';
import { cancelWarning } from './avatar';
import { startLockOn } from './camera';
import { deductCoherence, applyRegenLockout, CoherenceState } from './coherence';

export interface CollapseResult {
  type: 'measured' | 'branchPruned' | 'forcedCoherence' | 'voluntary';
  keptAvatar: Avatar;
  removedAvatar: Avatar | null;
  coherenceCost: number;
  cameraLockTarget: Vec2 | null;
  freezeTime: number;
}

/**
 * Perform a collapse event.
 * @param controlled - The avatar currently being controlled
 * @param seen - The avatar that was seen (null for coherence/voluntary collapse)
 * @param allAvatars - Array of all current avatars
 * @param cameras - All security cameras  
 * @param coherence - Coherence state to mutate
 * @returns CollapseResult describing what happened
 */
export function performCollapse(
  controlled: Avatar,
  seen: Avatar | null,
  allAvatars: Avatar[],
  cameras: SecurityCamera[],
  coherence: CoherenceState,
): CollapseResult {
  // Always keep the controlled avatar
  const kept = controlled;
  const removed = allAvatars.find(a => a !== kept) ?? null;
  
  let type: CollapseResult['type'];
  let coherenceCost = 0;
  let cameraLockTarget: Vec2 | null = null;
  
  if (seen === null) {
    // Voluntary decohere (Q) or forced coherence collapse
    if (coherence.value <= 0) {
      type = 'forcedCoherence';
      applyRegenLockout(coherence);
    } else {
      type = 'voluntary';
    }
  } else if (seen === kept) {
    // Controlled avatar was seen and stayed seen → MEASURED
    type = 'measured';
  } else {
    // Passive clone was seen → BRANCH PRUNED (bait)
    type = 'branchPruned';
    coherenceCost = BAIT_COHERENCE_COST;
    deductCoherence(coherence, coherenceCost);
    
    // Lock on the camera that saw the clone
    if (seen.warning.sourceCamera >= 0 && seen.warning.sourceCamera < cameras.length) {
      const cam = cameras[seen.warning.sourceCamera];
      cameraLockTarget = { x: seen.pos.x, y: seen.pos.y };
      startLockOn(cam, { 
        x: seen.pos.x, 
        y: seen.pos.y 
      }, BAIT_LOCKOUT_TIME);
    }
  }
  
  // Destroy the removed avatar
  if (removed) {
    removed.alive = false;
    cancelWarning(removed);
  }
  
  // Cancel any warning on the kept avatar
  cancelWarning(kept);
  
  return {
    type,
    keptAvatar: kept,
    removedAvatar: removed,
    coherenceCost,
    cameraLockTarget,
    freezeTime: type === 'voluntary' ? 0 : COLLAPSE_FREEZE_TIME,
  };
}

/** Check if this collapse should increment the MEASURED counter */
export function isMeasuredEvent(result: CollapseResult): boolean {
  return result.type === 'measured';
}

/** Check if checkpoint should move (only on MEASURED) */
export function shouldMoveCheckpoint(result: CollapseResult): boolean {
  return result.type === 'measured';
}
