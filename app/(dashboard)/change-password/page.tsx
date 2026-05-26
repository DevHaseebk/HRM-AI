"use client";

import { useRouter } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default function ChangePasswordPage() {
  const router = useRouter();

  return (
    <ChangePasswordForm
      forced
      onSuccess={() => router.replace("/dashboard")}
    />
  );
}
