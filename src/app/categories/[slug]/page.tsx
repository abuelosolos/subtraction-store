import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { FilterableListing } from "@/components/listing/filterable-listing";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import {
  getAllCategorySlugs,
  getAllProducts,
  getCategoryBySlug,
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
      <SiteNavbar variant="solid" />
      <main className="surface-dark pt-[var(--navbar-height)]">
        <Suspense fallback={<p role="status" className="container-page py-16 text-body text-muted">Loading</p>}>
          <CategoryContent params={params} searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function CategoryContent({
  params,
  searchParams,
}: {
  params: PageProps<"/categories/[slug]">["params"];
  searchParams: PageProps<"/categories/[slug]">["searchParams"];
}) {
  const { slug } = await params;
  const query = await searchParams;

  const [category, categoryOrder] = await Promise.all([
    getCategoryBySlug(slug),
    getAllCategorySlugs(),
  ]);
  if (!category) notFound();

  const genderView = GENDER_VIEWS[slug];
  const products = genderView ? await getAllProducts() : await getProductsByCategory(slug);

  const filters = parseFilters(query, products);
  // A gender view preselects its gender unless the URL already says otherwise
  // (`gender=any` is the explicit "cleared" state).
  const hasGenderParam = query.gender !== undefined;
  if (genderView && !hasGenderParam) filters.gender = [genderView];

  return (
    <FilterableListing
      id="category-heading"
      products={products}
      categoryName={genderView ? null : category.name}
      presetGender={genderView ?? null}
      categoryOrder={categoryOrder}
      initialFilters={filters}
      baseCrumbs={[{ label: "Home", href: "/" }]}
      subtitle="Newest first."
      emptyMessage="Nothing in this category yet. Check back soon."
    />
  );
}
