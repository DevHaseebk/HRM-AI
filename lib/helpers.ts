import type { PerformanceReview } from "./types";

export function getEmployeeName(
  employees: { id: string; name: string }[],
  employeeId: string | null
): string {
  if (!employeeId) return "—";
  return employees.find((e) => e.id === employeeId)?.name ?? "Unknown";
}

export function formatPKR(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export type { PerformanceReview };
