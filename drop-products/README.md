# Drop new products here

One folder per product type and gender, e.g. `Shirts Male/`, `Beanies Female/`.
Inside, photos are named `<kind>-<N>.jpg`: `front-N`, `side-N`, `back-N`, `item-N`
(item = clean cut-out). Same N across kinds = the same product from different angles.

Then ask Claude to import, or run:

    npx tsx scripts/import-drop-products.ts

Names, prices and categories per folder are set in the SPECS table at the top of that
script. Images go to `public/images/products/<slug>/`; every other live product is archived.
