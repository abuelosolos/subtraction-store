"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";

import { IMAGE_TYPES, UploadError, measureUrl, uploadImage } from "@/components/admin/blob-upload";
import { Notice } from "@/components/admin/notice";

export type ImageValue = { src: string; width: number; height: number; alt: string };

/**
 * Controlled image picker: upload a file straight to Blob (token from
 * /api/admin/upload), or keep/enter an existing /images/... path. Measures the
 * image itself (file or pasted path), so width and height are never missing,
 * and reports src, size and alt text to the parent form.
 */
export function ImageField({
  folder,
  value,
  onChange,
  errors = {},
  optional,
  defaultAlt = "",
}: {
  folder: "products" | "categories";
  value: ImageValue;
  onChange: (next: ImageValue) => void;
  /** Field errors from the server, keyed imageSrc / imageWidth / imageHeight / imageAlt. */
  errors?: Record<string, string | undefined>;
  optional?: boolean;
  /** Alt text used when the field is empty (e.g. the product name). */
  defaultAlt?: string;
}) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const withAlt = (v: ImageValue): ImageValue => ({ ...v, alt: v.alt || defaultAlt });

  async function onFile(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    setBusy(true);
    try {
      const { src, width, height } = await uploadImage(folder, file);
      onChange(withAlt({ ...value, src, width, height }));
    } catch (err) {
      setMessage(err instanceof UploadError ? err.message : "The upload failed. Try again.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /** A path or URL was typed/pasted: load it to read the real size. */
  async function onSrcBlur() {
    const src = value.src.trim();
    if (!src) return;
    setMessage(null);
    try {
      const { width, height } = await measureUrl(src);
      onChange(withAlt({ ...value, src, width, height }));
    } catch {
      setMessage("That image couldn't be loaded. Check the path or URL.");
    }
  }

  const fieldError = (key: string) =>
    errors[key] ? (
      <p role="alert" className="mt-1 text-caption font-semibold text-[var(--admin-bad)]">{errors[key]}</p>
    ) : null;

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="sr-only">Image{optional ? " (optional)" : ""}</legend>

      {value.src ? (
        <Image
          src={value.src}
          alt={value.alt || "Preview"}
          width={value.width || 300}
          height={value.height || 400}
          unoptimized
          className="h-auto max-h-64 w-auto max-w-full self-start rounded-field border border-[var(--admin-border)]"
        />
      ) : (
        <p className="text-body text-muted">No image yet.</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          id={`${id}-file`}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          disabled={busy}
          onChange={(e) => onFile(e.target.files?.[0])}
          className="sr-only"
        />
        <label htmlFor={`${id}-file`} className="btn btn-outline cursor-pointer" aria-disabled={busy}>
          {busy ? "Uploading" : value.src ? "Replace image" : "Upload image"}
        </label>
        {optional && value.src ? (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => onChange({ src: "", width: 0, height: 0, alt: "" })}
          >
            Remove
          </button>
        ) : null}
        <p className="text-caption text-muted">JPEG, PNG, WebP or AVIF, up to 5 MB.</p>
      </div>
      {fieldError("imageSrc")}

      <div>
        <label htmlFor={`${id}-src`} className="field-label">Image path or URL</label>
        <input
          id={`${id}-src`}
          className="field"
          value={value.src}
          onChange={(e) => onChange({ ...value, src: e.target.value })}
          onBlur={onSrcBlur}
          placeholder="/images/products/example.webp"
          maxLength={500}
          aria-invalid={errors.imageSrc ? true : undefined}
        />
      </div>

      <div>
        <label htmlFor={`${id}-alt`} className="field-label">Alt text</label>
        <input
          id={`${id}-alt`}
          className="field"
          value={value.alt}
          onChange={(e) => onChange({ ...value, alt: e.target.value })}
          maxLength={200}
          aria-invalid={errors.imageAlt ? true : undefined}
        />
        <p className="mt-1 text-caption text-muted">Describe the image for screen readers. Required.</p>
        {fieldError("imageAlt")}
      </div>

      <details className="rounded-field border border-[var(--admin-border)] px-4 py-3" open={Boolean(errors.imageWidth || errors.imageHeight)}>
        <summary className="cursor-pointer text-body">
          Size: {value.width && value.height ? `${value.width} × ${value.height}px (measured)` : "not measured yet"}
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-w`} className="field-label">Width (px)</label>
            <input
              id={`${id}-w`}
              type="number"
              min={1}
              max={10000}
              className="field"
              value={value.width || ""}
              onChange={(e) => onChange({ ...value, width: Number(e.target.value) })}
              aria-invalid={errors.imageWidth ? true : undefined}
            />
            {fieldError("imageWidth")}
          </div>
          <div>
            <label htmlFor={`${id}-h`} className="field-label">Height (px)</label>
            <input
              id={`${id}-h`}
              type="number"
              min={1}
              max={10000}
              className="field"
              value={value.height || ""}
              onChange={(e) => onChange({ ...value, height: Number(e.target.value) })}
              aria-invalid={errors.imageHeight ? true : undefined}
            />
            {fieldError("imageHeight")}
          </div>
        </div>
      </details>

      {busy || message ? (
        <Notice tone={busy ? "info" : "bad"} role={message ? "alert" : "status"}>
          {busy ? "Uploading" : message}
        </Notice>
      ) : null}
    </fieldset>
  );
}
