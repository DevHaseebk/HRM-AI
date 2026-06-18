"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => {
      setCountdown((value) => Math.max(value - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || countdown > 0) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.status === 429) {
        setCountdown(Number(data.remainingSeconds ?? 60));
        setError("Please wait before requesting another OTP.");
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      router.push(`/forgot-password/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-10">
      <div className="w-full max-w-md animate-[slide-up_0.5s_ease-out]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg shadow-violet-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Forgot Password
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Enter your account email and we will send a reset OTP.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700">Email address</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="h-11 pl-10"
                placeholder="you@company.pk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {countdown > 0 && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Please wait {formatTime(countdown)} before requesting again.
            </p>
          )}

          {error && countdown === 0 && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-6 h-11 w-full" disabled={loading || countdown > 0}>
            {loading ? "Sending..." : "Send OTP"}
          </Button>
        </form>

        <Link href="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    </main>
  );
}
