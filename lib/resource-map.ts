import type { DataFile } from "./types";

export const RESOURCE_MAP: Record<string, DataFile> = {
  employees: "employees.json",
  attendance: "attendance.json",
  leaves: "leaves.json",
  payroll: "payroll.json",
  jobs: "jobs.json",
  applicants: "applicants.json",
  announcements: "announcements.json",
  performance: "performance.json",
  settings: "settings.json",
};

export function getDataFile(resource: string): DataFile | null {
  return RESOURCE_MAP[resource] ?? null;
}

export function generateId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
