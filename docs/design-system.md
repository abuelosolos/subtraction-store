# SUBTRACTION. design system

Source of truth: Figma file `8oZo8FSUjtnuQawMVt4Zao`, hero frame `212:830`. Everything extracted
from Figma is saved in `docs/figma-reference.md` (do not query Figma again). Tokens live in
`src/app/globals.css`; button styles in `src/styles/buttons.css`; navbar states in
`src/styles/navbar.css`. Figma has a single desktop width (1280); the responsive rules below are
agreed decisions, not Figma design.

## Brand summary

Premium black luxury clothing. "What happens when you take colour away." The page is mostly
black, with white or near-white type, one monochrome hero photograph on a light ground, and
dark lookbook photography. Type is small and quiet (12/14px), with a few large moments
(40px headings, 64px watermark words). Corners are square. No colour accent.

Wordmark: `SUBTRACTION.` in Space Grotesk Bold 16px, with a small minus glyph on auth pages.
Hero motif: tiny `+` and `−` marks in the corners, and the words SUBTRACTION and DISILLUSION
as 64px watermark text at 10% black.

## Typography

Fonts are self-hosted (`src/fonts`, SIL OFL, `next/font/local`), so builds work offline.

**Rule: Bebas Neue and DM Sans are hero-only.** Every other page and section uses Inter, plus
Space Grotesk for the wordmark.

| Role (token) | Family | Weights | Used for |
| ------------ | ------ | ------- | -------- |
| `font-sans` | Inter | 400 / 500 / 600 / 700 | Everything outside the hero |
| `font-brand` | Space Grotesk | 700 | `SUBTRACTION.` wordmark |
| `font-display` | Bebas Neue | 400 | Hero headings only ("WALK IN THE DARK.") |
| `font-accent` | DM Sans (opsz 14) | 500 | Hero annotations and hero body only |

| Token | Size | Line height | Weight | Where |
| ----- | ---- | ----------- | ------ | ----- |
| `text-caption` | 12px | 1.33 | 400 nav, 500 buttons | Nav links, buttons, hero annotation, divider text |
| `text-body` | 14px | 1.5 | 400 body, 600 field labels | Body copy, field text, section subcopy |
| `text-brand` | 16px | 1.43 | 700 | Wordmark |
| `text-display-sm` | 20px | 1.1 | 400 (Bebas) | Hero headings |
| `text-heading-3` | 28px | 1.1 | 600 | "Explore Subtraction", auth title |
| `text-heading-2` | 40px | 1.0 | 600 | Section headings |
| `text-display-xl` | 64px | 0.9 | 700, 10% black | Hero watermark words |

- Line heights follow the Nike reference (display 0.9 to 1.1, label 1.33, body 1.5), set per
  size on the tokens. Figma's `normal` is no longer used. Buttons are about 1px taller than in
  Figma as a result.
- Tracking: 0 everywhere in Figma; no tracking tokens.
- Case: navbar links and actions are UPPERCASE. Hero headings are Bebas Neue. Everything else
  is sentence case, including buttons.

## Colours

Names are roles. Fixed tokens are in `@theme`; contextual ones follow the wrapper class.
**One dark** (`#0B0B0B`) is used for page, navbar, auth and dark buttons. Figma's `#030302`,
`#141414` and `#1E1D1D` were converged into it.

| Token | Hex | Role |
| ----- | --- | ---- |
| `surface-dark` | `#0B0B0B` | Page, navbar (solid), auth, dark buttons |
| `surface-light` | `#F5F5F5` | Hero ground (photo samples `#EBEBEB` to `#F9F8F8`), light button fill |
| `ink-on-dark` | `#F5F5F5` | Primary text on dark |
| `ink-on-light` | `#0B0B0B` | Primary text on light, including hero headings (Figma used `#000`) |
| `muted-on-dark` | `#A1A1A1` | Secondary text, field border (7.6:1 on dark) |
| `subtle-on-dark` | `#8A8A8A` | Tertiary text (5.7:1). Figma `#666` was 3.4:1 |
| `muted-on-light` | `#666666` | Hero body copy (4.8:1 or better). Figma `#A1A1A1` was 2.6:1 |
| `nav-on-light` | `#353535` | Navbar links over the hero |
| `line-on-dark` | `#A1A1A1` | 0.3px field borders and dividers |
| `line-on-light` | `#0B0B0B` | 1px ghost button outline |
| `overlay-watermark` | `rgb(0 0 0 / 10%)` | Hero giant words (decorative, `aria-hidden`) |
| `overlay-ghost` | `rgb(255 255 255 / 10%)` | Ghost button fill |
| `overlay-panel` | `rgb(255 255 255 / 20%)` | Empty landing block, content TBD |

Contextual: `surface`, `ink`, `muted`, `subtle`, `line`. Classes: `.surface-dark` (default
for `body`) and `.surface-light` (hero).

## Spacing, containers, grid

Figma spacing is not on a clean scale (4, 10, 14, 15, 20, 29, 30, 35, 41, 60, 64, 66, 97 all
occur). Tailwind's 4px base is kept; named tokens cover the repeating values only.

| Token | Value | Source |
| ----- | ----- | ------ |
| `--gutter` | 30px | Navbar horizontal padding |
| `--gap-grid` | 41px | Gap between collection tiles (2-up and 3-up) |
| `--section-y` | 107px (md+), 64px below | Measured heading top offset; mobile is a proposal |
| `max-w-frame` | 1280px | Frame, navbar, hero |
| `max-w-content` | 1137px | Collection grids and banner |
| `max-w-prose` | 941px | Centered heading + subcopy blocks |
| `max-w-form` | 446px | Auth form column (right half is 640 with 97px side padding) |

Grids: 2-up tiles 548x448, 3-up tiles about 352x448, both with 41px gaps inside 1137px.
Hero tiles at 486x303 are 138px / 655px from the left (centered pair).
Auth is a 50/50 split: 640px image side, 640px form side.
Navbar: 61px high (15px vertical padding, 30px horizontal), 60px gap logo to links, 30px
between links, 20px between actions, 21px icons inside 5px-padded circles.

## Borders, radius, elevation

| Token | Value | Use |
| ----- | ----- | --- |
| `border-width-hairline` | 0.3px | Inputs, dividers |
| `border-width-default` | 1px | Buttons |
| `rounded-none` | 0 | Buttons, tiles, banner |
| `rounded-field` | 6px | Inputs |
| `rounded-panel` | 12px | Auth image panel |
| `rounded-pill` | 999px | Navbar icon circles |
| `shadow-cta` | `0 16px 10.55px rgb(0 0 0 / 25%)` | Auth submit button |
| `shadow-hero-vignette` | `inset 0 -16px 56.2px -25px #000` | Hero bottom edge |

## Buttons

Defined once in `src/styles/buttons.css`. Classes: `.btn` plus `.btn-primary`, `.btn-ghost` or
`.btn-inverse`; sizes `.btn-lg` (15px vertical), `.btn-block` (full width). Square corners,
Inter Medium 12px, padding 10/20.

**Hover pattern:** the fill swaps to the opposite tone and a border keeps the edge visible, so
the change reads on both dark and light surfaces (Figma hovers were invisible on the light hero).
Transition 300ms.

| Variant | Figma | Default | Hover |
| ------- | ----- | ------- | ----- |
| `btn-primary` | BTN1, BTN2 | `#0B0B0B` fill, `#F5F5F5` text | `#F5F5F5` fill, `#0B0B0B` text, dark border |
| `btn-ghost` | BTN3 default | 10% white fill, 1px `#0B0B0B` border, `#0B0B0B` text | `#0B0B0B` fill, `#F5F5F5` text |
| `btn-inverse` | BTN3 recoloured, auth submit | `#F5F5F5` fill, `#0B0B0B` text | `#0B0B0B` fill, `#F5F5F5` text, light border |
| `btn-outline` | not in Figma (added for dark-surface secondary actions) | clear fill, 1px `#A1A1A1` border, `#F5F5F5` text | `#F5F5F5` fill, `#0B0B0B` text |

To swap the design, edit only `src/styles/buttons.css`.

## Cart and saved items

Routes `/cart` and `/saved`. Both use the solid navbar, breadcrumb and `container-page`. Cart is
a line list (4:5 thumbnail, name, category, size, price, quantity stepper, Remove) beside a
`Summary` panel (subtotal, shipping "Calculated at checkout", `btn-inverse` Checkout) that stacks
below `lg`. Saved items reuse `ProductCard` in the listing grid with a text Remove link.
State is device-local in `localStorage` (`src/lib/cart-store.ts`, `src/lib/saved-store.ts`) and
holds only slug, size and quantity. Names, prices and stock come from the server action in
`src/app/cart/actions.ts` and are display-only; checkout re-prices from the database. Sold out
and discontinued lines are flagged and excluded from the subtotal.

## Account area and profile menu

Routes `/account` (orders), `/account/settings` (Account info: name, phone, password; email
read-only) and `/account/addresses` share `src/app/account/layout.tsx`: navbar, breadcrumb, a
13rem side menu (`AccountNav`: Orders, Account info, Addresses, Sign out; `aria-current` shows a
hairline marker on the left edge) and the content column. Below `md` the menu becomes a
horizontally scrollable row with an underline marker, 44px targets. Each page has its own
`text-heading-2` title and does its own
session check (`requireUser`); `src/proxy.ts` is only the optimistic redirect. Orders list rows
link to `/orders/[id]`; empty state uses the same faint "+" pattern as cart and saved items.
Address book: add, edit in place, delete (inline confirm), make default; copy states that changes
apply to future orders because orders keep their own address snapshot.

Navbar Profile (signed in) is a disclosure button opening `.navbar-menu`: a borderless, square-cornered
panel, pinned to the viewport's right edge directly under the bar (text stays left-aligned), filled `surface-light` over the
hero and `surface-dark` once the bar is solid (and below md, where the bar is always solid), via the
`--navbar-menu-*` variables set next to `--navbar-bg`. Shows name and email, then Orders, Addresses, Account settings and
Sign out. It opens on hover for mouse pointers only (150 ms close delay, padded bridge), and on
keyboard activation or tap. Escape, outside click, focus leaving and navigation close it. Items are
44px tall. Signed out, the icon is a plain link to `/login`.

## Form fields and auth pages

`.field-label` + `.field` in `src/app/globals.css`: 0.3px `line` border, `rounded-field`, 10px
padding, 14px text, placeholder in `subtle`. Hover and focus-visible switch the border to `ink`.
Invalid state (`aria-invalid="true"`) thickens the border to 1px in `ink`; no error colour is
introduced, the message is bold text in an `aria-live` region.

Routes `/login` and `/register` (`src/app/(auth)`) share `AuthShell` (50/50 split from `lg`, image
panel hidden below, form column `max-w-form`) and `AuthForm` (Better Auth email and password,
`?next=` is accepted only as a same-origin path via `src/lib/safe-next.ts`). Social login
buttons from the Figma frames are not built because no providers are configured. The panel
photo is a stand-in (`/images/categories/men.webp`) until `auth/*.webp` exist.
Server code reads the user through `getSessionUser()` in `src/lib/session.ts`; `src/proxy.ts`
only does an optimistic redirect for `/checkout/*`.

## Navbar

Transparent and dark-inked over the hero; a solid dark bar with light ink over darker sections.
Fixed to the top, 61px high. State is set with `data-navbar="hero" | "solid"` on `.navbar`
(CSS in `src/styles/navbar.css`); the component that renders it decides when to switch (for
example, an IntersectionObserver on the hero). Links use `.navbar-link`.

| State | Background | Wordmark and actions | Links |
| ----- | ---------- | -------------------- | ----- |
| `hero` | transparent | `#0B0B0B` | `#353535` |
| `solid` | `#0B0B0B` | `#F5F5F5` | `#A1A1A1` |

Below `md` the navbar is always `solid`, because the cropped hero puts dark hair under it.

## Imagery

| Slot | Size | Ratio | Treatment |
| ---- | ---- | ----- | --------- |
| Hero | 1280x670 | about 1.9:1 | Full-bleed, `object-cover`, bottom vignette, art-directed annotations (see below) |
| Collection tile, 2-up | 548x448 | about 1.22:1 | `object-cover`, square corners |
| Collection tile, 3-up | 352x448 | about 4:5 | same |
| Hero-tile pair | 486x303 | 1.6:1 | same |
| Banner | 1137x577 | about 2:1 | same |
| Auth panel | 602x610 / 552x610 | about 1:1 | 12px radius, inset 19px top/bottom, 38px left |

**Hero annotations are anchored to the photograph, not the grid.** Each label and button hangs
off a leader line that touches a feature of the image (the glasses, the jacket), so left and
right positions come from the photo. Use `.hero-overlay` with `.hero-anchor` and `--x` / `--y`
in 1280x670 frame units. Coordinates are in `docs/figma-reference.md`. The 1137px content
column applies to the sections below the hero, not to it.

Dark vs light: the lookbook shots are near-black and sit directly on `surface-dark`, no
borders or captions on the image. The hero photo is the only light-ground image; text over it
is black/grey and watermark words at 10% black. See `docs/image-manifest.md`.

## Responsive rules (decided)

Breakpoints: `sm` 640, `md` 768, `lg` 1024, `xl` 1280 (Tailwind defaults; `xl` = frame width).

| Width | Behaviour |
| ----- | --------- |
| below `md` | One column. Section padding 64px. Navbar collapses to wordmark + menu button; action labels hidden. Collection grids stack. Hero is a column: photo first, then the copy blocks. Auth: image panel hidden, form full width. |
| `md` | 2-up grids stay 2-up, 3-up becomes 2-up. Section padding 107px. |
| `lg` | Hero becomes the 1280:670 overlay composition with anchored annotations. Auth 50/50 split. |
| `xl` and up | Content centers at 1280px with 30px gutters; never wider than `max-w-frame`. |

## Homepage composition

Order: hero (overlay) → shop by category (4 tiles, 3:4, label underneath) → new arrivals (scroll-snap
rail, 4:5 cards) → campaign split (light surface) → best sellers (rail) → accessories (4-up grid) →
lookbook (4 tiles, 3:4) → brand statement → footer. Sections alternate on `surface-dark`, with one `surface-light` break for the campaign.
Components: `src/components/home/*`, `product-card.tsx`, `site-footer.tsx`. Sample data:
`src/lib/catalog.ts`.

**Hero snap** (`src/components/home/hero-snap.tsx`, logic in `src/lib/hero-snap.ts`): from md up, one
wheel gesture (or PageDown/Space/arrows with nothing focused) snaps from the hero to the top edge of
`#categories` (380ms) and back (320ms). The hero is then fully out of view, so the navbar turns solid
black over the section's top padding. Everything below the categories scrolls natively. Off below md and
with `prefers-reduced-motion`.

## Product detail page

Route `/products/[slug]` (`src/app/products/[slug]/page.tsx`), statically generated from the
catalogue. Two columns from `lg` (image 1.35fr, info 1fr, info sticky), stacked below. The image is
a 4:5 `object-cover` frame like the cards, just larger. Info order: category (caption, uppercase) →
name (`text-heading-2`) → price (`text-heading-3`) → stock state → description → size selector →
Add to cart (`btn-inverse`) + Save (`btn-outline`) → Details and Shipping accordions (native
`<details>`) → "You may also like" rail.

Stock state is derived from `stock` in `src/lib/catalog.ts`: 0 = sold out (disabled controls),
1 to 5 = low stock ("only N left"), above 5 = in stock. States are monochrome (filled, half,
empty dot) so no accent colour is introduced. Cards link to the page.

## New arrivals page

Route `/new-arrivals` (`src/app/new-arrivals/page.tsx`). Solid navbar, breadcrumb like the product
page, `text-heading-2` title with a piece count, then `ProductCard` in a 2 / 3 / 4-column grid
(base / `md` / `lg`) using the homepage grid gaps. The layout lives in
`src/components/product-listing.tsx`, shared with the category page. Data: `getNewArrivalsPage()` (newest 24, same
order as the homepage rail). Linked from the navbar and the homepage rail's "View all".

## Category page

Route `/categories/[slug]` (`src/app/categories/[slug]/page.tsx`), statically generated from the
`categories` table, 404 for unknown slugs. Same `ProductListing` layout as New arrivals, title is
the category name, products newest first. Linked from the homepage category tiles and the product
page breadcrumb. There is no `/categories` index yet (most categories have no tile image).

## Nike reference notes

Studied as a reference for craft, not content. The numbers below come from third-party
write-ups of Nike's design system (kombai.com and similar). **They are secondary sources and
not verified against nike.com's CSS.** Fetching nike.com itself returned only a qualitative
description, no CSS values.

Principles borrowed:
- **Two-tier type:** a heavy condensed display face for campaign headlines, a neutral grotesque
  for UI. We map this to Bebas Neue (hero headings) and Inter (everything else).
- **Photography leads, type sits on it:** full-bleed hero with overlaid copy and CTAs. Our hero
  already does this; the `.hero-overlay` utility encodes it.
- **Monochrome UI:** black/white controls so the product is the colour. Matches our palette.
- **Tight display, calm body:** display line heights 0.9 to 1.1, body 1.5, label 1.33. Applied
  to the type tokens (Figma used `normal`). Tracking is left at 0.
- **8px rhythm:** reference spacing runs 4/8/16/24/48/60. Our Figma values mostly don't, which
  is recorded under open questions instead of silently snapped.
- **Motion:** 300ms with `cubic-bezier(0.4, 0, 0.2, 1)`. Not in Figma; adopted as
  `--duration-standard` / `--ease-standard` and used by button and navbar transitions.
- **Section spacing steps down by device** (reference: 80 / 48 / 32). Ours: 107 / 64.

Deliberately different: Nike buttons are pill-shaped (9999px radius, 12/24 padding); ours are
square-cornered per Figma. Nike uses tracked uppercase labels; ours are uppercase nav at 0
tracking.

## Decisions (from review, 2026-10-10)

1. Navbar is transparent with dark ink over the hero and solid dark over darker sections.
2. Bebas Neue and DM Sans are hero-only; Inter everywhere else.
3. Darks converged to one `#0B0B0B`.
4. Muted text tones darkened for contrast (`muted-on-light` `#666`, `subtle-on-dark` `#8A8A8A`).
5. Line heights come from the Nike reference, not Figma's `normal`.
6. Copy typos in Figma are accepted for now; copy is not final.
7. The partner lockup mark is a generated raster image upscaled because no SVG exists.
   Treat it as a placeholder until a vector or real asset is supplied.
8. Hero annotation positions are anchored to the photo by leader lines, not the page grid.
9. Auth image panel widths (602 register, 552 login) are accepted as is.
10. Button hover: opposite-fill swap with a visible border, for all variants.
11. Responsive breakpoints and behaviour as in the table above.

## Still open

- **Empty block** on landing at y=2888 (1280x650, 20% white): what goes there?
- **Social marks** (GitHub, Apple, Google) render white on the dark auth frame; confirm they
  stay monochrome.
- **Placeholder email** `heiskumasi@gmail.com` appears in the form frames; it is not used as copy.
- **Partner lockup:** real partner name or placeholder text?
- **Navbar icon layer names** are all `Icons/ArrowUpRight` regardless of glyph; cosmetic, for
  the icon export.
- **Mobile and tablet designs** do not exist; the rules above should get a design pass.

## Admin area

`/admin/*` is staff-only (role `admin`, set with `scripts/make-admin.ts`). It has its own shell and
styles, in `src/styles/admin.css` (classes `admin-*`) and `src/components/admin/`.

Shell (`admin-shell.tsx`): from md a 15rem sidebar with grouped, icon-led links (Overview | Sales:
Orders | Catalogue: Products, Categories | Inventory: Stock), "Back to shop" and "Sign out" at the
bottom; below md a top bar with a hamburger that opens the same links in a right-hand drawer
(`.mobile-menu` dialog). No public navbar or footer. Presentation only: every page still wraps its
body in `<AdminGate>`.

Layers: page ground `surface-dark`, cards `--admin-card` (4% light), raised/active `--admin-raised`
(8%), borders `--admin-border` (14% light), no shadows. Tables, cards, tabs, stat cards, notices,
action bar and dialog all use these.

Status colour is the one place the system uses colour, and only inside `/admin`: muted tones
`--admin-ok` (green), `--admin-warn` (amber), `--admin-bad` (red) via `.admin-tag[data-tone]`
(dot + word, never colour alone) and `.admin-notice[data-tone]` (labelled "Done / Error / Heads up").
The shop stays monochrome. Mapping lives in `components/admin/tones.ts` (paid ok, awaiting warn,
failed / under review bad; unfulfilled warn, delivered ok).

Primitives: `AdminPage` (breadcrumb, title + optional tag, description, actions, Suspense),
`AdminCard`, `StatusBadge` (tone), `Notice`, `FilterTabs` (link tabs), `Pagination` (range + 
Previous / Next buttons), `DataTable` (dividers, tabular numbers, whole table becomes stacked
cards below md via `data-label`), `ConfirmDialog` (native `<dialog>`, states the consequence),
`.admin-action` (36px, 44px on phones; `data-danger` for destructive). `RenameCell` renames a product in place from the list; `ImageField` measures width/height itself, offers Replace / Remove and explains upload failures. Forms: sectioned cards
(Basics, Pricing and sizes, Organisation, Image, Danger zone) and a sticky `.admin-actionbar` with
Save, Back and the result notice. Status text for orders and fulfilment lives in
`src/lib/order-labels.ts`.

## Navbar search

The Search action is a button that opens a field growing to the LEFT of the icon (the bar's
actions are right-aligned). While open the control gets `.surface-light` (light fill,
`ink-on-light`, no border, square corners) regardless of hero/solid bar state, and the
"Search" text label collapses (max-width and opacity, same duration/easing as the field's width) so the icon ends at the right of the fill. Results list in a panel directly below, flush with the field's right
edge (full width under the bar below md), `max-h` about 70vh, scrolling. Nothing is listed until
a character is typed. Rows: 40x52 thumbnail, name, category (with " · Sold out" when stock is 0),
price; 56px tall; hover/active uses `--color-overlay-watermark`. Combobox semantics: input
`role="combobox"` with `aria-activedescendant`, `role="listbox"` results, `role="status"` count
announcement. The results panel fades in with a 4px downward slide. Matching ignores case,
punctuation and spacing and accepts simple plurals. Escape, outside click, blur and navigation close it. Styles: `.navbar-search*` in
`src/styles/navbar.css`; behaviour: `src/components/navbar-search.tsx`; matching:
`src/lib/search.ts`; data: cached `getSearchIndex()` (archived products excluded).

## Listing filters

Category pages (`/categories/[slug]`) and the gender views (`/categories/men`, `/categories/women`)
use `FilterableListing`. From md: a 14rem (15rem from lg) left column of disclosure groups (Size, Gender, Colour,
Collection), each a full-width row with a plus icon that turns into a minus when open
(`aria-expanded`), separated by hairline rules; groups holding a selection start open and show a
count. Sizes are a 3-column grid of toggle buttons (`aria-pressed`); the rest are checkboxes with a
live count. Below md the same groups sit in a native `<dialog>` that slides in from the left, with
a "Show N pieces" button. Styles: `src/styles/listing-filters.css`; logic: `src/lib/product-filters.ts`.

Behaviour: filters apply instantly and are mirrored in the URL as repeated params
(`?gender=men&size=M&size=L`). OR within a group, AND across groups; a selected gender also shows
unisex pieces. The heading follows the gender: "Men's Footwear" with only Men selected, "Footwear"
with both or none; gender views read "Men's" / "Women's" and "All products" when both or none.
`gender=any` on a gender view is the explicit cleared state. Groups with no values are hidden.

Category group: the Category filter lists every category in the current listing (hidden on a
single-category page). On the Men's / Women's views, with only gender selected, the grid is replaced
by one scroll-snap rail per category in `sort_order` (the men/women catch-all categories last), each
with a "View all" link to `/categories/[slug]?gender=...`; ticking any other filter switches back
to the product grid. Choosing exactly one category names the page after it ("Men's Footwear").

## Navbar glass (over the hero)

From md up, while the bar is in its hero state, a frosted-glass layer fades in when the page has
moved a few pixels, and while Search is open or the Profile menu is open (hover included). Glass is
`--glass-bg` (light surface at 55%) or `--glass-bg-strong` (72%, for the dropdown and search
results) with `--glass-blur`, defined in `src/styles/navbar.css`; no hex. The profile dropdown, the
search field and its results are glass in this state. Crossing into the dark sections (`data-navbar="solid"`)
restores the solid dark bar and solid light fills. The blur sits on pseudo-elements, never on the
bar itself, so the fixed-position mobile menus keep their containing block. Below md the bar is
always solid, so none of this applies.

## Mobile scaling

- **Navbar height** is one token: `--navbar-height` is 56px below md (6px vertical padding, 44px
  content height) and 61px from md (15px padding, Figma). The bar uses `height`, not `min-height`,
  and every page offset, sticky offset and fixed panel reads the same token, so they cannot drift.
  Navbar icons are 44px tap targets on phones (drawn icon stays 21px).
- **Headings are fluid**: `--text-heading-2` is `clamp(1.75rem, 1rem + 3vw, 2.5rem)` (28px at 375px,
  40px from about 800px); `--text-heading-3` is `clamp(1.375rem, 1rem + 1.8vw, 1.75rem)`. Body 14px
  and caption 12px do not change.
- **Tap targets**: below md `.btn` is at least 44px tall with 14px text; filter options and size
  toggles are 44px; form fields and the search input are 16px so iOS does not zoom on focus.
- Product cards stack the price under the name below `sm`.

## Footer link groups

From md the Shop, Help and Company groups are plain columns with an uppercase caption heading. Below
md each group is an accordion row (`FooterColumn`): a full-width 56px button with the title and a
plus that turns into a minus when open (`PlusMinusIcon`, driven by `aria-expanded` through the
`group` variant), hairline rules between rows, links at 44px tap height. Groups are independent
(several can be open), start closed, and animate by row height; closed links are
`visibility: hidden` so they leave the tab order. The brand block sits above the rows.
