"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { archiveProductAction, saveProductAction } from "@/app/admin/products/actions";
import { ImageField, type ImageValue } from "@/components/admin/image-field";

type Category = { id: number; name: string };

export type ProductFormValues = {
  id?: number;
  slug: string;
  name: string;
  description: string;
  categoryId: number | "";
  /** Naira as typed, e.g. "45000" or "45000.50". */
  price: string;
  sizes: string;
  badge: string;
  isBestSeller: boolean;
  gender: "men" | "women" | "unisex";
  color: string;
  collection: string;
  image: ImageValue;
  initialStock?: number;
  archived?: boolean;
};

const REASONS: Record<string, string> = {
  forbidden: "You don't have permission to do that.",
  not_found: "That product no longer exists.",
  slug_taken: "That slug is already used by another product.",
  category_not_found: "Choose a category.",
  failed: "Something went wrong. Please try again.",
};

export function ProductForm({
  values,
  categories,
  suggestions = { colors: [], collections: [] },
}: {
  values: ProductFormValues;
  categories: Category[];
  suggestions?: { colors: string[]; collections: string[] };
}) {
  const router = useRouter();
  const editing = values.id !== undefined;
  const [image, setImage] = useState<ImageValue>(values.image);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmArchive, setConfirmArchive] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setPending(true);
    setStatus(null);
    setErrors({});
    try {
      const r = await saveProductAction({
        id: values.id,
        slug: String(f.get("slug") ?? values.slug),
        name: String(f.get("name") ?? ""),
        description: String(f.get("description") ?? ""),
        categoryId: String(f.get("categoryId") ?? ""),
        price: String(f.get("price") ?? ""),
        sizes: String(f.get("sizes") ?? ""),
        badge: String(f.get("badge") ?? ""),
        isBestSeller: f.get("isBestSeller") === "on",
        gender: String(f.get("gender") ?? "unisex"),
        color: String(f.get("color") ?? ""),
        collection: String(f.get("collection") ?? ""),
        imageSrc: image.src,
        imageWidth: image.width,
        imageHeight: image.height,
        imageAlt: image.alt,
        initialStock: String(f.get("initialStock") ?? "0"),
      });
      if (r.ok) {
        if (editing) {
          setStatus({ kind: "ok", text: "Product saved." });
          router.refresh();
        } else {
          router.push("/admin/products");
          router.refresh();
        }
      } else if (r.reason === "validation") {
        setErrors(r.fieldErrors);
        setStatus({ kind: "error", text: "Check the highlighted fields." });
      } else {
        setStatus({ kind: "error", text: REASONS[r.reason] ?? REASONS.failed });
      }
    } catch {
      setStatus({ kind: "error", text: REASONS.failed });
    } finally {
      setPending(false);
    }
  }

  async function onArchive(archived: boolean) {
    if (values.id === undefined) return;
    setPending(true);
    setStatus(null);
    try {
      const r = await archiveProductAction({ id: values.id, archived });
      if (r.ok) {
        setConfirmArchive(false);
        setStatus({ kind: "ok", text: archived ? "Product archived and hidden from the shop." : "Product restored." });
        router.refresh();
      } else {
        setStatus({ kind: "error", text: REASONS[r.reason] ?? REASONS.failed });
      }
    } catch {
      setStatus({ kind: "error", text: REASONS.failed });
    } finally {
      setPending(false);
    }
  }

  const err = (name: string) =>
    errors[name] ? <p id={`${name}-error`} role="alert" className="mt-1 text-caption font-semibold">{errors[name]}</p> : null;
  const invalid = (name: string) => ({
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-2xl flex-col gap-6">
      {values.archived ? (
        <p role="note" className="border border-ink p-4 text-body font-semibold">
          This product is archived: hidden from the shop and checkout.
        </p>
      ) : null}

      <div>
        <label htmlFor="name" className="field-label">Name</label>
        <input id="name" name="name" className="field" defaultValue={values.name} maxLength={120} required {...invalid("name")} />
        {err("name")}
      </div>

      <div>
        <label htmlFor="slug" className="field-label">Slug</label>
        <input
          id="slug" name="slug" className="field" defaultValue={values.slug} maxLength={80}
          readOnly={editing} disabled={editing} required={!editing} placeholder="heavyweight-tee" {...invalid("slug")}
        />
        <p className="mt-1 text-caption text-subtle">
          {editing ? "The slug is the product's web address and can't be changed." : "Lowercase letters, numbers and hyphens. Can't be changed later."}
        </p>
        {err("slug")}
      </div>

      <div>
        <label htmlFor="description" className="field-label">Description</label>
        <textarea id="description" name="description" className="field" defaultValue={values.description} maxLength={2000} {...invalid("description")} />
        {err("description")}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="categoryId" className="field-label">Category</label>
          <select id="categoryId" name="categoryId" className="field" defaultValue={values.categoryId} required {...invalid("categoryId")}>
            <option value="" disabled>Choose a category</option>
            {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          {err("categoryId")}
        </div>
        <div>
          <label htmlFor="price" className="field-label">Price (NGN)</label>
          <input id="price" name="price" inputMode="decimal" className="field" defaultValue={values.price} placeholder="45000" required {...invalid("price")} />
          <p className="mt-1 text-caption text-subtle">In naira. Changing it doesn&apos;t affect orders already placed.</p>
          {err("price")}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="sizes" className="field-label">Sizes</label>
          <input id="sizes" name="sizes" className="field" defaultValue={values.sizes} placeholder="S, M, L, XL" {...invalid("sizes")} />
          <p className="mt-1 text-caption text-subtle">Comma-separated. Leave empty for a single size. Stock is per product, not per size.</p>
          {err("sizes")}
        </div>
        <div>
          <label htmlFor="badge" className="field-label">Badge (optional)</label>
          <input id="badge" name="badge" className="field" defaultValue={values.badge} maxLength={30} placeholder="New" {...invalid("badge")} />
          {err("badge")}
        </div>
      </div>

      {!editing ? (
        <div className="sm:max-w-xs">
          <label htmlFor="initialStock" className="field-label">Starting stock</label>
          <input id="initialStock" name="initialStock" type="number" min={0} max={100000} className="field" defaultValue={values.initialStock ?? 0} {...invalid("initialStock")} />
          {err("initialStock")}
        </div>
      ) : (
        <p className="text-body text-muted">
          Stock is managed on the <Link href="/admin/stock" className="underline underline-offset-4">Stock</Link> page.
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <label htmlFor="gender" className="field-label">Gender</label>
          <select id="gender" name="gender" className="field" defaultValue={values.gender} {...invalid("gender")}>
            <option value="unisex">Unisex (shows under Men and Women)</option>
            <option value="men">Men</option>
            <option value="women">Women</option>
          </select>
          {err("gender")}
        </div>
        <div>
          <label htmlFor="color" className="field-label">Colour</label>
          <input id="color" name="color" list="color-suggestions" className="field" defaultValue={values.color} maxLength={30} required {...invalid("color")} />
          <datalist id="color-suggestions">
            {suggestions.colors.map((c) => (<option key={c} value={c} />))}
          </datalist>
          {err("color")}
        </div>
        <div>
          <label htmlFor="collection" className="field-label">Collection (optional)</label>
          <input id="collection" name="collection" list="collection-suggestions" className="field" defaultValue={values.collection} maxLength={60} placeholder="Core" {...invalid("collection")} />
          <datalist id="collection-suggestions">
            {suggestions.collections.map((c) => (<option key={c} value={c} />))}
          </datalist>
          {err("collection")}
        </div>
      </div>

      <label className="flex items-center gap-3 text-body">
        <input type="checkbox" name="isBestSeller" defaultChecked={values.isBestSeller} className="size-4 accent-[var(--ink)]" />
        Show in Best sellers
      </label>

      <ImageField folder="products" value={image} onChange={setImage} error={errors.imageSrc ?? errors.imageWidth ?? errors.imageHeight ?? errors.imageAlt} />

      <p role={status?.kind === "error" ? "alert" : "status"} className="min-h-[1.5em] text-body font-semibold">
        {status?.text}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="btn btn-inverse btn-lg">
          {pending ? "Saving" : editing ? "Save product" : "Create product"}
        </button>
        <Link href="/admin/products" className="btn btn-outline btn-lg">Back to products</Link>

        {editing ? (
          values.archived ? (
            <button type="button" onClick={() => onArchive(false)} disabled={pending} className="underline underline-offset-4 text-body">
              Restore product
            </button>
          ) : confirmArchive ? (
            <span className="flex items-center gap-4 text-body">
              <span className="font-semibold">Hide this product from the shop?</span>
              <button type="button" onClick={() => onArchive(true)} disabled={pending} className="underline underline-offset-4">Yes, archive</button>
              <button type="button" onClick={() => setConfirmArchive(false)} className="underline underline-offset-4">Cancel</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmArchive(true)} className="underline underline-offset-4 text-body">
              Archive product
            </button>
          )
        ) : null}
      </div>
    </form>
  );
}
