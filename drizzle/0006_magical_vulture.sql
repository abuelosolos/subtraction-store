CREATE TYPE "public"."product_gender" AS ENUM('men', 'women', 'unisex');--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "gender" "product_gender" DEFAULT 'unisex' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "color" text DEFAULT 'Black' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "collection" text;
--> statement-breakpoint
-- Backfill: products filed under the Men's / Women's categories take that gender;
-- everything else stays unisex (editable per product in the admin).
UPDATE "products" SET "gender" = 'women' WHERE "category_id" IN (SELECT "id" FROM "categories" WHERE "slug" = 'women');--> statement-breakpoint
UPDATE "products" SET "gender" = 'men' WHERE "category_id" IN (SELECT "id" FROM "categories" WHERE "slug" = 'men');
