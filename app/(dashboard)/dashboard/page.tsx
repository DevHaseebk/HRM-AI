"use client";

import { useAuthUser } from "@/components/shared/auth-provider";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { TeamLeadDashboard } from "@/components/dashboard/team-lead-dashboard";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";

export default function DashboardPage() {
  const user = useAuthUser();

  if (user.role === "super_admin" || user.role === "company_admin" || user.role === "hr_manager") {
    return <AdminDashboard />;
  }

  if (user.role === "team_lead") {
    return <TeamLeadDashboard />;
  }

  return <EmployeeDashboard />;
}
