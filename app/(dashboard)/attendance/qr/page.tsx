"use client";

import { useCallback, useEffect, useState } from "react";
import { QrCode, RefreshCcw, ScanLine } from "lucide-react";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { useAuthUser } from "@/components/shared/auth-provider";
import { getClientAuthHeaders } from "@/lib/company-scope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface QrData {
  token: string;
  qrCode: string;
  date: string;
  status: string | null;
  checkInTime: string | null;
}

export default function MyQrPage() {
  const user = useAuthUser();
  const [data, setData] = useState<QrData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user.employeeId) {
      setError("Your account is not linked to an employee record.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/attendance/qr/generate?employee_id=${user.employeeId}`, { headers: getClientAuthHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load QR");
      setData(json as QrData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load QR");
    } finally {
      setLoading(false);
    }
  }, [user.employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isMarked = data?.status === "present" || data?.status === "late";

  return (
    <PageWrapper>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">My QR Code</h2>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className={loading ? "mr-1.5 h-4 w-4 animate-spin" : "mr-1.5 h-4 w-4"} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-base">
              <QrCode className="h-4 w-4" />
              Scan this QR code to mark attendance
            </CardTitle>
            <CardDescription>Show this code to the HR/admin scanner</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-8">
            {loading && (
              <div className="flex h-[320px] w-[320px] items-center justify-center rounded-xl border bg-muted/30">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            )}

            {!loading && error && (
              <div className="flex h-[320px] w-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
                <ScanLine className="h-10 w-10 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {!loading && !error && data && (
              <>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.qrCode}
                    alt="Attendance QR code"
                    width={320}
                    height={320}
                    className="block"
                  />
                </div>
                <p className="max-w-md text-center text-xs text-muted-foreground">
                  Token expires at the end of the day. Click refresh to generate a new code.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Status</CardTitle>
            <CardDescription>{user.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Status</p>
              {isMarked ? (
                <Badge className="mt-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  {data?.status === "late" ? "Late" : "Present"}
                </Badge>
              ) : (
                <Badge variant="outline" className="mt-1">Not marked</Badge>
              )}
            </div>
            {data?.checkInTime && (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Check-in time</p>
                <p className="text-sm font-medium">
                  {new Date(data.checkInTime).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Use the scanner inside HRFlow (HR/admin device) to scan this code and record your check-in.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
