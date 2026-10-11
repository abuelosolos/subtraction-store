"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { deleteCategoryAction, saveCategoryAction } from "@/app/admin/categories/actions";
import { ImageField, type ImageValue } from "@/components/admin/image-field";

export type CategoryRow = {
  id: number;
  slug: string;
  name: string;
  sortOrder: number;
  showOnHome: boolean;
  imageSrc: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  imageAlt: string | null;
  productCount: number;
};

const REASONS: Record<string, string> = {
  forbidden: "You don't have permission to do that.",
  not_found: "That category no longer exists.",
  slug_taken: "That slug is already used by another category.",
  in_use: "This category still has products. Move or archive them first, then try again.",
  protected: "This category is used by the home page and can't be deleted.",
  failed: "Something went wrong. Please try again.",
};

function CategoryForm({
  row,
  onDone,
  onCancel,
}: {
  row?: CategoryRow;
  onDone: (note: string) => void;
  onCancel: () => void;
}) {
  const [image, setImage] = useState<ImageValue>({
    src: row?.imageSrc ?? "",
    width: row?.imageWidth ?? 0,
    height: row?.imageHeight ?? 0,
    alt: row?.imageAlt ?? "",
  });
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const prefix = row ? `c${row.id}` : "cnew";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setPending(true);
    setErrors({});
    setError(null);
    try {
      const r = await saveCategoryAction({
        id: row?.id,
        slug: String(f.get("slug") ?? ""),
        name: String(f.get("name") ?? ""),
        sortOrder: String(f.get("sortOrder") ?? "0"),
        showOnHome: f.get("showOnHome") === "on",
        imageSrc: image.src,
        imageWidth: image.width || undefined,
        imageHeight: image.height || undefined,
        imageAlt: image.alt,
      });
      if (r.ok) onDone(row ? "Category saved." : "Category created.");
      else if (r.reason === "validation") {
        setErrors(r.fieldErrors);
        setError("Check the highlighted fields.");
      } else setError(REASONS[r.reason] ?? REASONS.failed);
    } catch {
      setError(REASONS.failed);
    } finally {
      setPending(false);
    }
  }

  const fe = (n: string) => (errors[n] ? <p role="alert" className="mt-1 text-caption font-semibold">{errors[n]}</p> : null);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${prefix}-name`} className="field-label">Name</label>
          <input id={`${prefix}-name`} name="name" className="field" defaultValue={row?.name ?? ""} maxLength={80} required aria-invalid={errors.name ? true : undefined} />
          {fe("name")}
        </div>
        <div>
          <label htmlFor={`${prefix}-slug`} className="field-label">Slug</label>
          <input id={`${prefix}-slug`} name="slug" className="field" defaultValue={row?.slug ?? ""} maxLength={80} readOnly={!!row} disabled={!!row} aria-invalid={errors.slug ? true : undefined} />
          <p className="mt-1 text-caption text-subtle">{row ? "Can't be changed." : "Lowercase letters, numbers, hyphens. Can't be changed later."}</p>
          {fe("slug")}
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${prefix}-sort`} className="field-label">Sort order</label>
          <input id={`${prefix}-sort`} name="sortOrder" type="number" className="field" defaultValue={row?.sortOrder ?? 0} />
          {fe("sortOrder")}
        </div>
        <label className="flex items-center gap-3 self-end pb-2 text-body">
          <input type="checkbox" name="showOnHome" defaultChecked={row?.showOnHome ?? false} className="size-4 accent-[var(--ink)]" />
          Show on the home page (needs an image)
        </label>
      </div>
      <ImageField folder="categories" optional value={image} onChange={setImage} error={errors.imageSrc} />
      <p role={error ? "alert" : "status"} className="min-h-[1.5em] text-body font-semibold">{error}</p>
      <div className="flex flex-wrap gap-4">
        <button type="submit" disabled={pending} className="btn btn-inverse btn-lg">{pending ? "Saving" : "Save category"}</button>
        <button type="button" onClick={onCancel} className="btn btn-outline btn-lg">Cancel</button>
      </div>
    </form>
  );
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function done(note: string) {
    setEditing(null);
    setMessage({ kind: "ok", text: note });
    router.refresh();
  }

  async function remove(id: number) {
    setBusy(id);
    setMessage(null);
    try {
      const r = await deleteCategoryAction({ id });
      setConfirmDelete(null);
      if (r.ok) done("Category deleted.");
      else setMessage({ kind: "error", text: REASONS[r.reason] ?? REASONS.failed });
    } catch {
      setMessage({ kind: "error", text: REASONS.failed });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <p role={message?.kind === "error" ? "alert" : "status"} className="min-h-[1.5em] text-body font-semibold">{message?.text}</p>
      {categories.length === 0 ? <p className="text-body text-muted">No categories yet.</p> : null}
      <ul className="flex flex-col gap-4">
        {categories.map((c) => (
          <li key={c.id} className="border-hairline rounded-field p-5">
            {editing === c.id ? (
              <CategoryForm row={c} onDone={done} onCancel={() => setEditing(null)} />
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="text-body">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-muted">
                    /{c.slug} · {c.productCount} {c.productCount === 1 ? "product" : "products"} · order {c.sortOrder}
                    {c.showOnHome ? " · on home page" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-caption">
                  {confirmDelete === c.id ? (
                    <>
                      <span className="font-semibold">Delete this category?</span>
                      <button type="button" disabled={busy === c.id} onClick={() => remove(c.id)} className="underline underline-offset-4">Confirm</button>
                      <button type="button" onClick={() => setConfirmDelete(null)} className="underline underline-offset-4">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => { setEditing(c.id); setMessage(null); }} className="underline underline-offset-4">
                        Edit<span className="sr-only"> {c.name}</span>
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(c.id)} className="underline underline-offset-4">
                        Delete<span className="sr-only"> {c.name}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {editing === "new" ? (
        <div className="border-hairline rounded-field p-5">
          <h2 className="mb-5 text-heading-3 font-semibold">New category</h2>
          <CategoryForm onDone={done} onCancel={() => setEditing(null)} />
        </div>
      ) : (
        <div>
          <button type="button" onClick={() => { setEditing("new"); setMessage(null); }} className="btn btn-outline btn-lg">Add category</button>
        </div>
      )}
    </div>
  );
}
