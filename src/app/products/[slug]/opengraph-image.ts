import { OG_CONTENT_TYPE, OG_SIZE, productOgImage } from "@/lib/og-image";
import { getProductBySlug } from "@/lib/catalog-queries";

// Link-preview image for a shared product link: the product photo.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Product photo";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return productOgImage(product?.image.src);
}
