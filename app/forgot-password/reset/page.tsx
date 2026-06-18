"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function getStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return { label: "Weak", className: "bg-red-500", width: "w-1/3" };
  if (score <= 3) return { label: "Medium", className: "bg-amber-500", width: "w-2/3" };
  return { label: "Strong", className: "bg-emerald-500", width: "w-full" };
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(() => searchParams.get("email") ?? "", [searchParams]);
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const strength = getStrength(password);

  useEffect(() => {
    if (!email || !token) router.replace("/forgot-password");
  }, [email, token, router]);

  const validationErrors = [
    password.length >= 8 ? "" : "Min 8 characters",
    /[A-Z]/.test(password) ? "" : "Must have uppercase",
    /[a-z]/.test(password) ? "" : "Must have lowercase",
    /[0-9]/.test(password) ? "" : "Must have number",
    password && confirm && password === confirm ? "" : "Passwords must match",
  ].filter(Boolean);

  const canSubmit = validationErrors.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reset_token: token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setSuccess(true);
      window.setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Password reset successfully!
          </h1>
          <p className="mt-2 text-sm text-slate-500">Redirecting you to login...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-10">
      <div className="w-full max-w-md animate-[slide-up_0.5s_ease-out]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg shadow-violet-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Set New Password</h1>
          <p className="mt-2 text-sm text-slate-500">Choose a strong password for your HRFlow account.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <PasswordField
            id="password"
            label="New Password"
            value={password}
            show={showPassword}
            onToggle={() => setShowPassword((value) => !value)}
            onChange={setPassword}
          />

          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={cn("h-full rounded-full transition-all", strength.className, strength.width)} />
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500">Strength: {strength.label}</p>
          </div>

          <div className="mt-5">
            <PasswordField
              id="confirm"
              label="Confirm Password"
              value={confirm}
              show={showConfirm}
              onToggle={() => setShowConfirm((value) => !value)}
              onChange={setConfirm}
            />
          </div>

          {validationErrors.length > 0 && (password || confirm) && (
            <ul className="mt-4 space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              {validationErrors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-6 h-11 w-full" disabled={loading || !canSubmit}>
            {loading ? "Saving..." : "Reset Password"}
          </Button>
        </form>

        <Link href="/login" className="mt-6 block text-center text-sm font-medium text-slate-500 hover:text-slate-900">
          Back to login
        </Link>
      </div>
    </main>
  );
}

function PasswordField({
  id,
  label,
  value,
  show,
  onToggle,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-slate-700">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          className="h-11 pr-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-slate-600"
          onClick={onToggle}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
