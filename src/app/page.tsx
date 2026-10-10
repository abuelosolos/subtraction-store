import Image from "next/image";

import { Campaign } from "@/components/home/campaign";
import { CategoryGrid } from "@/components/home/category-grid";
import { Lookbook } from "@/components/home/lookbook";
import { ProductGrid } from "@/components/home/product-grid";
import { ProductRail } from "@/components/home/product-rail";
import { Statement } from "@/components/home/statement";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import {
  getAccessories,
  getBestSellers,
  getHomeCategories,
  getNewArrivals,
} from "@/lib/catalog-queries";

function ArrowUpRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.200" aria-hidden="true">
      <path d="M4 11 11 4M5 4h6v6" />
    </svg>
  );
}

const anchor = (x: number, y: number, w?: number) =>
  ({ "--x": x, "--y": y, ...(w ? { "--aw": `calc(${w} / 1280 * 100%)` } : {}) }) as React.CSSProperties;

const frame = (x: number, y: number, w: number, h: number) =>
  ({ "--x": x, "--y": y, "--w": w, "--h": h }) as React.CSSProperties;

export default async function Home() {
  const [categories, newArrivals, bestSellers, accessories] = await Promise.all([
    getHomeCategories(),
    getNewArrivals(),
    getBestSellers(),
    getAccessories(),
  ]);

  return (
    <>
      <SiteNavbar />
      <main>
        {/* Hero: positions are in the 1280x670 Figma frame, anchored to the photo. Annotations show from md up; mobile shows the photo only. */}
        <section id="hero" aria-label="Hero" className="hero-overlay surface-light">
          <Image
            src="/images/hero/hero.webp"
            alt="Model in reflective sports sunglasses and a black high-neck puffer jacket on a white ground"
            width={2560}
            height={1340}
            sizes="(min-width: 1280px) 1280px, 100vw"
            priority
            className="hero-overlay-media"
          />

          {/* Left: brand statement */}
          <div className="hero-anchor" style={anchor(35, 456, 308)}>
            <div className="flex flex-col items-start gap-[14px]">
            <h2 className="font-display text-[1.667em] leading-[1.1] font-normal">WALK IN THE DARK.</h2>
            <p className="font-accent text-[1em] font-medium text-muted max-lg:hidden">
              At some point the closet got full and nothing felt right. That was the problem. We
              built the answer.
            </p>
            <a href="#" className="btn btn-primary">
              Our Story <ArrowUpRight />
            </a>
            </div>
          </div>

          {/* Right: statement */}
          <div className="hero-anchor" style={anchor(970, 170, 262)}>
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
            <a href="#" className="btn btn-ghost">
              Shop Now <ArrowUpRight />
            </a>
            </div>
          </div>

          {/* Product callout 1: glasses */}
          <p className="hero-anchor font-accent font-medium" style={anchor(274, 223)}>
            Jawbreaker Omission
          </p>
          <span className="hero-leader" style={frame(268, 246, 193, 49)} aria-hidden="true" />
          <div className="hero-anchor" style={anchor(214, 286)}>
            <a href="#" className="btn btn-primary">Add to Cart</a>
          </div>

          {/* Product callout 2: jacket */}
          <p className="hero-anchor font-accent font-medium" style={anchor(868, 442)}>
            Louche high neck puffer jacket
          </p>
          <span className="hero-leader hero-leader-flip" style={frame(854, 466, 192, 49)} aria-hidden="true" />
          <div className="hero-anchor" style={anchor(992, 507)}>
            <a href="#" className="btn btn-primary">Add to Cart</a>
          </div>
        </section>

        <CategoryGrid categories={categories} />
        <ProductRail
          id="arrivals-heading"
          title="New arrivals"
          products={newArrivals}
          linkHref="/new-arrivals"
        />
        <Campaign />
        <ProductRail
          id="bestsellers-heading"
          title="Best sellers"
          products={bestSellers}
          linkLabel="Shop best sellers"
          padTop
        />
        <ProductGrid id="accessories-heading" title="Accessories" products={accessories} />
        <Lookbook />
        <Statement />
      </main>
      <SiteFooter />
    </>
  );
}
