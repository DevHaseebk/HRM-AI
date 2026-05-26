"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import type { AuthUser } from "@/lib/types";

interface AuthContextValue {
  user: AuthUser;
  setUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthUser() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthUser must be used within AuthProvider");
  }
  return ctx.user;
}

export function useAuthActions() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthActions must be used within AuthProvider");
  }
  return { setUser: ctx.setUser };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser) {
      router.replace("/login");
      return;
    }
    setUser(authUser);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!user || loading) return;

    const isForcedPage = pathname === "/change-password";
    const isVoluntaryPage = pathname === "/settings/change-password";

    if (user.mustChangePassword && !isForcedPage) {
      router.replace("/change-password");
      return;
    }

    if (!user.mustChangePassword && isForcedPage) {
      router.replace("/dashboard");
    }

    if (user.mustChangePassword && isVoluntaryPage) {
      router.replace("/change-password");
    }
  }, [user, loading, pathname, router]);

  useEffect(() => {
    if (!user?.mustChangePassword || pathname !== "/change-password") return;

    const blockBack = () => {
      window.history.pushState(null, "", "/change-password");
    };

    window.history.pushState(null, "", "/change-password");
    window.addEventListener("popstate", blockBack);
    return () => window.removeEventListener("popstate", blockBack);
  }, [user?.mustChangePassword, pathname]);

  const value = useMemo(
    () => (user ? { user, setUser } : null),
    [user]
  );

  if (loading || !value) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

/** @deprecated Use AuthProvider + useAuthUser instead */
export function AuthGuard({
  children,
}: {
  children: (user: AuthUser) => React.ReactNode;
}) {
  const user = useContext(AuthContext)?.user;
  if (!user) return null;
  return <>{children(user)}</>;
}
