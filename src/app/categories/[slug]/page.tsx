import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CategoryHero } from "@/components/listing/category-hero";
import { CategoryTabs } from "@/components/listing/category-tabs";
import { FilterableListing } from "@/components/listing/filterable-listing";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import {
  getAllCategorySlugs,
  getAllProducts,
  getCategoryBySlug,
  getCategoryTabs,
  getProductsByCategory,
} from "@/lib/catalog-queries";
import { parseFilters } from "@/lib/product-filters";

/** `/categories/men` and `/categories/women` are gender views across every category. */
const GENDER_VIEWS: Record<string, "men" | "women"> = { men: "men", women: "women" };

export async function generateStaticParams() {
  const slugs = await getAllCategorySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: `${category.name} | SUBTRACTION.`,
    description: `Shop ${category.name} from SUBTRACTION. Black only, newest first.`,
  };
}

export default function CategoryPage({ params, searchParams }: PageProps<"/categories/[slug]">) {
  return (
    <>
      <Suspense
        fallback={
          <>
            <SiteNavbar variant="solid" />
            <main className="surface-dark pt-[var(--navbar-height)]">
              <p role="status" className="container-page py-16 text-body text-muted">Loading</p>
            </main>
          </>
        }
      >
        <CategoryContent params={params} searchParams={searchParams} />
      </Suspense>
      <SiteFooter />
    </>
  );
}

/**
 * Hero page vs hero-less page: a clean URL (`/categories/men`, a home tile link)
 * opens with the full-screen hero and a blurred transparent navbar; any search
 * param (a department tab's `?gender=`, a shared filter URL) opens straight at
 * the white nav, tab row and grid. The navbar variant depends on that, so the
 * navbar renders here, inside the Suspense boundary, next to <main>.
 */
async function CategoryContent({
  params,
  searchParams,
}: {
  params: PageProps<"/categories/[slug]">["params"];
  searchParams: PageProps<"/categories/[slug]">["searchParams"];
}) {
  const { slug } = await params;
  const query = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const genderView = GENDER_VIEWS[slug];
  // Men's / Women's span every category; other pages show their own products.
  const products = genderView ? await getAllProducts() : await getProductsByCategory(slug);

  const filters = parseFilters(query, products);
  // A gender view preselects its gender unless the URL already says otherwise
  // (`gender=any` is the explicit "cleared" state).
  if (genderView && query.gender === undefined) filters.gender = [genderView];

  const heroImage = category.image ?? products[0]?.image ?? null;
  const showHero = Object.keys(query).length === 0 && heroImage !== null;

  // Tab row inside a department (Men / Women): the department, then its categories.
  const department = filters.gender.length === 1 && (filters.gender[0] === "men" || filters.gender[0] === "women")
    ? filters.gender[0]
    : null;
  const tabs = department ? (
    <CategoryTabs
      tabs={[
        { label: department === "men" ? "Men" : "Women", href: `/categories/${department}`, active: genderView === department },
        ...(await getCategoryTabs())
          .filter((t) => !(t.slug in GENDER_VIEWS))
          .map((t) => ({
            label: t.name,
            href: `/categories/${t.slug}?gender=${department}`,
            active: !genderView && t.slug === slug,
          })),
      ]}
    />
  ) : undefined;

  const heroTitle = genderView ? (genderView === "men" ? "Men's" : "Women's") : category.name;

  return (
    <>
      {showHero ? <SiteNavbar heroTone="dark" /> : <SiteNavbar variant="solid" />}
      <main className={showHero ? "surface-dark" : "surface-dark pt-[var(--navbar-height)]"}>
        {showHero && heroImage ? (
          <CategoryHero
            title={heroTitle}
            description={
              genderView
                ? `Shop ${heroTitle.toLowerCase()} ready-to-wear, accessories and the latest arrivals.`
                : `Shop ${category.name} from SUBTRACTION. Black only, newest first.`
            }
            image={heroImage}
          />
        ) : null}
        <FilterableListing
          id="category-heading"
          products={products}
          categoryName={genderView ? null : category.name}
          presetGender={genderView ?? null}
          initialFilters={filters}
          baseCrumbs={
            department && !genderView
              ? [
                  { label: "Home", href: "/" },
                  { label: department === "men" ? "Men" : "Women", href: `/categories/${department}` },
                ]
              : showHero
                ? [{ label: "Home", href: "/" }]
                : []
          }
          subtitle="Newest first."
          emptyMessage="Nothing in this category yet. Check back soon."
          tabs={tabs}
        />
      </main>
    </>
  );
}
