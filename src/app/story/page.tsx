import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";

export const metadata: Metadata = {
  title: "Our Story | SUBTRACTION.",
  description: "What happens when you take color away. The idea behind SUBTRACTION.",
};

const principles = [
  { number: "01", title: "Colour", body: "Black only. One palette, so every piece works with every other." },
  { number: "02", title: "Logo", body: "No logos, no slogans. The piece is the statement." },
  { number: "03", title: "Excess", body: "Fewer pieces, cut to be worn again and again." },
];

export default function StoryPage() {
  return (
    <>
      <SiteNavbar variant="solid" />
      <main className="surface-dark pt-[var(--navbar-height)]">
        {/* 1. Thesis */}
        <section aria-labelledby="story-heading">
          <div className="container-page flex flex-col items-center gap-8 py-24 text-center md:py-32">
            <p className="text-caption font-medium uppercase text-muted">Our story</p>
            <h1 id="story-heading" className="max-w-[48rem] text-heading-2 font-semibold">
              What happens when you take color away.
            </h1>
            {/* 2. Premise */}
            <p className="max-w-[34rem] text-body text-muted">
              SUBTRACTION. started with a full closet and nothing that felt right. So we took things
              away: the colour, the logos, the noise. What is left is fit, silhouette and fabric, and
              they have to speak for themselves.
            </p>
          </div>
        </section>

        {/* 3. Image break. Placeholder photo until story/break.webp is supplied. */}
        <section aria-label="Lookbook" className="relative h-64 overflow-hidden md:h-[28rem]">
          <Image
            src="/images/lookbook/02.webp"
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
        </section>

        {/* 4. Principles */}
        <section aria-labelledby="principles-heading" className="section-y">
          <div className="container-page">
            <h2 id="principles-heading" className="mb-10 text-heading-3 font-semibold">
              What we take away
            </h2>
            <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
              {principles.map(({ number, title, body }) => (
                <li key={number} className="border-t border-line/30 pt-6">
                  <p className="text-caption font-medium text-muted">{number}</p>
                  <h3 className="mt-4 text-body font-semibold">{title}</h3>
                  <p className="mt-2 max-w-[22rem] text-body text-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 5. Making. Placeholder photo until story/making.webp is supplied. */}
        <section aria-labelledby="making-heading" className="border-t border-line/30">
          <div className="mx-auto grid w-full max-w-frame items-stretch md:grid-cols-2">
            <div className="relative min-h-[22rem] md:min-h-[32rem]">
              <Image
                src="/images/lookbook/03.webp"
                alt=""
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center gap-6 px-[var(--gutter)] py-16 md:px-16 md:py-24">
              <h2 id="making-heading" className="text-heading-3 font-semibold">Made to repeat.</h2>
              <p className="max-w-[28rem] text-body text-muted">
                Every piece is cut to be worn again and again. Nothing is added that the piece does
                not need.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Close */}
        <section aria-label="Explore" className="border-t border-line/30">
          <div className="container-page flex flex-col items-center gap-6 py-20 text-center md:py-28">
            <p className="max-w-[34rem] text-heading-3 font-semibold">See what is left.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/collections" className="btn btn-inverse btn-lg">Explore Collection</Link>
              <Link href="/new-arrivals" className="btn btn-outline btn-lg">New arrivals</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
