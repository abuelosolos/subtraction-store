import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Create an account | SUBTRACTION." };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create an account"
      subtitle="Shop and find yourself in our endless collection of dark persona and ultra rich black luxurious outfits."
    >
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </AuthShell>
  );
}
