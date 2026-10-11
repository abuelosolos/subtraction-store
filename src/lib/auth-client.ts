import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  // No baseURL: same-origin `/api/auth`, so it works on any preview host.
  // Types `session.user.role` / `phone` on the client (display only; the
  // server re-checks the role for everything that matters).
  plugins: [inferAdditionalFields<typeof auth>()],
});
