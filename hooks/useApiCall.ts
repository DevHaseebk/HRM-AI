"use client";

import { useCallback, useRef, useState } from "react";

interface UseApiCallOptions {
  /** Debounce window in ms — prevents rapid duplicate calls (default 300) */
  debounceMs?: number;
}

interface UseApiCallReturn<TArgs extends unknown[], TResult> {
  execute: (...args: TArgs) => Promise<TResult | undefined>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * useApiCall — guarantees an action runs at most once at a time and
 * blocks duplicate calls inside a debounce window.
 *
 * @example
 * const { execute, loading } = useApiCall(async (id: string) => {
 *   const res = await fetch(`/api/x/${id}`, { method: "DELETE" });
 *   if (!res.ok) throw new Error("Failed");
 *   return res.json();
 * });
 *
 * <Button onClick={() => execute("123")} disabled={loading}>Delete</Button>
 */
export function useApiCall<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: UseApiCallOptions = {}
): UseApiCallReturn<TArgs, TResult> {
  const { debounceMs = 300 } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const inFlightRef = useRef(false);
  const lastInvokeRef = useRef(0);

  const execute = useCallback(
    async (...args: TArgs) => {
      const now = Date.now();
      if (inFlightRef.current) return undefined;
      if (now - lastInvokeRef.current < debounceMs) return undefined;

      inFlightRef.current = true;
      lastInvokeRef.current = now;
      setLoading(true);
      setError(null);

      try {
        const result = await fn(...args);
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Unknown error");
        setError(e);
        throw e;
      } finally {
        setLoading(false);
        inFlightRef.current = false;
      }
    },
    [fn, debounceMs]
  );

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
    inFlightRef.current = false;
  }, []);

  return { execute, loading, error, reset };
}
