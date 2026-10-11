"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { renameProductAction } from "@/app/admin/products/actions";
import { CloseIcon, PencilIcon } from "@/components/ui/icons";

const MESSAGES: Record<string, string> = {
  forbidden: "You don't have permission to do that.",
  not_found: "That product no longer exists.",
  db_error: "Couldn't save. Try again.",
  failed: "Couldn't save. Try again.",
};

/** Product name in the list: a link to the product, with a pencil to rename in place. */
export function RenameCell({ id, name, slug }: { id: number; name: string; slug: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = String(new FormData(event.currentTarget).get("name") ?? "");
    setPending(true);
    setError(null);
    try {
      const r = await renameProductAction({ id, name: next });
      if (r.ok) {
        setEditing(false);
        router.refresh();
      } else if (r.reason === "validation") {
        setError(Object.values(r.fieldErrors)[0] ?? "Enter a name of 2 to 120 characters.");
      } else {
        setError(MESSAGES[r.reason] ?? MESSAGES.failed);
      }
    } catch {
      setError(MESSAGES.failed);
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
        <label htmlFor={`rename-${id}`} className="sr-only">Product name</label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={`rename-${id}`}
            name="name"
            className="field min-w-0 flex-1"
            defaultValue={name}
            maxLength={120}
            required
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
            }}
            aria-invalid={error ? true : undefined}
          />
          <button type="submit" disabled={pending} className="btn btn-inverse">
            {pending ? "Saving" : "Save"}
          </button>
          <button type="button" className="admin-action" onClick={() => setEditing(false)}>
            <CloseIcon />
            <span className="sr-only">Cancel rename</span>
          </button>
        </div>
        {error ? <p role="alert" className="text-caption font-semibold text-[var(--admin-bad)]">{error}</p> : null}
      </form>
    );
  }

  return (
    <span className="flex min-w-0 items-start gap-1">
      <span className="min-w-0">
        <Link href={`/admin/products/${id}`} className="font-semibold hover:underline">{name}</Link>
        <span className="block text-caption text-muted">/{slug}</span>
      </span>
      <button type="button" className="admin-action" onClick={() => { setError(null); setEditing(true); }}>
        <PencilIcon />
        <span className="sr-only">Rename {name}</span>
      </button>
    </span>
  );
}
