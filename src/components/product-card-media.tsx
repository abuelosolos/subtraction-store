"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { Image as Img } from "@/lib/catalog";

const chevron =
  "absolute top-1/2 z-10 grid max-md:hidden size-7 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white opacity-0 transition-[opacity,background-color] hover:bg-black/50 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none [&_svg]:size-4";

const PHONE_QUERY = "(max-width: 47.99rem)";
const subscribePhone = (cb: () => void) => {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const isPhone = () => window.matchMedia(PHONE_QUERY).matches;

/**
 * The image tile of a product card. Rests on images[0] (side view); on mouse hover
 * it shows images[1], and the chevrons step through the rest (wrapping both ways).
 * Below md there is no hover or chevrons: the images form a swipeable scroll-snap strip.
 */
export function ProductCardMedia({
  images,
  sizes,
  priority,
  href,
  label,
}: {
  images: Img[];
  sizes: string;
  priority: boolean;
  href: string;
  label: string;
}) {
  const [index, setIndex] = useState(0);
  const [engaged, setEngaged] = useState(false); // extra photos load only after first interaction
  const [fadeMs, setFadeMs] = useState(1000); // 1s on hover in, 0.2s on hover out, 0.5s when stepping with the chevrons
  const count = images.length;
  const step = (delta: number) => {
    setFadeMs(500);
    setIndex((i) => (i + delta + count) % count);
  };
  const strip = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 scroll position, drives the indicator thumb
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);
  // Desktop loads extra photos after first interaction; phones need them all to swipe.
  const shown = engaged || phone ? images : images.slice(0, 1);

  // A mouse can't swipe, so on the phone layout let it drag the strip.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = strip.current;
    if (!el || !phone || e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { x: e.clientX, left: el.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = strip.current;
    const d = drag.current;
    if (!el || !d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true;
      setDragging(true);
      el.setPointerCapture(e.pointerId);
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    const el = strip.current;
    const d = drag.current;
    drag.current = null;
    if (!el || !d?.moved) return;
    setDragging(false);
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 0);
    el.scrollTo({
      left: Math.round(el.scrollLeft / el.clientWidth) * el.clientWidth,
      behavior: "smooth",
    });
  };

  return (
    <>
      <div
        className="relative aspect-[2/3] overflow-hidden bg-ink/[0.03]"
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse" || count < 2) return;
          setEngaged(true);
          setFadeMs(1000);
          setIndex(1);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType !== "mouse") return;
          setFadeMs(200);
          setIndex(0);
        }}
        onFocus={() => count > 1 && setEngaged(true)}
      >
        <Link href={href} className="absolute inset-0 block" aria-label={label}>
          <div
            ref={strip}
            onScroll={(e) => {
              const el = e.currentTarget;
              const max = el.scrollWidth - el.clientWidth;
              setProgress(max > 0 ? Math.min(1, Math.max(0, el.scrollLeft / max)) : 0);
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDragStart={(e) => e.preventDefault()}
            onClickCapture={(e) => {
              if (!suppressClick.current) return;
              e.preventDefault();
              e.stopPropagation();
            }}
            className={`max-md:flex max-md:h-full max-md:snap-x ${dragging ? "max-md:snap-none" : "max-md:snap-mandatory"} max-md:select-none max-md:overflow-x-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden md:contents`}
          >
            {shown.map((img, i) => (
              <Image
                key={img.src}
                src={img.src}
                alt={i === 0 ? img.alt : ""}
                draggable={false}
                width={img.width}
                height={img.height}
                sizes={sizes}
                priority={priority && i === 0}
                style={{ transitionDuration: `${fadeMs}ms` }}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out motion-reduce:transition-none max-md:relative max-md:inset-auto max-md:shrink-0 max-md:snap-start max-md:opacity-100 max-md:transition-none ${
                  i === index ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>
        </Link>
        {count > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous image"
              className={`${chevron} left-2`}
              onClick={() => step(-1)}
            >
              <ChevronLeftIcon aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              className={`${chevron} right-2`}
              onClick={() => step(1)}
            >
              <ChevronRightIcon aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
      {count > 1 ? (
        <div className="relative mx-3 mt-2 h-px bg-ink/20 md:hidden" aria-hidden="true">
          <span
            className="absolute inset-y-0 bg-ink"
            style={{ width: `${100 / count}%`, left: `${progress * (100 - 100 / count)}%` }}
          />
        </div>
      ) : null}
    </>
  );
}
