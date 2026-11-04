"use client";

import Image from "next/image";
import { createContext, useContext, useState } from "react";

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

/** Product page imagery: one large angle. */
export function ProductGallery() {
  const { images, active } = useGallery();
  const current = images[Math.min(active, images.length - 1)];

  return (
    <div>
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink/[0.03]">
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}
