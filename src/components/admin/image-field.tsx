"use client";

import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { useId, useState } from "react";

export type ImageValue = { src: string; width: number; height: number; alt: string };

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function measure(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    img.src = url;
  });
}

/**
 * Controlled image picker: upload a file straight to Blob (token from
 * /api/admin/upload), or keep/enter an existing /images/... path. Reports
 * src, measured size and alt text to the parent form.
 */
export function ImageField({
  folder,
  value,
  onChange,
  error,
  optional,
}: {
  folder: "products" | "categories";
  value: ImageValue;
  onChange: (next: ImageValue) => void;
  error?: string;
  optional?: boolean;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    if (!TYPES.includes(file.type)) return setMessage("Use a JPEG, PNG, WebP or AVIF image.");
    if (file.size > MAX_BYTES) return setMessage("Images can be at most 5 MB.");
    setBusy(true);
    try {
      const { width, height } = await measure(file);
      const safeName = file.name.replace(/[^\w.\- ]/g, "_").slice(-80);
      const blob = await upload(`${folder}/${safeName}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/upload",
        contentType: file.type,
      });
      onChange({ ...value, src: blob.url, width, height });
    } catch {
      setMessage("Upload failed. Check that Blob storage is configured and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="field-label">Image{optional ? " (optional)" : ""}</legend>
      {value.src ? (
        <Image
          src={value.src}
          alt={value.alt || "Preview"}
          width={value.width || 300}
          height={value.height || 400}
          unoptimized
          className="h-auto max-h-64 w-auto max-w-full self-start border border-line/30"
        />
      ) : null}
      <div>
        <label htmlFor={`${id}-file`} className="field-label">Upload a file</label>
        <input
          id={`${id}-file`}
          type="file"
          accept={TYPES.join(",")}
          disabled={busy}
          onChange={(e) => onFile(e.target.files?.[0])}
          className="field"
        />
        <p className="mt-1 text-caption text-subtle">JPEG, PNG, WebP or AVIF, up to 5 MB.</p>
      </div>
      <div>
        <label htmlFor={`${id}-src`} className="field-label">Image path or URL</label>
        <input
          id={`${id}-src`}
          className="field"
          value={value.src}
          onChange={(e) => onChange({ ...value, src: e.target.value })}
          placeholder="/images/products/example.webp"
          maxLength={500}
          aria-invalid={error ? true : undefined}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-w`} className="field-label">Width (px)</label>
          <input id={`${id}-w`} type="number" min={1} max={10000} className="field" value={value.width || ""} onChange={(e) => onChange({ ...value, width: Number(e.target.value) })} />
        </div>
        <div>
          <label htmlFor={`${id}-h`} className="field-label">Height (px)</label>
          <input id={`${id}-h`} type="number" min={1} max={10000} className="field" value={value.height || ""} onChange={(e) => onChange({ ...value, height: Number(e.target.value) })} />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-alt`} className="field-label">Alt text</label>
        <input id={`${id}-alt`} className="field" value={value.alt} onChange={(e) => onChange({ ...value, alt: e.target.value })} maxLength={200} />
        <p className="mt-1 text-caption text-subtle">Describe the image for screen readers.</p>
      </div>
      <p role={message || error ? "alert" : "status"} className="min-h-[1.5em] text-body font-semibold">
        {busy ? "Uploading" : (message ?? error)}
      </p>
    </fieldset>
  );
}
