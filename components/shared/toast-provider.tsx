"use client";

import { useCallback, useMemo } from "react";
import toast, { Toaster, type ToasterProps } from "react-hot-toast";
import { useTheme } from "next-themes";

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  loading: (message: string) => string;
  dismiss: (id?: string) => void;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <HRFlowToaster />
    </>
  );
}

function HRFlowToaster() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const options: ToasterProps["toastOptions"] = useMemo(
    () => ({
      duration: 3500,
      style: {
        background: isDark ? "hsl(222 47% 12%)" : "#ffffff",
        color: isDark ? "hsl(210 40% 98%)" : "hsl(222 47% 11%)",
        border: isDark
          ? "1px solid hsl(217 33% 20%)"
          : "1px solid hsl(214 32% 91%)",
        borderRadius: "10px",
        padding: "12px 14px",
        fontSize: "14px",
        boxShadow:
          "0 10px 25px -10px rgb(0 0 0 / 0.2), 0 6px 12px -6px rgb(0 0 0 / 0.1)",
      },
      success: {
        iconTheme: {
          primary: "#10b981",
          secondary: "#ffffff",
        },
      },
      error: {
        iconTheme: {
          primary: "#ef4444",
          secondary: "#ffffff",
        },
      },
    }),
    [isDark]
  );

  return (
    <Toaster
      position="top-right"
      gutter={8}
      toastOptions={options}
    />
  );
}

export function useToast(): ToastContextValue {
  const success = useCallback((message: string) => {
    toast.success(message);
  }, []);
  const error = useCallback((message: string) => {
    toast.error(message);
  }, []);
  const loading = useCallback((message: string) => toast.loading(message), []);
  const dismiss = useCallback((id?: string) => toast.dismiss(id), []);

  return { success, error, loading, dismiss };
}

// Re-export the raw toast for advanced cases
export { toast };
