import { describe, expect, it } from "vitest";

import { decideSnap, easeInOutCubic } from "@/lib/hero-snap";

const target = 600;

describe("decideSnap", () => {
  it("jumps to the categories when scrolling down in the hero", () => {
    expect(decideSnap({ scrollY: 0, target, deltaY: 100 })).toBe("down");
    expect(decideSnap({ scrollY: 300, target, deltaY: 40 })).toBe("down");
  });

  it("jumps back to the hero when scrolling up between the stops", () => {
    expect(decideSnap({ scrollY: 300, target, deltaY: -40 })).toBe("up");
  });

  it("does nothing at the very top when scrolling up", () => {
    expect(decideSnap({ scrollY: 0, target, deltaY: -100 })).toBeNull();
  });

  it("at the categories stop: up returns to the hero, down scrolls normally", () => {
    expect(decideSnap({ scrollY: 600, target, deltaY: -100 })).toBe("up");
    expect(decideSnap({ scrollY: 602, target, deltaY: 100 })).toBeNull();
  });

  it("below the stop scrolls freely", () => {
    expect(decideSnap({ scrollY: 1200, target, deltaY: 100 })).toBeNull();
    expect(decideSnap({ scrollY: 1200, target, deltaY: -100 })).toBeNull();
  });

  it("a step that would cross above the stop lands on the hero", () => {
    expect(decideSnap({ scrollY: 650, target, deltaY: -100 })).toBe("up");
  });

  it("ignores zero deltas and a missing target", () => {
    expect(decideSnap({ scrollY: 100, target, deltaY: 0 })).toBeNull();
    expect(decideSnap({ scrollY: 100, target: 0, deltaY: 100 })).toBeNull();
  });
});

describe("easeInOutCubic", () => {
  it("runs from 0 to 1 and never goes backwards", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    let prev = 0;
    for (let t = 0.05; t <= 1; t += 0.05) {
      const v = easeInOutCubic(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});
