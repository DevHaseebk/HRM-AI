"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { useAuthUser } from "@/components/shared/auth-provider";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import {
  DEFAULT_PERMISSIONS,
  getModuleForPath,
  hasPermission,
  loadPermissions,
  setPermissionCache,
  type PermissionAction,
  type PermissionModule,
  type PermissionsResponse,
  type RolePermission,
} from "@/lib/permissions";
import type { Role } from "@/lib/types";

interface PermissionsContextValue {
  permissions: RolePermission[];
  userCounts: Partial<Record<Role, number>>;
  ready: boolean;
  warning: string | null;
  can: (module: PermissionModule, action: PermissionAction) => boolean;
  refresh: (force?: boolean) => Promise<PermissionsResponse>;
  replacePermissions: (permissions: RolePermission[]) => void;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthUser();
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);
  const [userCounts, setUserCounts] = useState<Partial<Record<Role, number>>>({});
  const [warning, setWarning] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const applyResponse = useCallback((response: PermissionsResponse) => {
    setPermissions(response.permissions);
    setUserCounts(response.userCounts ?? {});
    setWarning(response.warning ?? null);
    setReady(true);
    return response;
  }, []);

  const refresh = useCallback(
    async (force = false) => applyResponse(await loadPermissions(force)),
    [applyResponse]
  );

  useEffect(() => {
    refresh().catch(() => setReady(true));
  }, [refresh]);

  const replacePermissions = useCallback((next: RolePermission[]) => {
    setPermissionCache(next);
    setPermissions(next);
  }, []);

  const can = useCallback(
    (module: PermissionModule, action: PermissionAction) => {
      void permissions;
      return hasPermission(user.role, module, action);
    },
    [permissions, user.role]
  );

  const value = useMemo(
    () => ({ permissions, userCounts, ready, warning, can, refresh, replacePermissions }),
    [permissions, userCounts, ready, warning, can, refresh, replacePermissions]
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) throw new Error("usePermissions must be used within PermissionsProvider");
  return context;
}

export function PermissionRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthUser();
  const { can } = usePermissions();
  const permissionModule = getModuleForPath(pathname);
  const rolesPageAllowed =
    pathname !== "/settings/roles" ||
    user.role === "super_admin" ||
    user.role === "company_admin";

  if ((permissionModule && !can(permissionModule, "view")) || !rolesPageAllowed) {
    return (
      <PageWrapper>
        <Card>
          <CardContent className="py-14 text-center">
            <LockKeyhole className="mx-auto h-9 w-9 text-muted-foreground" />
            <p className="mt-3 font-semibold">Access Restricted</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your role does not have permission to view this module.
            </p>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return <>{children}</>;
}
