"use client";

import { usePathname } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/app-header";
import { AuthProvider } from "@/components/shared/auth-provider";
import { NavigationProvider } from "@/components/shared/navigation-provider";
import { HrmDataProvider } from "@/components/shared/hrm-data-provider";
import { PageTransition } from "@/components/shared/page-transition";
import { PermissionRouteGuard, PermissionsProvider } from "@/components/shared/permissions-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isForcedChangePassword = pathname === "/change-password";

  return (
    <AuthProvider>
      {isForcedChangePassword ? (
        children
      ) : (
        <PermissionsProvider>
          <HrmDataProvider>
            <NavigationProvider>
              <TooltipProvider>
                <SidebarProvider>
                  <AppSidebar />
                  <SidebarInset className="flex min-h-svh min-w-0 flex-1 flex-col bg-background">
                    <AppHeader />
                    <PageTransition><PermissionRouteGuard>{children}</PermissionRouteGuard></PageTransition>
                  </SidebarInset>
                </SidebarProvider>
              </TooltipProvider>
            </NavigationProvider>
          </HrmDataProvider>
        </PermissionsProvider>
      )}
    </AuthProvider>
  );
}
