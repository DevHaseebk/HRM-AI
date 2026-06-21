"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  Calendar,
  Download,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  TrendingDown,
} from "lucide-react";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { AiAssistantTabs } from "@/components/shared/ai-assistant-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/shared/toast-provider";
import { useApiCall } from "@/hooks/useApiCall";
import { cn } from "@/lib/utils";
import { getClientAuthHeaders } from "@/lib/company-scope";

type Severity = "high" | "medium" | "low";

interface Anomaly {
  employeeId: string;
  employeeName: string;
  department: string;
  type: string;
  severity: Severity;
  label: string;
  metric: string;
  insight: string;
  recommendedAction: string;
}

interface AnomalyResponse {
  anomalies: Anomaly[];
  summary: {
    high: number;
    medium: number;
    low: number;
    total: number;
    analyzedEmployees: number;
    windowDays: number;
  };
}

const SEVERITY_STYLES: Record<Severity, { badge: string; icon: string; ring: string }> = {
  high: {
    badge: "bg-destructive/10 text-destructive border-destructive/30",
    icon: "text-destructive",
    ring: "ring-destructive/30",
  },
  medium: {
    badge: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
    icon: "text-amber-600 dark:text-amber-500",
    ring: "ring-amber-500/30",
  },
  low: {
    badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
    icon: "text-emerald-600 dark:text-emerald-500",
    ring: "ring-emerald-500/30",
  },
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function downloadCSV(rows: Anomaly[]) {
  const head = [
    "Employee",
    "Department",
    "Anomaly",
    "Severity",
    "Metric",
    "Insight",
    "Recommended Action",
  ];
  const lines = rows.map((r) =>
    [r.employeeName, r.department, r.label, r.severity, r.metric, r.insight, r.recommendedAction]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [head.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance-anomalies-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AnomaliesPage() {
  const toast = useToast();
  const [data, setData] = useState<AnomalyResponse | null>(null);
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [search, setSearch] = useState("");

  const runCall = useApiCall(async () => {
    const res = await fetch("/api/ai-anomalies", { headers: getClientAuthHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Analysis failed");
    setData(json as AnomalyResponse);
    toast.success(`Found ${json.summary.total} anomalies across ${json.summary.analyzedEmployees} employees`);
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.anomalies.filter((a) => {
      if (filter !== "all" && a.severity !== filter) return false;
      if (search && !`${a.employeeName} ${a.department} ${a.label}`.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [data, filter, search]);

  return (
    <PageWrapper>
      <div className="space-y-4">
        <AiAssistantTabs />

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Attendance Anomalies
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                AI analyses the last 90 days of attendance to surface patterns worth a closer look.
              </p>
            </div>
            <div className="flex gap-2">
              {data && (
                <Button
                  variant="outline"
                  onClick={() => downloadCSV(filtered)}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              )}
              <Button
                onClick={() => runCall.execute()}
                loading={runCall.loading}
                className="gap-1.5"
              >
                {!runCall.loading && <RefreshCw className="h-3.5 w-3.5" />}
                {data ? "Re-run Analysis" : "Run Analysis"}
              </Button>
            </div>
          </CardHeader>

          {runCall.loading && !data && (
            <CardContent>
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Analyzing 90 days of attendance…</p>
                <p className="text-xs text-muted-foreground">Detecting patterns, then asking AI for insights</p>
              </div>
            </CardContent>
          )}

          {!runCall.loading && !data && (
            <CardContent>
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <TrendingDown className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">No analysis yet</p>
                <p className="text-xs text-muted-foreground">
                  Click <strong>Run Analysis</strong> to scan your team&apos;s attendance for anomalies.
                </p>
              </div>
            </CardContent>
          )}

          {data && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatBlock label="Total" value={data.summary.total} tone="muted" />
                <StatBlock label="High Risk" value={data.summary.high} tone="high" />
                <StatBlock label="Medium" value={data.summary.medium} tone="medium" />
                <StatBlock label="Perfect / Reward" value={data.summary.low} tone="low" />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search employee, department, anomaly…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={filter} onValueChange={(v) => v && setFilter(v as Severity | "all")}>
                  <SelectTrigger className="sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All severities</SelectItem>
                    <SelectItem value="high">High only</SelectItem>
                    <SelectItem value="medium">Medium only</SelectItem>
                    <SelectItem value="low">Perfect attendance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
                  <Award className="h-8 w-8 text-emerald-500" />
                  <p className="text-sm font-medium">All clear — no anomalies match these filters</p>
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {filtered.map((a, idx) => (
                    <AnomalyCard key={`${a.employeeId}-${a.type}-${idx}`} anomaly={a} />
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </PageWrapper>
  );
}

function StatBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "high" | "medium" | "low" | "muted";
}) {
  const toneClass =
    tone === "high"
      ? "border-destructive/30 bg-destructive/5"
      : tone === "medium"
      ? "border-amber-500/30 bg-amber-500/5"
      : tone === "low"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : "border-border bg-muted/30";
  return (
    <div className={cn("rounded-lg border p-3", toneClass)}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const style = SEVERITY_STYLES[anomaly.severity];
  const isPerfect = anomaly.type === "perfect_attendance";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md",
        "ring-1",
        style.ring
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials(anomaly.employeeName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{anomaly.employeeName}</p>
          <p className="truncate text-xs text-muted-foreground">{anomaly.department}</p>
        </div>
        <Badge variant="outline" className={cn("text-[10px] font-semibold uppercase", style.badge)}>
          {anomaly.severity}
        </Badge>
      </div>

      <div>
        <p className="text-xs font-medium">{anomaly.label}</p>
        <p className="text-xs text-muted-foreground">{anomaly.metric}</p>
      </div>

      <div className="rounded-md border bg-muted/40 p-3 text-xs leading-relaxed">
        <p className="break-words">{anomaly.insight}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-[11px] text-muted-foreground">
          <strong>Recommended:</strong> {anomaly.recommendedAction}
        </p>
        <div className="flex gap-1.5">
          {isPerfect ? (
            <Button size="sm" variant="success" className="gap-1.5">
              <Award className="h-3.5 w-3.5" />
              Recognise
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Schedule
              </Button>
              <Button size="sm" variant="destructive" className="gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Warning
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
