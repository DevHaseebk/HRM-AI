"use client";

import { PageWrapper } from "@/components/shared/page-wrapper";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { useToast } from "@/components/shared/toast-provider";

export default function SettingsChangePasswordPage() {
  const toast = useToast();

  return (
    <PageWrapper>
      <ChangePasswordForm
        onSuccess={() => toast.success("Password updated successfully")}
      />
    </PageWrapper>
  );
}
