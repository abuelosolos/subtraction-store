import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Login | SUBTRACTION." };

export default function LoginPage() {
  return (
    <AuthShell
      title="Admin"
      subtitle="Enter the admin password to manage the store."
    >
      <Suspense>
        <AuthForm />
      </Suspense>
    </AuthShell>
  );
}
