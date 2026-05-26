"use client";

import { useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Eye,
  EyeOff,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveAuth, ROLE_LABELS } from "@/lib/auth";
import type { AuthUser, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const QUICK_ACCOUNTS: {
  email: string;
  password: string;
  role: Role;
  description: string;
  icon: typeof Shield;
  accent: string;
}[] = [
  {
    email: "super@hr.com",
    password: "pass123",
    role: "super_admin",
    description: "Full system access",
    icon: Shield,
    accent: "from-violet-500/20 to-violet-500/5 border-violet-500/20 hover:border-violet-500/40",
  },
  {
    email: "hr@hr.com",
    password: "pass123",
    role: "hr_manager",
    description: "HR operations & payroll",
    icon: Users,
    accent: "from-blue-500/20 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40",
  },
  {
    email: "lead@hr.com",
    password: "pass123",
    role: "team_lead",
    description: "Team attendance & leaves",
    icon: Briefcase,
    accent: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40",
  },
  {
    email: "emp@hr.com",
    password: "pass123",
    role: "employee",
    description: "Personal HR self-service",
    icon: Zap,
    accent: "from-amber-500/20 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40",
  },
];

async function authenticate(email: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Invalid email or password");
  }

  return data.user as AuthUser;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);

  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    setError("");
    const user = await authenticate(loginEmail, loginPassword);
    saveAuth(user);
    // hard navigation guarantees middleware sees the new cookie on first load
    window.location.href = user.mustChangePassword
      ? "/change-password"
      : "/dashboard";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || quickLoading !== null) return;
    setLoading(true);
    try {
      await handleLogin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  const handleQuickLogin = async (accountEmail: string, accountPassword: string) => {
    if (loading || quickLoading !== null) return;
    setQuickLoading(accountEmail);
    setError("");
    try {
      await handleLogin(accountEmail, accountPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setQuickLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Dark branding sidebar */}
      <aside className="relative hidden w-[420px] shrink-0 flex-col justify-between overflow-hidden bg-[#0f1117] p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-blue-600/15 blur-3xl animate-[pulse_5s_ease-in-out_infinite_1s]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        <div className="relative animate-[fade-in_0.6s_ease-out]">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg shadow-violet-500/25">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">HRFlow</h1>
              <p className="text-xs text-white/50">Human Resources Platform</p>
            </div>
          </div>

          <h2 className="mb-3 text-3xl font-semibold leading-tight">
            Manage your workforce with clarity.
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-white/60">
            Attendance, payroll, recruitment, and performance — all in one place
            built for modern Pakistani organizations.
          </p>
        </div>

        <div className="relative space-y-4 animate-[fade-in_0.8s_ease-out]">
          {[
            "15 employees · PKR payroll",
            "Role-based access control",
            "Real-time HR analytics",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 text-sm text-white/70">
              <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              {item}
            </div>
          ))}
          <p className="pt-4 text-xs text-white/30">
            © 2026 HRFlow · Karachi, Pakistan
          </p>
        </div>
      </aside>

      {/* Login form panel */}
      <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-10 sm:px-8">
        <div className="mb-8 flex items-center gap-2 lg:hidden animate-[fade-in_0.4s_ease-out]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold">HRFlow</span>
        </div>

        <div className="w-full max-w-md animate-[slide-up_0.5s_ease-out]">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to your HR management account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.pk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-slate-200 bg-white transition-shadow focus-visible:shadow-md focus-visible:shadow-violet-500/10"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 border-slate-200 bg-white pr-10 transition-shadow focus-visible:shadow-md focus-visible:shadow-violet-500/10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div
                className="animate-[shake_0.4s_ease-in-out] rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md shadow-violet-500/20 transition-all hover:shadow-lg hover:shadow-violet-500/30 hover:brightness-110"
              disabled={loading || quickLoading !== null}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Quick Login */}
          <div className="mt-10">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Quick Login
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <p className="mb-4 text-center text-xs text-slate-400">
              One-click access with demo accounts · password:{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">
                pass123
              </code>
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              {QUICK_ACCOUNTS.map((account) => {
                const Icon = account.icon;
                const isLoading = quickLoading === account.email;

                return (
                  <button
                    key={account.email}
                    type="button"
                    disabled={loading || quickLoading !== null}
                    onClick={() =>
                      handleQuickLogin(account.email, account.password)
                    }
                    className={cn(
                      "group relative flex flex-col items-start gap-1 rounded-xl border bg-gradient-to-br p-3.5 text-left transition-all duration-200",
                      "hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
                      "disabled:pointer-events-none disabled:opacity-50",
                      account.accent
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-slate-600" />
                        <span className="text-sm font-medium text-slate-800">
                          {ROLE_LABELS[account.role]}
                        </span>
                      </div>
                      {isLoading ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{account.email}</span>
                    <span className="text-[11px] text-slate-400">
                      {account.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
