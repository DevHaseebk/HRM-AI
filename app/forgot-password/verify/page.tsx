"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(() => searchParams.get("email") ?? "", [searchParams]);
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otp = digits.join("");

  useEffect(() => {
    if (!email) router.replace("/forgot-password");
  }, [email, router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => {
      setCountdown((value) => Math.max(value - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const verify = async (code: string) => {
    if (loading || code.length !== 6) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid OTP");
      }

      router.push(
        `/forgot-password/reset?email=${encodeURIComponent(email)}&token=${encodeURIComponent(data.reset_token)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
      setShake(true);
      setDigits(Array(6).fill(""));
      inputRefs.current[0]?.focus();
      window.setTimeout(() => setShake(false), 450);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (otp.length === 6 && digits.every(Boolean)) {
      verify(otp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleChange = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = nextValue;
    setDigits(next);
    setError("");

    if (nextValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 0) return;
    const next = Array(6).fill("");
    pasted.split("").forEach((digit, index) => {
      next[index] = digit;
    });
    setDigits(next);
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleResend = async () => {
    if (resending || countdown > 0) return;
    setResending(true);
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
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to resend OTP");
      setCountdown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-10">
      <div className="w-full max-w-md animate-[slide-up_0.5s_ease-out]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg shadow-violet-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Enter OTP</h1>
          <p className="mt-2 text-sm text-slate-500">
            We sent a 6-digit code to <span className="font-medium text-slate-700">{email}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className={cn("flex justify-center gap-2", shake && "animate-[shake_0.4s_ease-in-out]")}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(node) => {
                  inputRefs.current[index] = node;
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="h-12 w-11 rounded-lg border border-slate-200 bg-white text-center text-xl font-semibold text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                maxLength={1}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700">
              {error}
            </p>
          )}

          <Button
            type="button"
            className="mt-6 h-11 w-full"
            disabled={loading || otp.length !== 6}
            onClick={() => verify(otp)}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="mt-3 h-10 w-full gap-2"
            disabled={resending || countdown > 0}
            onClick={handleResend}
          >
            <RefreshCcw className="h-4 w-4" />
            {countdown > 0 ? `Resend in ${formatTime(countdown)}` : resending ? "Sending..." : "Resend OTP"}
          </Button>
        </div>

        <Link href="/forgot-password" className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Change email
        </Link>
      </div>
    </main>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpContent />
    </Suspense>
  );
}
