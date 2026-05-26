"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";

interface NavigationContextValue {
  isNavigating: boolean;
  pendingHref: string | null;
  startNavigation: (href: string) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return context;
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const startNavigation = useCallback((href: string) => {
    if (href !== pathname) {
      setPendingHref(href);
    }
  }, [pathname]);

  return (
    <NavigationContext.Provider
      value={{
        isNavigating: pendingHref !== null,
        pendingHref,
        startNavigation,
      }}
    >
      <NavigationProgress />
      {children}
    </NavigationContext.Provider>
  );
}

function NavigationProgress() {
  const { isNavigating } = useNavigation();

  if (!isNavigating) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary/10"
      role="progressbar"
      aria-label="Loading page"
    >
      <div className="h-full w-1/3 animate-[navigation-progress_1s_ease-in-out_infinite] bg-primary" />
    </div>
  );
}
