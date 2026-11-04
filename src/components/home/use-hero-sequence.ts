"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { trackEvent } from "@/lib/track";

/**
 * idle      server render / before mount
 * entrance  the one-shot entrance video is playing
 * loop      the loop video is playing (or held on its first frame)
 * fallback  video unavailable (autoplay blocked, error, Save-Data): poster only
 */
export type HeroPhase = "idle" | "entrance" | "loop" | "fallback";

/** Start the hand-off this long before the entrance ends so no frame is skipped. */
const HANDOFF_LEAD_SECONDS = 0.1;

/** The entrance clip is sped up to take this long on screen. */
const ENTRANCE_SECONDS = 4;

function fitEntranceSpeed(video: HTMLVideoElement) {
  if (video.duration > 0 && Number.isFinite(video.duration)) {
    video.playbackRate = video.duration / ENTRANCE_SECONDS;
  }
}

function debug(message: string, extra?: unknown) {
  if (process.env.NODE_ENV !== "production") console.debug(`[hero] ${message}`, extra ?? "");
}

export function useHeroSequence() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const entranceRef = useRef<HTMLVideoElement | null>(null);
  const loopRef = useRef<HTMLVideoElement | null>(null);
  // Callback refs: stable, and keep the ref objects out of what components read in render.
  const setSection = useCallback((el: HTMLElement | null) => void (sectionRef.current = el), []);
  const setEntrance = useCallback((el: HTMLVideoElement | null) => void (entranceRef.current = el), []);
  const setLoop = useCallback((el: HTMLVideoElement | null) => void (loopRef.current = el), []);

  const [phase, setPhaseState] = useState<HeroPhase>("idle");
  const [overlaysVisible, setOverlaysVisible] = useState(false);
  const [entranceReady, setEntranceReady] = useState(false); // entrance can play: fade it in over the poster
  const [entranceShown, setEntranceShown] = useState(true); // entrance layer is on top
  const [loopShown, setLoopShown] = useState(false); // loop layer is opaque (under the entrance)

  const phaseRef = useRef<HeroPhase>("idle");
  const completedRef = useRef(false); // entrance hand-off fired (once per mount)
  const reducedRef = useRef(false);
  const onScreenRef = useRef(true);

  const setPhase = useCallback((next: HeroPhase) => {
    if (phaseRef.current !== next) debug(`${phaseRef.current} -> ${next}`);
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const toFallback = useCallback(
    (hideEntrance: boolean) => {
      setPhase("fallback");
      setOverlaysVisible(true);
      if (hideEntrance) setEntranceShown(false);
    },
    [setPhase],
  );

  const startLoop = useCallback(() => {
    const loop = loopRef.current;
    if (!loop) return toFallback(false);
    setLoopShown(true);
    loop.currentTime = 0;
    // Off-screen: the intersection observer starts it when it comes back.
    if (!onScreenRef.current) return;
    loop.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toFallback(false);
    });
  }, [toFallback]);

  const completeEntrance = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    trackEvent("hero_entrance_complete");
    setOverlaysVisible(true);
    startLoop();
  }, [startLoop]);

  // Whole sequence restarts on every mount; nothing is remembered between visits.
  // Mount-time sync with browser state (reduced motion, Save-Data, autoplay), so the
  // state it sets is the point of the effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const entrance = entranceRef.current;
    const loop = loopRef.current;
    let cancelled = false;
    completedRef.current = false; // state is per-mount, so it already starts from scratch

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reducedRef.current = reduced;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const saveData = connection?.saveData === true;

    const stop = () => {
      entrance?.pause();
      loop?.pause();
    };

    if (saveData) {
      stop();
      toFallback(true);
      return stop;
    }

    if (reduced) {
      // No entrance: hold the loop on its first frame and show everything.
      entrance?.pause();
      loop?.pause();
      if (loop) loop.currentTime = 0;
      completedRef.current = true;
      setEntranceShown(false);
      setLoopShown(true);
      setPhase("loop");
      setOverlaysVisible(true);
      return stop;
    }

    setPhase("entrance");
    trackEvent("hero_entrance_start");
    if (entrance) {
      // Hydration can happen after the browser's own autoplay started or buffered.
      entrance.muted = true;
      entrance.currentTime = 0;
      fitEntranceSpeed(entrance);
      if (entrance.readyState >= 3) setEntranceReady(true);
      entrance.play().catch((error: unknown) => {
        // pause()/remount (dev Strict Mode, fast navigation) interrupts play(): not a block.
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) return;
        trackEvent("hero_autoplay_blocked");
        toFallback(true);
      });
    } else {
      toFallback(true);
    }

    const section = sectionRef.current;
    let io: IntersectionObserver | undefined;
    if (section && "IntersectionObserver" in window) {
      io = new IntersectionObserver(([entry]) => {
        onScreenRef.current = entry.isIntersecting;
        if (!loop) return;
        if (entry.isIntersecting) {
          // Resume (or start, if the hand-off happened while off-screen).
          if (completedRef.current && phaseRef.current !== "fallback" && !reducedRef.current) {
            loop.play().catch(() => {});
          }
        } else if (completedRef.current) {
          loop.pause();
        }
      });
      io.observe(section);
    }

    return () => {
      cancelled = true;
      io?.disconnect();
      stop();
      completedRef.current = false;
      phaseRef.current = "idle";
    };
  }, [setPhase, toFallback]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const entranceProps = {
    onLoadedMetadata: (event: React.SyntheticEvent<HTMLVideoElement>) =>
      fitEntranceSpeed(event.currentTarget),
    onCanPlay: () => setEntranceReady(true),
    onEnded: completeEntrance,
    onTimeUpdate: (event: React.SyntheticEvent<HTMLVideoElement>) => {
      const video = event.currentTarget;
      if (
        phaseRef.current === "entrance" &&
        video.duration > 0 &&
        video.duration - video.currentTime <= HANDOFF_LEAD_SECONDS
      ) {
        completeEntrance();
      }
    },
    onError: () => toFallback(true),
  };

  const loopProps = {
    // First frame of the loop on screen: now the entrance layer can go.
    onPlaying: () => {
      if (phaseRef.current === "entrance" && completedRef.current) {
        setPhase("loop");
        setEntranceShown(false);
        trackEvent("hero_loop_start");
      }
    },
    onError: () => {
      if (phaseRef.current !== "fallback") toFallback(!completedRef.current);
    },
  };

  return {
    phase,
    overlaysVisible,
    entranceReady,
    entranceShown,
    loopShown,
    setSection,
    setEntrance,
    setLoop,
    entranceProps,
    loopProps,
  };
}

export type HeroSequence = ReturnType<typeof useHeroSequence>;
