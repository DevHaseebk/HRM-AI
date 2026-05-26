"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  Wallet,
  Briefcase,
  TrendingUp,
  Megaphone,
  Bot,
  Settings,
  Sparkles,
  LogOut,
  Lock,
  QrCode,
  CheckSquare,
  Mail,
  ChevronDown,
  BarChart3,
  FileText,
  AlertTriangle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarNavLink } from "@/components/shared/sidebar-nav-link";
import { useAuthUser } from "@/components/shared/auth-provider";
import { useToast } from "@/components/shared/toast-provider";
import { getNavItemsForRole, clearAuth, ROLE_LABELS } from "@/lib/auth";
import { cn } from "@/lib/utils";

const iconMap = {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  Wallet,
  Briefcase,
  TrendingUp,
  Megaphone,
  Bot,
  Settings,
  BarChart3,
};

export function AppSidebar() {
  const user = useAuthUser();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const navItems = getNavItemsForRole(user.role);
  const [attendanceOpen, setAttendanceOpen] = useState(true);
  const [sendingReminders, setSendingReminders] = useState(false);

  const isHr = user.role === "super_admin" || user.role === "hr_manager";
  const isTeamLeadOrAbove =
    user.role === "super_admin" || user.role === "hr_manager" || user.role === "team_lead";
  const isAttendanceActive = pathname?.startsWith("/attendance");
  const isAiActive = pathname?.startsWith("/ai-assistant");
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    if (isAiActive) setAiOpen(true);
  }, [isAiActive]);

  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
    if (user.employeeId) router.prefetch("/attendance/qr");
    if (isTeamLeadOrAbove) router.prefetch("/attendance/bulk");
  }, [navItems, router, user.employeeId, isTeamLeadOrAbove]);

  useEffect(() => {
    if (isAttendanceActive) setAttendanceOpen(true);
  }, [isAttendanceActive]);

  const handleLogout = () => {
    clearAuth();
    window.location.href = "/login";
  };

  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const res = await fetch("/api/attendance/reminder", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send reminders");
      toast.success(json.message ?? `Reminders sent to ${json.count} employees`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reminders");
    } finally {
      setSendingReminders(false);
    }
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link
          href="/dashboard"
          prefetch
          className="flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-md shadow-violet-500/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold tracking-tight">HRFlow</p>
            <p className="truncate text-[11px] text-muted-foreground">
              HR Management
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = iconMap[item.icon as keyof typeof iconMap];

                if (item.href === "/ai-assistant") {
                  return (
                    <SidebarMenuItem key={item.href}>
                      <button
                        type="button"
                        onClick={() => setAiOpen((v) => !v)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-all",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isAiActive &&
                            "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            aiOpen && "rotate-180"
                          )}
                        />
                      </button>

                      {aiOpen && (
                        <div className="ml-3 mt-1 space-y-0.5 border-l border-sidebar-border pl-2">
                          <SidebarNavLink
                            href="/ai-assistant"
                            label="Chat"
                            icon={<Bot className="h-3.5 w-3.5 shrink-0" />}
                          />
                          <SidebarNavLink
                            href="/ai-assistant/documents"
                            label="Documents"
                            icon={<FileText className="h-3.5 w-3.5 shrink-0" />}
                          />
                          {isTeamLeadOrAbove && (
                            <SidebarNavLink
                              href="/ai-assistant/anomalies"
                              label="Anomalies"
                              icon={<AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                            />
                          )}
                        </div>
                      )}
                    </SidebarMenuItem>
                  );
                }

                if (item.href === "/attendance") {
                  return (
                    <SidebarMenuItem key={item.href}>
                      <button
                        type="button"
                        onClick={() => setAttendanceOpen((v) => !v)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-all",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isAttendanceActive &&
                            "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            attendanceOpen && "rotate-180"
                          )}
                        />
                      </button>

                      {attendanceOpen && (
                        <div className="ml-3 mt-1 space-y-0.5 border-l border-sidebar-border pl-2">
                          <SidebarNavLink
                            href="/attendance"
                            label="Overview"
                            icon={<span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />}
                          />
                          {user.role === "employee" && user.employeeId && (
                            <SidebarNavLink
                              href="/attendance/qr"
                              label="My QR Code"
                              icon={<QrCode className="h-3.5 w-3.5 shrink-0" />}
                            />
                          )}
                          {isTeamLeadOrAbove && (
                            <SidebarNavLink
                              href="/attendance/bulk"
                              label="Bulk Mark"
                              icon={<CheckSquare className="h-3.5 w-3.5 shrink-0" />}
                            />
                          )}
                          {isHr && (
                            <button
                              type="button"
                              onClick={handleSendReminders}
                              disabled={sendingReminders}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-all",
                                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                "disabled:opacity-60"
                              )}
                            >
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">
                                {sendingReminders ? "Sending..." : "Send Reminders"}
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarNavLink
                      href={item.href}
                      label={item.label}
                      icon={<Icon className="h-4 w-4 shrink-0" />}
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarNavLink
              href="/settings/change-password"
              label="Change Password"
              icon={<Lock className="h-4 w-4 shrink-0" />}
            />
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="mt-2 flex items-center gap-2.5 rounded-lg bg-sidebar-accent/50 p-2">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
