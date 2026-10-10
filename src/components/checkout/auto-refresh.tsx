"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-runs the server page a few times while payment confirmation is pending. */
export function AutoRefresh({ times = 8, everyMs = 4000 }: { times?: number; everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    let count = 0;
    const id = setInterval(() => {
      count += 1;
      router.refresh();
      if (count >= times) clearInterval(id);
    }, everyMs);
    return () => clearInterval(id);
  }, [router, times, everyMs]);
  return null;
}
