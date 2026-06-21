"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Loader2,
  Printer,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { AiAssistantTabs } from "@/components/shared/ai-assistant-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/shared/toast-provider";
import { useApiCall } from "@/hooks/useApiCall";
import { cn } from "@/lib/utils";
import { getClientAuthHeaders } from "@/lib/company-scope";

interface ReportMetrics {
  period: string;
  activeEmployees: number;
  newJoiners: number;
  exits: number;
  netChange: number;
  attendance: { totalRecords: number; presentPct: number; latePct: number; absentPct: number };
  leaves: { total: number; byType: Record<string, number>; approved: number; pending: number };
  payroll: { totalPaidPKR: number; paidRecords: number; pendingRecords: number };
  recruitment: { newApplications: number; hired: number; inInterview: number };
  performance: { reviewsCompleted: number; averageRating: number };
}

interface ChurnEmployee {
  id: string;
  full_name: string;
  department: string;
  designation: string;
  tenureMonths: number;
  attendanceTrend: "improving" | "stable" | "declining";
  recentLeaves: number;
  monthsSinceIncrement: number | null;
  avgRating: number | null;
  score: number;
  level: "high" | "medium" | "low";
  reason: string;
  recommendation: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];

function formatPKR(n: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(n);
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function ReportsPage() {
  const toast = useToast();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [report, setReport] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);

  const [churnData, setChurnData] = useState<{
    employees: ChurnEmployee[];
    summary: { total: number; high: number; medium: number; low: number; retentionScore: number };
  } | null>(null);
  const [churnFilter, setChurnFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const reportCall = useApiCall(async () => {
    const res = await fetch("/api/ai-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
      body: JSON.stringify({ month, year }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Report generation failed");
      if (json.metrics) setMetrics(json.metrics);
      return;
    }
    setReport(json.report);
    setMetrics(json.metrics);
    toast.success("Report generated");
  });

  const churnCall = useApiCall(async () => {
    const res = await fetch("/api/ai-churn", { headers: getClientAuthHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Churn analysis failed");
    setChurnData(json);
    toast.success(`Analyzed ${json.summary.total} employees`);
  });

  const filteredChurn = useMemo(() => {
    if (!churnData) return [];
    return churnData.employees.filter((e) =>
      churnFilter === "all" ? true : e.level === churnFilter
    );
  }, [churnData, churnFilter]);

  return (
    <PageWrapper>
      <div className="space-y-4">
        <AiAssistantTabs />

        {/* Monthly report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Monthly HR Report
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              AI-generated executive summary based on real metrics.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end no-print">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Month</p>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Year</p>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="sm:w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-1 gap-2 sm:justify-end">
                <Button
                  onClick={() => reportCall.execute()}
                  loading={reportCall.loading}
                >
                  {!reportCall.loading && "Generate Report"}
                </Button>
                {report && (
                  <Button
                    variant="outline"
                    onClick={() => window.print()}
                    className="gap-1.5"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print / PDF
                  </Button>
                )}
              </div>
            </div>

            {reportCall.loading && (
              <div className="mt-6 flex flex-col items-center gap-3 py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Generating report…</p>
                <p className="text-xs text-muted-foreground">Aggregating metrics + asking AI to summarise</p>
              </div>
            )}

            {metrics && !reportCall.loading && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 no-print">
                <MetricCard icon={Users} label="Active Employees" value={metrics.activeEmployees} />
                <MetricCard
                  icon={TrendingUp}
                  label="New Joiners"
                  value={metrics.newJoiners}
                  trend={metrics.newJoiners > metrics.exits ? "up" : metrics.newJoiners < metrics.exits ? "down" : "flat"}
                />
                <MetricCard icon={TrendingDown} label="Exits" value={metrics.exits} />
                <MetricCard icon={Wallet} label="Payroll Paid" value={formatPKR(metrics.payroll.totalPaidPKR)} small />
              </div>
            )}

            {metrics && !reportCall.loading && (
              <div className="mt-3 grid gap-3 sm:grid-cols-3 no-print">
                <MetricCard
                  label="Attendance"
                  value={`${metrics.attendance.presentPct}% present`}
                  sub={`${metrics.attendance.latePct}% late · ${metrics.attendance.absentPct}% absent`}
                  small
                />
                <MetricCard
                  label="Leaves"
                  value={`${metrics.leaves.total} total`}
                  sub={`${metrics.leaves.approved} approved · ${metrics.leaves.pending} pending`}
                  small
                />
                <MetricCard
                  label="Recruitment"
                  value={`${metrics.recruitment.newApplications} applicants`}
                  sub={`${metrics.recruitment.hired} hired this month`}
                  small
                />
              </div>
            )}

            {report && (
              <div className="print-area mt-6 rounded-lg border bg-card p-6 shadow-sm">
                <div className="mb-4 border-b pb-4 text-center">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">HRFlow</p>
                  <h2 className="mt-1 text-xl font-bold">Monthly HR Report</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{metrics?.period}</p>
                </div>
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">
                  {report}
                </pre>
                <div className="mt-6 border-t pt-4 text-[11px] text-muted-foreground">
                  Generated by HRFlow AI · {new Date().toLocaleString("en-PK")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Churn risk */}
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Employee Churn Risk
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                AI-predicted attrition risk per active employee.
              </p>
            </div>
            <Button
              onClick={() => churnCall.execute()}
              loading={churnCall.loading}
              variant={churnData ? "outline" : "default"}
            >
              {!churnCall.loading && (churnData ? "Re-run" : "Analyse Churn Risk")}
            </Button>
          </CardHeader>

          {churnCall.loading && !churnData && (
            <CardContent>
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Scoring employees…</p>
                <p className="text-xs text-muted-foreground">Looking at attendance, leaves, increments, and ratings</p>
              </div>
            </CardContent>
          )}

          {churnData && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <RetentionStat label="Retention Score" value={`${churnData.summary.retentionScore}%`} tone="primary" />
                <RetentionStat label="High Risk" value={churnData.summary.high} tone="high" />
                <RetentionStat label="Medium" value={churnData.summary.medium} tone="medium" />
                <RetentionStat label="Stable" value={churnData.summary.low} tone="low" />
              </div>

              <Select value={churnFilter} onValueChange={(v) => v && setChurnFilter(v as typeof churnFilter)}>
                <SelectTrigger className="sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  <SelectItem value="high">High risk</SelectItem>
                  <SelectItem value="medium">Medium risk</SelectItem>
                  <SelectItem value="low">Stable</SelectItem>
                </SelectContent>
              </Select>

              <div className="grid gap-3 lg:grid-cols-2">
                {filteredChurn.map((e) => (
                  <ChurnCard key={e.id} emp={e} />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </PageWrapper>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  small,
}: {
  icon?: typeof Users;
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "flat";
  small?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <p className={cn("mt-1 font-bold", small ? "text-lg" : "text-2xl")}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
      {trend === "up" && <p className="mt-1 text-[11px] text-emerald-600">▲ Growing team</p>}
      {trend === "down" && <p className="mt-1 text-[11px] text-destructive">▼ Net loss</p>}
    </div>
  );
}

function RetentionStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "high" | "medium" | "low" | "primary";
}) {
  const toneClass =
    tone === "high"
      ? "border-destructive/30 bg-destructive/5"
      : tone === "medium"
      ? "border-amber-500/30 bg-amber-500/5"
      : tone === "low"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : "border-primary/30 bg-primary/5";
  return (
    <div className={cn("rounded-lg border p-3", toneClass)}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ChurnCard({ emp }: { emp: ChurnEmployee }) {
  const level = emp.level;
  const toneClass =
    level === "high"
      ? "ring-destructive/40 bg-destructive/5"
      : level === "medium"
      ? "ring-amber-500/40 bg-amber-500/5"
      : "ring-emerald-500/40 bg-emerald-500/5";
  const badgeClass =
    level === "high"
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : level === "medium"
      ? "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400"
      : "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400";

  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm ring-1 transition-all hover:shadow-md", toneClass)}>
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials(emp.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{emp.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{emp.designation} · {emp.department}</p>
        </div>
        <Badge variant="outline" className={cn("text-[10px] font-semibold uppercase", badgeClass)}>
          {level}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/30 p-2 text-[11px]">
        <div>Tenure: <span className="font-medium text-foreground">{emp.tenureMonths} mo</span></div>
        <div>Attendance: <span className="font-medium text-foreground capitalize">{emp.attendanceTrend}</span></div>
        <div>Recent leaves: <span className="font-medium text-foreground">{emp.recentLeaves}</span></div>
        <div>Rating: <span className="font-medium text-foreground">{emp.avgRating ?? "N/A"}</span></div>
      </div>

      <div className="rounded-md border bg-background p-3 text-xs leading-relaxed">
        {emp.reason}
      </div>

      <div className="flex items-center justify-between gap-2 border-t pt-2">
        <p className="text-[11px] text-muted-foreground">
          <strong>Action:</strong> {emp.recommendation}
        </p>
        <span className="text-[11px] font-medium text-muted-foreground">Score {emp.score}</span>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
