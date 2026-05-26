export const PAGE_TITLES: Record<string, { title: string; description?: string }> = {
  "/dashboard": {
    title: "Dashboard",
    description: "Overview of your HR operations",
  },
  "/employees": {
    title: "Employees",
    description: "Manage and view all employee records",
  },
  "/attendance": {
    title: "Attendance",
    description: "Track employee check-in and check-out records",
  },
  "/leaves": {
    title: "Leave Management",
    description: "Review and manage leave requests",
  },
  "/payroll": {
    title: "Payroll",
    description: "Manage employee salaries and payment records",
  },
  "/recruitment": {
    title: "Recruitment",
    description: "Manage job postings and applicant pipeline",
  },
  "/performance": {
    title: "Performance",
    description: "Employee performance reviews and goal tracking",
  },
  "/announcements": {
    title: "Announcements",
    description: "Company-wide and department announcements",
  },
  "/ai-assistant": {
    title: "AI Assistant",
    description: "Get instant answers about HR data and policies",
  },
  "/ai-assistant/documents": {
    title: "AI Documents",
    description: "Generate HR letters and policy documents",
  },
  "/ai-assistant/anomalies": {
    title: "Attendance Anomalies",
    description: "AI-driven analysis of attendance patterns",
  },
  "/reports": {
    title: "Reports & Insights",
    description: "Monthly HR reports and employee churn risk",
  },
  "/settings": {
    title: "Settings",
    description: "Manage your account and preferences",
  },
};

export function getPageTitle(pathname: string) {
  return PAGE_TITLES[pathname] ?? { title: "HRFlow" };
}
