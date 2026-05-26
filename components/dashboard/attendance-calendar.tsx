"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AttendanceRecord } from "@/lib/types";

interface AttendanceCalendarProps {
  cells: ({ day: number; status: AttendanceRecord["status"] | null } | null)[];
  monthLabel: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const statusStyles: Record<AttendanceRecord["status"], string> = {
  present:
    "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
  late: "bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
  absent: "bg-rose-100 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300",
  on_leave: "bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
};

export function AttendanceCalendar({ cells, monthLabel }: AttendanceCalendarProps) {
  const today = new Date().getDate();
  const currentMonthLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const isCurrentMonth = monthLabel === currentMonthLabel;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">My Attendance</CardTitle>
        <p className="text-xs text-muted-foreground">{monthLabel}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="pb-1.5 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              {d}
            </div>
          ))}
          {cells.map((cell, i) => {
            if (!cell) return <div key={`empty-${i}`} className="aspect-square" />;
            const isToday = isCurrentMonth && cell.day === today;
            return (
              <div
                key={`day-${cell.day}`}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-medium transition-transform hover:scale-105",
                  cell.status
                    ? statusStyles[cell.status]
                    : "bg-muted/40 text-muted-foreground",
                  isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                <span>{cell.day}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <Legend color="bg-emerald-400" label="Present" />
          <Legend color="bg-amber-400" label="Late" />
          <Legend color="bg-rose-400" label="Absent" />
          <Legend color="bg-blue-400" label="On Leave" />
          <Legend color="bg-muted" label="No record" />
        </div>
      </CardContent>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span className={cn("h-2.5 w-2.5 rounded-sm", color)} />
      {label}
    </div>
  );
}
