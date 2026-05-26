"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Employee,
  AttendanceRecord,
  LeaveRecord,
  PayrollRecord,
  Job,
  Applicant,
  Announcement,
  PerformanceReview,
  CompanySettings,
} from "@/lib/types";
import { buildDefaultSettings } from "@/lib/db-mappers";
import { fetchAllHrmData, loadStoredSettings } from "@/lib/hrm-api";

export interface HrmData {
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRecord[];
  payroll: PayrollRecord[];
  jobs: Job[];
  applicants: Applicant[];
  announcements: Announcement[];
  performanceReviews: PerformanceReview[];
  settings: CompanySettings;
}

interface HrmContextValue {
  data: HrmData | null;
  loading: boolean;
  refetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const HrmDataContext = createContext<HrmContextValue | null>(null);

export function HrmDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<HrmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefetch = false) => {
    if (isRefetch) setRefetching(true);
    else setLoading(true);

    try {
      const fetched = await fetchAllHrmData();
      const defaultSettings = buildDefaultSettings(fetched.employees);
      const storedSettings = loadStoredSettings();

      setData({
        ...fetched,
        settings: storedSettings
          ? { ...defaultSettings, ...storedSettings, company: { ...defaultSettings.company, ...storedSettings.company } }
          : defaultSettings,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load application data.");
    } finally {
      setLoading(false);
      setRefetching(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refetch = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  const value = useMemo(
    () => ({ data, loading, refetching, error, refetch }),
    [data, loading, refetching, error, refetch]
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading HR data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-destructive">{error ?? "Data unavailable"}</p>
        <button
          type="button"
          onClick={() => loadData()}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <HrmDataContext.Provider value={value}>
      {refetching && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center bg-background/80 py-2 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Refreshing...
          </div>
        </div>
      )}
      {children}
    </HrmDataContext.Provider>
  );
}

export function useHrmData(): HrmData {
  const context = useContext(HrmDataContext);
  if (!context?.data) {
    throw new Error("useHrmData must be used within HrmDataProvider");
  }
  return context.data;
}

export function useHrmActions() {
  const context = useContext(HrmDataContext);
  if (!context) {
    throw new Error("useHrmActions must be used within HrmDataProvider");
  }
  return { refetch: context.refetch, refetching: context.refetching, error: context.error };
}
