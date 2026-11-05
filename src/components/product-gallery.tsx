"use client";

import Image from "next/image";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import type { Image as Img } from "@/lib/catalog";

type GalleryState = { images: Img[]; active: number; setActive: (i: number) => void };
const GalleryContext = createContext<GalleryState | null>(null);

function useGallery() {
  const ctx = useContext(GalleryContext);
  if (!ctx) throw new Error("Gallery components must sit inside <GalleryProvider>");
  return ctx;
}

/** Shares the selected angle between the main image and the thumbnails, which sit in different places. */
export function GalleryProvider({ images, children }: { images: Img[]; children: React.ReactNode }) {
  const [active, setActive] = useState(0);
  return <GalleryContext value={{ images, active, setActive }}>{children}</GalleryContext>;
}

function Thumbs({ className }: { className: string }) {
  const { images, active, setActive } = useGallery();
  if (images.length < 2) return null;
  return (
    <ul className={className} aria-label="Product angles">
      {images.map((img, i) => (
        <li key={img.src} className="w-14 flex-none lg:w-full">
          <button
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Show ${img.alt}`}
            aria-current={i === active}
            className={`relative block aspect-[4/5] w-full overflow-hidden bg-ink/[0.03] outline-offset-2 ${
              i === active ? "outline outline-1 outline-ink" : "opacity-70 hover:opacity-100"
            }`}
          >
            <Image src={img.src} alt="" fill sizes="80px" className="object-cover" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Thumbnails under the name and price, below lg. */
export function MobileThumbs() {
  return <Thumbs className="mt-4 flex gap-2 overflow-x-auto lg:hidden" />;
}

/** Desktop thumbnail column, rendered beside the info card so it travels (and stops) with it. */
export function DesktopThumbs() {
  return <Thumbs className="hidden lg:flex lg:w-14 lg:flex-none lg:flex-col lg:gap-2 lg:self-start" />;
}

/**
 * Product page imagery. From lg up: one large angle chosen with the thumbnails.
 * Below lg: a swipeable scroll-snap strip of every angle with the same line
 * indicator the product cards use; swiping updates the selected thumbnail and
 * choosing a thumbnail scrolls the strip.
 */
export function ProductGallery() {
  const { images, active, setActive } = useGallery();
  const count = images.length;
  const strip = useRef<HTMLDivElement>(null);
  const programmatic = useRef(false); // ignore scroll events caused by our own scrollTo
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [progress, setProgress] = useState(0); // 0..1 scroll position, drives the indicator thumb

  // A thumbnail was chosen: bring the strip to that image (no-op when the strip isn't laid out).
  useEffect(() => {
    const el = strip.current;
    if (!el || el.clientWidth === 0) return;
    if (Math.round(el.scrollLeft / el.clientWidth) === active) return;
    programmatic.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => (programmatic.current = false), 700);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: active * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }, [active]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max > 0 ? Math.min(1, Math.max(0, el.scrollLeft / max)) : 0);
    if (programmatic.current || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active && i >= 0 && i < count) setActive(i);
  };

  const current = Math.min(active, count - 1);

  return (
    <div>
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink/[0.03]">
        <div
          ref={strip}
          onScroll={onScroll}
          className="max-lg:flex max-lg:h-full max-lg:snap-x max-lg:snap-mandatory max-lg:overflow-x-auto max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden lg:contents"
        >
          {images.map((img, i) => (
            <Image
              key={img.src}
              src={img.src}
              alt={img.alt}
              width={img.width}
              height={img.height}
              priority={i === 0}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className={`h-full w-full object-cover max-lg:relative max-lg:shrink-0 max-lg:snap-start max-lg:snap-always lg:absolute lg:inset-0 ${
                i === current ? "lg:opacity-100" : "lg:opacity-0"
              }`}
            />
          ))}
        </div>
      </div>
      {count > 1 ? (
        <div className="relative mt-3 h-px bg-ink/20 lg:hidden" aria-hidden="true">
          <span
            className="absolute inset-y-0 bg-ink"
            style={{ width: `${100 / count}%`, left: `${progress * (100 - 100 / count)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
