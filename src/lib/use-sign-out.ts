"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

/** Signs out, returns home and refreshes server data. */
export function useSignOut() {
  const router = useRouter();
  return async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };
}
