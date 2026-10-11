"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { archiveProductAction, saveProductAction } from "@/app/admin/products/actions";
import { AdminCard } from "@/components/admin/admin-card";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ImageField, type ImageValue } from "@/components/admin/image-field";
import { Notice } from "@/components/admin/notice";

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

const SIZE_GROUPS: { label: string; sizes: string[] }[] = [
  { label: "Clothing", sizes: ["XS", "S", "M", "L", "XL", "XXL"] },
  { label: "Waist (denim)", sizes: ["28", "30", "32", "34", "36"] },
  { label: "Footwear", sizes: ["39", "40", "41", "42", "43", "44", "45"] },
];
const KNOWN_SIZES = new Set(SIZE_GROUPS.flatMap((g) => g.sizes));
const splitSizes = (csv: string) => csv.split(",").map((x) => x.trim()).filter(Boolean);

const REASONS: Record<string, string> = {
  forbidden: "You don't have permission to do that.",
  not_found: "That product no longer exists.",
  slug_taken: "That slug is already used by another product.",
  category_not_found: "Choose a category.",
  db_error: "The server couldn't save this product. The cause was logged; try again, and check the server log if it keeps failing.",
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
  const [nameValue, setNameValue] = useState(values.name);
  const [sizes, setSizes] = useState<string[]>(() => splitSizes(values.sizes));
  // Sizes already on the product that are not in the standard lists stay selectable.
  const customSizes = splitSizes(values.sizes).filter((x) => !KNOWN_SIZES.has(x));
  const toggleSize = (size: string) =>
    setSizes((cur) => (cur.includes(size) ? cur.filter((x) => x !== size) : [...cur, size]));

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
        sizes: sizes.join(", "),
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
    errors[name] ? <p id={`${name}-error`} role="alert" className="mt-1 text-caption font-semibold text-[var(--admin-bad)]">{errors[name]}</p> : null;
  const invalid = (name: string) => ({
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-3xl flex-col gap-6">
      {values.archived ? (
        <Notice tone="warn" role="note">
          This product is archived: hidden from the shop and checkout.
        </Notice>
      ) : null}

      <AdminCard title="Basics">
        <div className="flex flex-col gap-5">
          <div>
            <label htmlFor="name" className="field-label">Name</label>
            <input id="name" name="name" className="field" defaultValue={values.name} onChange={(e) => setNameValue(e.target.value)} maxLength={120} required {...invalid("name")} />
            {err("name")}
          </div>
          <div>
            <label htmlFor="slug" className="field-label">Slug</label>
            <input
              id="slug" name="slug" className="field" defaultValue={values.slug} maxLength={80}
              required placeholder="heavyweight-tee" {...invalid("slug")}
            />
            <p className="mt-1 text-caption text-muted">
              {editing
                ? "The product's web address. If you change it, old links keep working and redirect to the new one."
                : "Lowercase letters, numbers and hyphens. You can change it later; old links will redirect."}
            </p>
            {err("slug")}
          </div>
          <div>
            <label htmlFor="description" className="field-label">Description</label>
            <textarea id="description" name="description" className="field" defaultValue={values.description} maxLength={2000} rows={4} {...invalid("description")} />
            {err("description")}
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Pricing and sizes">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="price" className="field-label">Price (NGN)</label>
            <input id="price" name="price" inputMode="decimal" className="field" defaultValue={values.price} placeholder="45000" required {...invalid("price")} />
            <p className="mt-1 text-caption text-muted">In naira. Changing it doesn&apos;t affect orders already placed.</p>
            {err("price")}
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="field-label">Available sizes</legend>
            <p className="mb-3 text-caption text-muted">
              Tick every size you sell. Leave all unticked for a single size. Stock is per product, not per size.
            </p>
            <div className="flex flex-col gap-4">
              {[...SIZE_GROUPS, ...(customSizes.length ? [{ label: "Other", sizes: customSizes }] : [])].map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-caption uppercase text-muted">{group.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.sizes.map((size) => (
                      <label key={size} className="block">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={sizes.includes(size)}
                          onChange={() => toggleSize(size)}
                        />
                        <span className="flex h-11 min-w-12 cursor-pointer items-center justify-center rounded-field border border-[var(--admin-border)] px-3 text-body tabular-nums transition-colors duration-[var(--duration-standard)] hover:border-ink peer-checked:border-ink peer-checked:bg-surface-light peer-checked:text-ink-on-light peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ink)]">
                          {size}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {err("sizes")}
          </fieldset>
          {!editing ? (
            <div>
              <label htmlFor="initialStock" className="field-label">Starting stock</label>
              <input id="initialStock" name="initialStock" type="number" min={0} max={100000} className="field" defaultValue={values.initialStock ?? 0} {...invalid("initialStock")} />
              {err("initialStock")}
            </div>
          ) : (
            <p className="self-end text-body text-muted">
              Stock is managed on the <Link href="/admin/stock" className="underline underline-offset-4">Stock</Link> page.
            </p>
          )}
        </div>
      </AdminCard>

      <AdminCard title="Organisation">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="categoryId" className="field-label">Category</label>
            <select id="categoryId" name="categoryId" className="field" defaultValue={values.categoryId} required {...invalid("categoryId")}>
              <option value="" disabled>Choose a category</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            {err("categoryId")}
          </div>
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
          <div>
            <label htmlFor="badge" className="field-label">Badge (optional)</label>
            <input id="badge" name="badge" className="field" defaultValue={values.badge} maxLength={30} placeholder="New" {...invalid("badge")} />
            {err("badge")}
          </div>
          <label className="flex min-h-11 items-center gap-3 self-end text-body">
            <input type="checkbox" name="isBestSeller" defaultChecked={values.isBestSeller} className="size-5 accent-[var(--ink)]" />
            Show in Best sellers
          </label>
        </div>
      </AdminCard>

      <AdminCard title="Image">
        <ImageField folder="products" value={image} onChange={setImage} errors={errors} defaultAlt={nameValue} />
      </AdminCard>

      {editing ? (
        <AdminCard title="Danger zone">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-md text-body text-muted">
              {values.archived
                ? "Restoring puts this product back in the shop and at checkout."
                : "Archiving hides this product from the shop and checkout. Past orders are kept."}
            </p>
            {values.archived ? (
              <button type="button" onClick={() => onArchive(false)} disabled={pending} className="btn btn-outline">
                Restore product
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmArchive(true)} className="btn btn-outline">
                Archive product
              </button>
            )}
          </div>
        </AdminCard>
      ) : null}

      <div className="admin-actionbar" role="group" aria-label="Save">
        <button type="submit" disabled={pending} className="btn btn-inverse btn-lg">
          {pending ? "Saving" : editing ? "Save product" : "Create product"}
        </button>
        <Link href="/admin/products" className="btn btn-outline btn-lg">Back to products</Link>
        <div className="min-w-0 flex-1" aria-live="polite">
          {status ? (
            <Notice tone={status.kind === "ok" ? "ok" : "bad"} role={status.kind === "error" ? "alert" : "status"}>
              {status.text}
            </Notice>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmArchive}
        title="Hide this product from the shop?"
        confirmLabel="Archive product"
        busy={pending}
        onConfirm={() => onArchive(true)}
        onCancel={() => setConfirmArchive(false)}
      >
        It will disappear from the shop, search and checkout. You can restore it at any time and existing orders are
        not affected.
      </ConfirmDialog>
    </form>
  );
}
