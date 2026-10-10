import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Login | SUBTRACTION." };

export default function LoginPage() {
  return (
    <AuthShell
      title="Login"
      subtitle="Welcome back, we hope you find great pick in our endless collection of ultra rich black luxurious outfits."
    >
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
