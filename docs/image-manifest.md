# Image manifest

Images the pages will need that are **not** already in the Figma file. Nothing here has been
downloaded: no page consumes images yet, and choosing photos needs a visual check (brand logos,
likeness, licence) that I couldn't do reliably from text-only page fetches.

How to fill this: pick a photo from Unsplash, Pexels or Pixabay (licence allows commercial use,
no attribution required on Unsplash/Pexels/Pixabay but record it anyway), save it at the target
path as WebP or AVIF, then add a row to `docs/image-credits.md`.

The candidate links below are **search pages**, not specific photos. I haven't verified any
individual photo.

Brand rules for all images: monochrome or very dark, high contrast, minimal background, black
clothing, no visible brand logos, no colourful or busy scenes.

## Already in Figma (do not replace)

| Use | Figma node | Notes |
| --- | ---------- | ----- |
| Hero photo (model, silver sunglasses, black puffer jacket, light ground) | 212:830 | Prominent person's likeness. Supplied as `public/images/HeroSub.png` (5120x2680); site uses `public/images/hero/hero.webp` (2560x1340). Watermark words and corner marks are baked into the image. |
| Dark lookbook shot (figure in dark metal room, strip lights) | 210:736 `CollectionsPlacehold` | Currently reused in every collection tile, the 1137x577 banner and the auth panels. |
| Partner lockup (diamond mark + "Vivet Official Partners") | 212:852 | Generated raster, upscaled, because no SVG exists. Placeholder until a vector is supplied. |

Figma asset URLs expire after 7 days. Export these to `public/images/` before they are needed.

## Delivered (Unsplash, see `docs/image-credits.md`)

| Path | Used in | Notes |
| ---- | ------- | ----- |
| `categories/{men,women,outerwear,accessories}.webp` | Shop by category tiles (3:4 crop) | |
| `products/*.webp` (18 files) | New arrivals, Best sellers and Accessories product cards (4:5 crop) | Sample catalogue in `src/lib/catalog.ts` |
| `campaign/premium-black.webp` | "Premium Black Excellence" split section | |
| `lookbook/01-04.webp` | "Explore Subtraction" grid (3:4 crop) | |

## Still needed

| Target path | Should show | Notes |
| ----------- | ----------- | ----- |
| `auth/register-panel.webp`, `auth/login-panel.webp` | Dark portrait panels for the auth pages | 602x610 and 552x610, 12px radius. Auth pages are not built yet. |
| `story/break.webp` | Full-width dark break on `/story`: black-on-black fabric or garment detail, no logos | Currently shows `lookbook/02.webp`. 16:9 or wider, shown at 1280 x 448. |
| `story/making.webp` | Split image beside "Made to repeat." on `/story`: garment construction or texture detail | Currently shows `lookbook/03.webp`. Portrait, shown about 640 x 512. |
| Real product photography | Consistent studio shots per product | The Unsplash photos are stock stand-ins with different lighting and backgrounds. |
| Vector partner mark | Replace the upscaled raster lockup | Not used on the page yet. |

## Placeholder

`public/images/placeholder-product.svg` is in place for any slot without a real image yet.

## Flags

- Any photo of a person with a prominent face counts as likeness; see the list in
  `docs/image-credits.md`. These are stock photos, not the brand's models.
