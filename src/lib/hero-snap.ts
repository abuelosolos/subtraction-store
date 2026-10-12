/**
 * Landing page: the hero and the category section are two snap stops. Pure
 * decision logic, so the wheel handler in `components/home/hero-snap.tsx` stays thin.
 */

/** Pixels either side of the category stop that still count as "at" it. */
export const SNAP_EPSILON = 4;

/** A quick, decisive jump either way. */
export const SNAP_DOWN_MS = 380;
export const SNAP_UP_MS = 320;

export type SnapMove = "down" | "up" | null;

/**
 * @param scrollY current scroll position
 * @param target  scroll position that puts the category section at the top of the viewport
 * @param deltaY  wheel (or key) step: positive scrolls down
 * @returns where to jump, or null to leave scrolling to the browser
 */
export function decideSnap({
  scrollY,
  target,
  deltaY,
}: {
  scrollY: number;
  target: number;
  deltaY: number;
}): SnapMove {
  if (deltaY === 0 || target <= 0) return null;

  if (scrollY < target - SNAP_EPSILON) {
    if (deltaY > 0) return "down";
    return scrollY > 0 ? "up" : null;
  }
  if (scrollY <= target + SNAP_EPSILON) return deltaY < 0 ? "up" : null;

  // Below the category stop: free scrolling, except a step that would cross
  // back above it lands on the hero.
  return deltaY < 0 && scrollY + deltaY < target ? "up" : null;
}

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
