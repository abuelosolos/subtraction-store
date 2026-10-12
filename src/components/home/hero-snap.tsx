"use client";

import { useEffect } from "react";

import { SNAP_DOWN_MS, SNAP_UP_MS, decideSnap, easeInOutCubic } from "@/lib/hero-snap";

/** Quiet period after a jump, so trackpad inertia does not start a second one. */
const COOLDOWN_MS = 150;

const KEY_STEP: Record<string, 1 | -1> = {
  ArrowDown: 1,
  PageDown: 1,
  " ": 1,
  ArrowUp: -1,
  PageUp: -1,
};

/**
 * Landing page only: from md up, one scroll gesture moves between the hero and
 * the category section (#categories) and back, as a quick snap. Below the
 * categories scrolling is untouched. Off for phones and reduced motion.
 */
export function HeroSnap() {
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 48rem)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let animating = false;
    let lockedUntil = 0;

    const enabled = () => wide.matches && !reduced.matches;

    // The section's top edge. The hero is then fully above the viewport, so the
    // navbar switches to its solid (black) state; the bar covers only the
    // section's top padding, not its tiles.
    const target = () => {
      const section = document.getElementById("categories");
      if (!section) return 0;
      return Math.max(0, section.getBoundingClientRect().top + window.scrollY);
    };

    const cancel = () => {
      cancelAnimationFrame(raf);
      animating = false;
    };

    const animateTo = (to: number, duration: number) => {
      cancel();
      const from = window.scrollY;
      const start = performance.now();
      animating = true;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        window.scrollTo(0, from + (to - from) * easeInOutCubic(t));
        if (t < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          animating = false;
          lockedUntil = performance.now() + COOLDOWN_MS;
        }
      };
      raf = requestAnimationFrame(tick);
    };

    /** Returns true when the input was taken over. */
    const handle = (deltaY: number) => {
      if (animating || performance.now() < lockedUntil) return true;
      const t = target();
      const move = decideSnap({ scrollY: window.scrollY, target: t, deltaY });
      if (!move) return false;
      if (move === "down") animateTo(t, SNAP_DOWN_MS);
      else animateTo(0, SNAP_UP_MS);
      return true;
    };

    const onWheel = (e: WheelEvent) => {
      if (!enabled() || e.ctrlKey || e.metaKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if ((e.target as Element | null)?.closest?.(".navbar")) return;
      // Inertia from a finished jump is swallowed, but only where a jump could
      // have started; below the categories it must not block normal scrolling.
      if (!animating && performance.now() < lockedUntil) {
        if (window.scrollY <= target() + 4) e.preventDefault();
        return;
      }
      if (handle(e.deltaY)) e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!enabled() || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const step = KEY_STEP[e.key];
      if (!step) return;
      // Only when nothing interactive has focus (page-level scrolling).
      const active = document.activeElement;
      if (active && active !== document.body) return;
      if (handle(step * 100)) e.preventDefault();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    // The user grabbing the scrollbar or touching the screen takes over.
    window.addEventListener("pointerdown", cancel);
    window.addEventListener("touchstart", cancel, { passive: true });

    return () => {
      cancel();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", cancel);
      window.removeEventListener("touchstart", cancel);
    };
  }, []);

  return null;
}
