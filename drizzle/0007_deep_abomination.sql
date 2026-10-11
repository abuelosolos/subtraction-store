CREATE TABLE "product_slug_history" (
	"old_slug" text PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_slug_history" ADD CONSTRAINT "product_slug_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_slug_history_product_id_idx" ON "product_slug_history" USING btree ("product_id");