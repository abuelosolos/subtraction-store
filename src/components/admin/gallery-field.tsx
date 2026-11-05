"use client";

import Image from "next/image";
import { useId, useRef, type Dispatch, type SetStateAction } from "react";

import { IMAGE_TYPES, UploadError, uploadImage } from "@/components/admin/blob-upload";

export type PhotoKind = "front" | "side" | "back" | "item";

export type PhotoValue = {
  /** Client-only key, stable while the tile is on screen. */
  id: string;
  kind: PhotoKind;
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Alt text was typed by the admin, so changing the view no longer rewrites it. */
  altEdited?: boolean;
  status?: "uploading" | "error";
  error?: string;
};

export const MAX_PHOTOS = 8;
const KINDS: { value: PhotoKind; label: string }[] = [
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "back", label: "Back" },
  { value: "item", label: "Detail" },
];
const labelOf = (kind: PhotoKind) => KINDS.find((k) => k.value === kind)?.label ?? kind;

export const newPhotoId = () => crypto.randomUUID();

/** Default description for screen readers, e.g. "Heavyweight tee, front view". */
export const defaultAlt = (name: string, kind: PhotoKind) =>
  `${name.trim() || "Product"}, ${labelOf(kind).toLowerCase()} view`;

/** First view not used yet (front, side, back, detail), else detail. */
function nextKind(photos: PhotoValue[]): PhotoKind {
  return KINDS.find((k) => !photos.some((p) => p.kind === k.value))?.value ?? "item";
}

/**
 * Multi-photo editor for a product: upload several images at once, choose each
 * photo's view, replace, remove, reorder and pick the main (card) photo.
 * Controlled by the parent form; `setPhotos` takes updater functions because
 * uploads finish asynchronously.
 */
export function GalleryField({
  photos,
  setPhotos,
  mainId,
  setMainId,
  productName,
  errors = {},
}: {
  photos: PhotoValue[];
  setPhotos: Dispatch<SetStateAction<PhotoValue[]>>;
  mainId: string | undefined;
  setMainId: (id: string) => void;
  productName: string;
  errors?: Record<string, string | undefined>;
}) {
  const id = useId();
  const addRef = useRef<HTMLInputElement>(null);
  const effectiveMain = photos.some((p) => p.id === mainId) ? mainId : photos[0]?.id;
  const full = photos.length >= MAX_PHOTOS;

  const patch = (photoId: string, change: Partial<PhotoValue>) =>
    setPhotos((cur) => cur.map((p) => (p.id === photoId ? { ...p, ...change } : p)));

  async function run(photoId: string, file: File) {
    patch(photoId, { status: "uploading", error: undefined });
    try {
      const { src, width, height } = await uploadImage("products", file);
      patch(photoId, { src, width, height, status: undefined });
    } catch (err) {
      patch(photoId, {
        status: "error",
        error: err instanceof UploadError ? err.message : "The upload failed. Try again.",
      });
    }
  }

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = [...list].slice(0, MAX_PHOTOS - photos.length);
    const added: PhotoValue[] = [];
    for (let i = 0; i < files.length; i++) {
      const kind = nextKind([...photos, ...added]);
      added.push({
        id: newPhotoId(),
        kind,
        src: "",
        width: 0,
        height: 0,
        alt: defaultAlt(productName, kind),
        status: "uploading",
      });
    }
    setPhotos((cur) => [...cur, ...added]);
    added.forEach((photo, i) => void run(photo.id, files[i]));
    if (addRef.current) addRef.current.value = "";
  }

  function replaceFile(photoId: string, file: File | undefined) {
    if (file) void run(photoId, file);
  }

  const move = (index: number, by: -1 | 1) =>
    setPhotos((cur) => {
      const to = index + by;
      if (to < 0 || to >= cur.length) return cur;
      const next = [...cur];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });

  const remove = (photoId: string) => setPhotos((cur) => cur.filter((p) => p.id !== photoId));

  const setKind = (photo: PhotoValue, kind: PhotoKind) =>
    patch(photo.id, {
      kind,
      alt: photo.altEdited ? photo.alt : defaultAlt(productName, kind),
    });

  const fieldError = (index: number, key: string) => {
    const message = errors[`images.${index}.${key}`];
    return message ? (
      <p role="alert" className="mt-1 text-caption font-semibold text-[var(--admin-bad)]">{message}</p>
    ) : null;
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-body text-muted">
        Add up to {MAX_PHOTOS} photos. Choose each photo&apos;s view, order them as they should appear on the product
        page, and pick the main photo shown on product cards.
      </p>

      {photos.length === 0 ? <p className="text-body text-muted">No photos yet.</p> : null}

      <ul className="admin-gallery" aria-label="Product photos">
        {photos.map((photo, index) => {
          const isMain = photo.id === effectiveMain;
          return (
            <li key={photo.id} className="admin-photo" data-main={isMain || undefined}>
              <div className="admin-photo-frame">
                {photo.src ? (
                  <Image
                    src={photo.src}
                    alt={photo.alt || "Preview"}
                    width={photo.width || 300}
                    height={photo.height || 400}
                    unoptimized
                    className="size-full object-contain"
                  />
                ) : (
                  <span className="text-caption text-muted">
                    {photo.status === "error" ? "Upload failed" : "Uploading"}
                  </span>
                )}
                {photo.status === "uploading" && photo.src ? (
                  <span className="admin-photo-badge">Uploading</span>
                ) : null}
                {isMain ? <span className="admin-photo-badge" data-main>Main</span> : null}
              </div>

              {photo.status === "error" ? (
                <p role="alert" className="text-caption font-semibold text-[var(--admin-bad)]">{photo.error}</p>
              ) : null}
              {fieldError(index, "src")}

              <div>
                <label htmlFor={`${id}-${photo.id}-kind`} className="field-label">View</label>
                <select
                  id={`${id}-${photo.id}-kind`}
                  className="field"
                  value={photo.kind}
                  onChange={(e) => setKind(photo, e.target.value as PhotoKind)}
                >
                  {KINDS.map((k) => (<option key={k.value} value={k.value}>{k.label}</option>))}
                </select>
                {fieldError(index, "kind")}
              </div>

              <div>
                <label htmlFor={`${id}-${photo.id}-alt`} className="field-label">Alt text</label>
                <input
                  id={`${id}-${photo.id}-alt`}
                  className="field"
                  value={photo.alt}
                  maxLength={200}
                  onChange={(e) => patch(photo.id, { alt: e.target.value, altEdited: true })}
                  aria-invalid={errors[`images.${index}.alt`] ? true : undefined}
                />
                {fieldError(index, "alt")}
              </div>

              <label className="flex min-h-11 items-center gap-3 text-body">
                <input
                  type="radio"
                  name={`${id}-main`}
                  className="size-5 accent-[var(--ink)]"
                  checked={isMain}
                  disabled={photo.status !== undefined}
                  onChange={() => setMainId(photo.id)}
                />
                Main photo
              </label>

              <div className="admin-photo-actions">
                <button
                  type="button"
                  className="admin-action"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${labelOf(photo.kind)} photo earlier`}
                >
                  ← Earlier
                </button>
                <button
                  type="button"
                  className="admin-action"
                  onClick={() => move(index, 1)}
                  disabled={index === photos.length - 1}
                  aria-label={`Move ${labelOf(photo.kind)} photo later`}
                >
                  Later →
                </button>
                <label className="admin-action cursor-pointer" aria-disabled={photo.status === "uploading"}>
                  Replace
                  <input
                    type="file"
                    accept={IMAGE_TYPES.join(",")}
                    className="sr-only"
                    disabled={photo.status === "uploading"}
                    onChange={(e) => {
                      replaceFile(photo.id, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="admin-action"
                  data-danger="true"
                  onClick={() => remove(photo.id)}
                  aria-label={`Remove ${labelOf(photo.kind)} photo`}
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={addRef}
          id={`${id}-add`}
          type="file"
          multiple
          accept={IMAGE_TYPES.join(",")}
          disabled={full}
          onChange={(e) => addFiles(e.target.files)}
          className="sr-only"
        />
        <label htmlFor={`${id}-add`} className="btn btn-outline cursor-pointer" aria-disabled={full}>
          Add photos
        </label>
        <p className="text-caption text-muted">
          {photos.length}/{MAX_PHOTOS}. JPEG, PNG, WebP or AVIF, up to 5 MB each. Pick several at once.
        </p>
      </div>
      {errors.images ? (
        <p role="alert" className="text-caption font-semibold text-[var(--admin-bad)]">{errors.images}</p>
      ) : null}
      {errors.mainIndex ? (
        <p role="alert" className="text-caption font-semibold text-[var(--admin-bad)]">{errors.mainIndex}</p>
      ) : null}
    </div>
  );
}
