import { describe, expect, it } from "vitest";

import { cardImages, type GalleryImage, type Image } from "../catalog";

const img = (kind: string): GalleryImage => ({ kind, src: `/${kind}.webp`, width: 1, height: 1, alt: kind });
const image: Image = img("side");

describe("cardImages", () => {
  it("orders side, front, back, item whatever the gallery order", () => {
    const gallery = [img("front"), img("side"), img("back"), img("item")];
    expect(cardImages({ image, gallery }).map((i) => i.src)).toEqual(["/side.webp", "/front.webp", "/back.webp", "/item.webp"]);
  });

  it("skips missing angles", () => {
    expect(cardImages({ image, gallery: [img("front"), img("back")] }).map((i) => i.src)).toEqual([
      "/front.webp",
      "/back.webp",
    ]);
  });

  it("keeps the resting card image first when the product has no side photo", () => {
    const front = img("front");
    expect(cardImages({ image: front, gallery: [img("back"), front] })[0].src).toBe("/front.webp");
  });

  it("falls back to the single image", () => {
    expect(cardImages({ image })).toEqual([image]);
  });
});
