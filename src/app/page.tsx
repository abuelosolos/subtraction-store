import Link from "next/link";

import { CategoryStrip } from "@/components/home/category-strip";
import { CategoryGrid } from "@/components/home/category-grid";
import { HeroMedia, HeroSequence } from "@/components/home/hero-sequence";
import { Lookbook } from "@/components/home/lookbook";
import { QuoteStrip } from "@/components/home/quote-strip";
import { SplitPanels } from "@/components/home/split-panels";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { getHomeCategories } from "@/lib/catalog-queries";

function ArrowUpRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.200" aria-hidden="true">
      <path d="M4 11 11 4M5 4h6v6" />
    </svg>
  );
}

/* ri = position in the staggered reveal once the entrance video ends (see hero-sequence.css). */
const anchor = (x: number, y: number, w?: number, ri = 0) =>
  ({ "--x": x, "--y": y, "--ri": ri, ...(w ? { "--aw": `calc(${w} / 1280 * 100%)` } : {}) }) as React.CSSProperties;

const frame = (x: number, y: number, w: number, h: number, ri = 0) =>
  ({ "--x": x, "--y": y, "--w": w, "--h": h, "--ri": ri }) as React.CSSProperties;

export default async function Home() {
  const categories = await getHomeCategories();

  return (
    <>
      <CategoryStrip items={categories} />
      <SiteNavbar withStrip />
      {/* Above the fixed strip (z-index) so the page slides over it; margin (not padding) leaves the strip room so main never sits over its clicks. */}
      <main className="relative z-[1] mt-[var(--strip-h)]">
        {/* Hero: positions are in the 1280x670 Figma frame, anchored to the photo. Annotations show from md up; mobile shows the photo only. */}
        <HeroSequence id="hero" aria-label="Hero" className="hero-overlay">
          <HeroMedia
            poster="/images/hero/hero.webp"
            alt="Model in reflective sports sunglasses and a black high-neck puffer jacket on a white ground"
            entranceSrc="/videos/hero/hero-entrance.mp4"
            loopSrc="/videos/hero/hero-loop.mp4"
          />

          {/* Phones only: write-up and buttons under the photo (the wordmark stays as a screen-reader h1). */}
          <div data-reveal style={{ "--ri": 0 } as React.CSSProperties} className="relative z-10 flex flex-1 flex-col justify-start gap-5 px-[var(--gutter)] pb-12 pt-6 md:hidden">
            <h1 className="sr-only">SUBTRACTION</h1>
            <p className="font-accent max-w-[26rem] text-body font-medium text-muted">
              At some point the closet got full and nothing felt right. That was the problem. We
              built the answer.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/collections" data-hero-click="explore_collection" className="btn btn-inverse">Explore Collection</Link>
              <Link href="/story" data-hero-click="our_story" className="btn btn-outline">Our Story</Link>
            </div>
          </div>
          <span aria-hidden="true" data-reveal className="hero-float md:hidden" style={{ "--reveal-opacity": 0.55, "--ri": 4, "--fx": "8%", "--fy": "14%", "--fdur": "6s", "--fdelay": "0s" } as React.CSSProperties}>+</span>
          <span aria-hidden="true" data-reveal className="hero-float md:hidden" style={{ "--reveal-opacity": 0.55, "--ri": 4, "--fx": "84%", "--fy": "11%", "--fdur": "8s", "--fdelay": "1s" } as React.CSSProperties}>−</span>
          <span aria-hidden="true" data-reveal className="hero-float md:hidden" style={{ "--reveal-opacity": 0.55, "--ri": 4, "--fx": "90%", "--fy": "46%", "--fdur": "7s", "--fdelay": "2s" } as React.CSSProperties}>+</span>
          <span aria-hidden="true" data-reveal className="hero-float md:hidden" style={{ "--reveal-opacity": 0.55, "--ri": 4, "--fx": "6%", "--fy": "58%", "--fdur": "9s", "--fdelay": "0.5s" } as React.CSSProperties}>−</span>
          <span aria-hidden="true" data-reveal className="hero-float md:hidden" style={{ "--reveal-opacity": 0.55, "--ri": 4, "--fx": "76%", "--fy": "72%", "--fdur": "6.5s", "--fdelay": "1.5s" } as React.CSSProperties}>+</span>
          <span aria-hidden="true" data-reveal className="hero-float md:hidden" style={{ "--reveal-opacity": 0.55, "--ri": 4, "--fx": "18%", "--fy": "86%", "--fdur": "8.5s", "--fdelay": "2.5s" } as React.CSSProperties}>−</span>
          <span aria-hidden="true" data-reveal className="hero-float md:hidden" style={{ "--reveal-opacity": 0.55, "--ri": 4, "--fx": "50%", "--fy": "92%", "--fdur": "7.5s", "--fdelay": "0.8s" } as React.CSSProperties}>+</span>

          {/* Left: brand statement */}
          <div data-reveal className="hero-anchor" style={anchor(35, 456, 308, 1)}>
            <div className="flex flex-col items-start gap-[14px]">
            <h2 className="font-display text-[1.667em] leading-[1.1] font-normal">WALK IN THE DARK.</h2>
            <p className="font-accent text-[1em] font-medium text-muted max-lg:hidden">
              At some point the closet got full and nothing felt right. That was the problem. We
              built the answer.
            </p>
            <Link href="/story" data-hero-click="our_story" className="btn btn-primary">
              Our Story <ArrowUpRight />
            </Link>
            </div>
          </div>

          {/* Right: statement */}
          <div data-reveal className="hero-anchor" style={anchor(970, 170, 262, 2)}>
            <div className="flex flex-col items-start gap-[14px]">
            <h2 className="font-display text-[1.667em] leading-[1.1] font-normal">Stillness that stands OUT.</h2>
            <p className="font-accent text-[1em] font-medium text-muted max-lg:hidden">
              Color is easy. Anyone can do color. What happens when you take it away,. Can the fit
              has to speak for itself?. Does silhouette move you when you stop hiding behind a
              palette.
              <br />
              <br />
              We&rsquo;re not minimal or not colorful. We&rsquo;re an exceptional difference.
            </p>
            <a href="#" data-hero-click="shop_now" className="btn btn-ghost">
              Shop Now <ArrowUpRight />
            </a>
            </div>
          </div>

          {/* Product callout 1: glasses */}
          <p data-reveal className="hero-anchor font-accent font-medium" style={anchor(274, 223, undefined, 3)}>
            Jawbreaker Omission
          </p>
          <span data-reveal className="hero-leader" style={frame(268, 246, 193, 49, 3)} aria-hidden="true" />
          <div data-reveal className="hero-anchor" style={anchor(214, 286, undefined, 4)}>
            <a href="#" data-hero-click="add_to_cart" className="btn btn-primary">Add to Cart</a>
          </div>

          {/* Product callout 2: jacket */}
          <p data-reveal className="hero-anchor font-accent font-medium" style={anchor(868, 442, undefined, 5)}>
            Louche high neck puffer jacket
          </p>
          <span data-reveal className="hero-leader hero-leader-flip" style={frame(854, 466, 192, 49, 5)} aria-hidden="true" />
          <div data-reveal className="hero-anchor" style={anchor(992, 507, undefined, 6)}>
            <a href="#" data-hero-click="add_to_cart" className="btn btn-primary">Add to Cart</a>
          </div>
        </HeroSequence>

        <QuoteStrip />
        <SplitPanels />
        <CategoryGrid />
        <Lookbook />
      </main>
      <SiteFooter />
    </>
  );
}
