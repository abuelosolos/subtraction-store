import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/session";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
// The client sends `products/<file name>`; reject anything else outright.
const PATHNAME = /^(products|categories)\/[\w][\w .\-]{0,99}$/;

/**
 * Client-upload token endpoint for product and category images. The browser
 * uploads straight to Blob (no server-action body limit); this route only
 * decides who may upload and what. Admin is re-checked on every token request.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Token requests come from the browser and must be an admin. (Completion
  // callbacks come from Vercel Blob and are signature-checked by handleUpload.)
  if (body.type === "blob.generate-client-token" && !(await getAdminUser())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const admin = await getAdminUser();
        if (!admin) throw new Error("forbidden");
        if (!PATHNAME.test(pathname) || pathname.includes("..")) throw new Error("bad_pathname");
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ actor: admin.id }),
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    const forbidden = err instanceof Error && err.message === "forbidden";
    return NextResponse.json(
      { error: forbidden ? "Forbidden" : "Upload not allowed" },
      { status: forbidden ? 403 : 400 },
    );
  }
}
