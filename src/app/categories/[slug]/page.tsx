import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductListing } from "@/components/product-listing";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import {
  getAllCategorySlugs,
  getCategoryBySlug,
  getProductsByCategory,
} from "@/lib/catalog-queries";

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

export default async function CategoryPage({ params }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const [category, products] = await Promise.all([
    getCategoryBySlug(slug),
    getProductsByCategory(slug),
  ]);
  if (!category) notFound();

  return (
    <>
      <SiteNavbar variant="solid" />
      <main className="surface-dark pt-[var(--navbar-height)]">
        <ProductListing
          id="category-heading"
          title={category.name}
          subtitle="Newest first."
          crumbs={[{ label: "Home", href: "/" }, { label: category.name }]}
          products={products}
          emptyMessage="Nothing in this category yet. Check back soon."
        />
      </main>
      <SiteFooter />
    </>
  );
}
