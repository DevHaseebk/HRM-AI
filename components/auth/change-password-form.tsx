"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthUser, useAuthActions } from "@/components/shared/auth-provider";
import { updateAuthUser } from "@/lib/auth";
import { validateNewPassword } from "@/lib/password-utils";
import { cn } from "@/lib/utils";

interface ChangePasswordFormProps {
  forced?: boolean;
  onSuccess?: () => void;
}

export function ChangePasswordForm({ forced = false, onSuccess }: ChangePasswordFormProps) {
  const user = useAuthUser();
  const { setUser } = useAuthActions();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const validation = useMemo(
    () => validateNewPassword(newPassword, confirmPassword),
    [newPassword, confirmPassword]
  );

  const showErrors = newPassword.length > 0 || confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");

    if (!currentPassword) {
      setApiError("Current password is required");
      return;
    }

    if (!validation.valid) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      const updated = updateAuthUser({
        mustChangePassword: false,
        isTempPassword: false,
      });

      if (updated) {
        setUser(updated);
      }

      onSuccess?.();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSubmitting(false);
    }
  };

  const form = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PasswordField
        id="current"
        label="Current Password"
        value={currentPassword}
        onChange={setCurrentPassword}
        show={showCurrent}
        onToggleShow={() => setShowCurrent(!showCurrent)}
      />
      <PasswordField
        id="new"
        label="New Password"
        value={newPassword}
        onChange={setNewPassword}
        show={showNew}
        onToggleShow={() => setShowNew(!showNew)}
      />
      <PasswordField
        id="confirm"
        label="Confirm New Password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        show={showConfirm}
        onToggleShow={() => setShowConfirm(!showConfirm)}
      />

      {showErrors && validation.errors.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          {validation.errors.map((err) => (
            <li key={err} className="text-xs text-destructive">
              • {err}
            </li>
          ))}
        </ul>
      )}

      {apiError && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {apiError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={submitting || !validation.valid || !currentPassword}>
        {submitting ? "Updating..." : "Set New Password"}
      </Button>
    </form>
  );

  if (forced) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">HRFlow</span>
          </div>
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Change Your Password</CardTitle>
              <CardDescription>
                You are using a temporary password. Please set a new password to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>{form}</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4" />
          Change Password
        </CardTitle>
        <CardDescription>Update your account password</CardDescription>
      </CardHeader>
      <CardContent className="max-w-md">{form}</CardContent>
    </Card>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
          autoComplete={id === "current" ? "current-password" : "new-password"}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("absolute right-0 top-0 h-full px-3 text-muted-foreground")}
          onClick={onToggleShow}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
