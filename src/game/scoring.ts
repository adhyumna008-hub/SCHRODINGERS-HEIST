// Scoring system: stars per room
export interface RoomScore {
  breach: boolean;     // Star 1: reached the exit
  efficient: boolean;  // Star 2: >= 40% coherence left
  undetected: boolean; // Star 3: zero MEASURED events (bait doesn't count)
  time: number;        // seconds
  finalCoherence: number;
  measuredCount: number;
}

/** Calculate stars from a room completion */
export function calculateStars(
  finalCoherence: number,
  maxCoherence: number,
  measuredCount: number,
  time: number
): RoomScore {
  return {
    breach: true, // if this function is called, exit was reached
    efficient: (finalCoherence / maxCoherence) >= 0.4,
    undetected: measuredCount === 0,
    time,
    finalCoherence,
    measuredCount,
  };
}

/** Get star count (1-3) */
export function getStarCount(score: RoomScore): number {
  let count = 0;
  if (score.breach) count++;
  if (score.efficient) count++;
  if (score.undetected) count++;
  return count;
}

/** Format time as M:SS */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
