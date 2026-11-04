"use client";

/* The hook's handlers read refs only when events fire, never during render; the compiler lint can't see that through the returned object. */
/* eslint-disable react-hooks/refs */

import Image from "next/image";
import { createContext, useContext } from "react";

import "@/styles/hero-sequence.css";
import { trackEvent } from "@/lib/track";

import { useHeroSequence, type HeroSequence as HeroSequenceState } from "./use-hero-sequence";

const HeroSequenceContext = createContext<HeroSequenceState | null>(null);

export function useHeroSequenceState() {
  const value = useContext(HeroSequenceContext);
  if (!value) throw new Error("useHeroSequenceState must be used inside <HeroSequence>");
  return value;
}

/**
 * The hero <section>. Owns the sequence state; children (server-rendered overlays)
 * opt into the staggered reveal with `data-reveal` and a `--ri` index.
 */
export function HeroSequence({
  children,
  className,
  ...rest
}: React.ComponentProps<"section">) {
  const sequence = useHeroSequence();

  return (
    <HeroSequenceContext.Provider value={sequence}>
      <section
        {...rest}
        ref={sequence.setSection}
        className={className}
        data-hero-phase={sequence.phase}
        data-overlays={sequence.overlaysVisible ? "on" : "off"}
        onClick={(event) => {
          const target = (event.target as HTMLElement).closest<HTMLElement>("[data-hero-click]");
          if (target) trackEvent("hero_overlay_click", { button: target.dataset.heroClick });
        }}
      >
        {children}
      </section>
    </HeroSequenceContext.Provider>
  );
}

/** Poster + loop + entrance layers, in the slot the static hero image used to fill. */
export function HeroMedia({
  poster,
  alt,
  entranceSrc,
  loopSrc,
}: {
  poster: string;
  alt: string;
  entranceSrc: string;
  loopSrc: string;
}) {
  const s = useHeroSequenceState();

  return (
    <div className="hero-media">
      <Image
        src={poster}
        alt={alt}
        fill
        sizes="(min-width: 1280px) 1280px, 100vw"
        priority
        style={{ objectFit: "cover", objectPosition: "50% 30%" }}
      />
      <video
        ref={s.setLoop}
        src={loopSrc}
        poster={poster}
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        data-on={s.loopShown}
        {...s.loopProps}
      />
      <video
        ref={s.setEntrance}
        src={entranceSrc}
        poster={poster}
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        data-on={s.entranceReady && s.entranceShown}
        {...s.entranceProps}
      />
    </div>
  );
}
