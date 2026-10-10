# Figma reference (saved extract)

Everything needed from the Figma file is saved here and in `docs/figma/`, so Figma does not need
to be queried again. File key `8oZo8FSUjtnuQawMVt4Zao`, page node `212:807` "Subtraction".
Extracted 2026-10-10. Screenshots (1024px wide): `docs/figma/hero-212-830.png`,
`landing-212-808.png`, `register-212-862.png`. Asset URLs from Figma expire after 7 days, so
photos and icons still have to be exported once when a page needs them.

All frames are 1280 wide. There is no mobile or tablet design.

## Frames

| Node | Name | Size | Notes |
| ---- | ---- | ---- | ----- |
| 212:808 | Subtraction (landing) | 1280x4353 | bg `#030302` |
| 212:830 | Frame 1209 (hero) | 1280x670 | Source of truth. Light photo, bottom inset vignette |
| 197:362 | SubtractionNavbar | 1280x61 | Variants: Top (dark), Variant2 (light) |
| 212:862 | Subtraction Register | 1280x649 | bg `#141414` in Figma (now `#0B0B0B`, see decisions) |
| 212:906 | Subtraction Login | 1280x649 | Same layout as register |
| 197:286 / 197:291 / 197:296 | SubtractionBTN1 / BTN2 / BTN3 | | Default + hover (BTN3: "Variant2") |
| 210:737 | CollectionsPlacehold | 486x303 | Dark lookbook shot, 10px inner padding |

## Hero (212:830), 1280x670, positions are left/top in the frame

Photo fills the frame (image is 115.71% tall, top offset 0.02%, cropped). Inset shadow
`0 -16px 56.2px -25px #000` on the bottom edge.

| Element | x | y | Notes |
| ------- | - | - | ----- |
| Watermark "SUBTRACTION" | 64 | 138 | Inter Bold 64, `rgba(0,0,0,.1)` |
| Watermark "DISILLUSION" | 762 | 345 | same |
| Label "Jawbreaker Omission" | 274 | 223 | DM Sans Medium 12, `#0B0B0B` |
| Leader line 1 | 268 | 246 | 193x49, runs from label down to the button |
| Button "Add to Cart" 1 | 214 | 286 | BTN2 |
| Label "Louche high neck puffer jacket" | 868 | 442 | DM Sans Medium 12 |
| Leader line 2 | 854 | 466 | 192x49, flipped, runs from label down to the button |
| Button "Add to Cart" 2 | 992 | 507 | BTN2 |
| Left block (heading, 2 lines, button) | 35 | 456 | width 308, gap 14. Bebas Neue 20 black; DM Sans Medium 12 `#A1A1A1`; BTN1 "Our Story" |
| Right block | 970 | 170 | width 262, gap 14. Same styles; BTN3 "Shop Now" |
| Partner lockup | 35 | 605 | 51x40 mark + "Vivet / Official Partners" Inter Medium 12 black |
| Corner marks | | | minus 24px at (52,83), plus 16px at (79,64), plus 16px at (1168,649), minus 14px at (1182,661) |

Annotations are anchored to points on the photograph by leader lines (the label and button hang
off a line that touches the garment or glasses). Their positions are art-directed to the photo, not
to the page grid. Use `.hero-anchor` with `--x` / `--y`.

## Navbar (197:362), 1280x61

Padding 15px 30px. Wordmark Space Grotesk Bold 16, then 60px gap, links (30px gap) Inter Regular 12
uppercase: NEW ARRIVALS, MENS, WOMENS. Right actions (20px gap): SEARCH, CART, SAVED, PROFILE, each
a 21px icon in a 5px-padded circle, 3px gap to Inter Regular 12 label, 5px side padding.

| Variant | Background | Wordmark | Links | Actions |
| ------- | ---------- | -------- | ----- | ------- |
| Top | `#0B0B0B` | `#F5F5F5` | `#A1A1A1` | `#F5F5F5` |
| Variant2 | transparent | `#000` | `#353535` | `#0B0B0B` |

## Landing (212:808), bg `#030302`

| Block | Position / size | Notes |
| ----- | --------------- | ----- |
| Collections intro | frame y=670, h=713 | Heading "Premium Black Excellence" Inter 600 40 `#F5F5F5` at y+107; subcopy Inter 400 14 `#A1A1A1` at y+169 |
| Two tiles | 486x303 at x=138 and x=655, y+261 | Captions "Shop Men's" / "Shop Women's" Inter 400 14 `#A1A1A1`, y+572 |
| "Explore Subtraction" | x=86, y=1479 | Inter 600 28 |
| Banner | 1137x577 at x=86, y=1532 | |
| 2-up | 1137x448 at x=86, y=2146; tiles 548 wide, gap 41 | |
| Heading block | 941 wide, y=2743 | centered, 40 / 14, gap 14 |
| Empty block | 1280x650 at y=2888 | `rgba(255,255,255,.2)`, content TBD |
| Heading block + CTA | 941 wide, y=3619; CTA at y=3719 | CTA is BTN3 recoloured `#F5F5F5`, text `#0B0B0B` "Explore collection" |
| 3-up | 1137x448 at x=64, y=3822; tiles about 352 wide, gap 41 | |

## Register / Login

Left half 640: image panel with 12px radius (register: 602x610 at x=38,y=19; login: 552x610 at
x=49,y=19.5; both accepted). Right half 640 with 97px side padding, 66px top, 29px gaps, column 446.

| Element | Spec |
| ------- | ---- |
| Wordmark | Space Grotesk Bold 16, `#F5F5F5`, followed by 16px minus glyph, 4px gap |
| Title | "Create an account" / "Login": Inter 600 28 `#F5F5F5` |
| Subtitle | Inter 400 14 `#A1A1A1` |
| Field label | Inter 600 14 `#F5F5F5`, 4px gap to field |
| Field | 0.3px `#A1A1A1` border, 6px radius, 10px padding, Inter 400 14 `#A1A1A1` text. Password has 17px eye icon at right |
| Submit | Full width, `#F5F5F5` fill, 20x15 padding, Inter Medium 12 `#0B0B0B`, drop shadow `0 16px 10.55px rgba(0,0,0,.25)` |
| Divider | "or continue with" Inter 400 12 `#A1A1A1`, 13px gaps, 0.3px lines |
| Social | GitHub, Apple, Google marks, 30px, 52px gaps, centered |
| Footer | "Already have an account? Login" / "Don't have an account? Sign up": Inter 400 12 `#666`, centered, link underlined |

## Buttons (Figma)

| Component | Default | Hover | Content |
| --------- | ------- | ----- | ------- |
| BTN1 | `#0B0B0B` fill, 1px `#0B0B0B` border, `#F5F5F5` text | `#F5F5F5` fill and border, `#141414` text | label + 15px ArrowUpRight |
| BTN2 | `#0B0B0B` fill, no border, `#F5F5F5` text | `#F5F5F5` fill, `#141414` text | label only |
| BTN3 | `rgba(255,255,255,.1)` fill, 1px `#0B0B0B` border, `#0B0B0B` text | "Variant2": `#F5F5F5` fill | label + 15px ArrowUpRight |

All: Inter Medium 12, padding 10px 20px, square corners. These are being replaced; the repo version
is in `src/styles/buttons.css`.

## Figma variables

| Name | Value |
| ---- | ----- |
| Text Primary (Dark) | `#F5F5F5` |
| Text Secondary (Dark) | `#A1A1A1` |
| Text Muted (Dark) | `#666666` |
| Background Dark | `#0B0B0B` |
| Surface (Dark) | `#141414` |
| Button Text / Caption Text | Inter Medium 12 |
| Small Body Text | Inter Regular 14 |
| Main Heading 3 | Inter Semi Bold 28 |
| Main Heading 2 | Inter Semi Bold 40 |

## Copy (not final, has typos)

Hero: "WALK IN THE DARK." / "At some point the closet got full and nothing felt right. That was
the problem. We built the answer." / "Stillness that stands OUT." / "Color is easy. Anyone can do
color. What happens when you take it away,. Can the fit has to speak for itself?. Does silhouette
move you when you stop hiding behind a palette. We're not minimal or not colorful. We're an
exceptional difference."
Sections: "Premium Black Excellence" / "What happens when you take color away. Can the fit has to
speak for itself?. Does silhouette move you when you stop hiding behind a palette."
Auth: "Create an account" / "Shop and find yourself in our endless collection of dark persona and
ultra rich black luxurious outfits." / "Welcome back, we hope you find great pick in our endless
collection of ultra rich black luxurious outfits."
