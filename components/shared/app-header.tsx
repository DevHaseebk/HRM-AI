"use client";

import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthUser } from "@/components/shared/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { ROLE_LABELS } from "@/lib/auth";
import { getPageTitle } from "@/lib/page-titles";

export function AppHeader() {
  const pathname = usePathname();
  const user = useAuthUser();
  const { title } = getPageTitle(pathname);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:gap-4">
      <SidebarTrigger className="shrink-0" />

      <div className="flex min-w-0 flex-1 items-center">
        <h1 className="truncate text-lg font-semibold leading-none">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />

        <Button
          variant="ghost"
          size="icon"
          className="relative shrink-0 transition-transform hover:scale-110"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
        </Button>

        <div className="hidden items-center gap-2 sm:flex">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <Badge variant="secondary" className="hidden md:inline-flex">
            {ROLE_LABELS[user.role]}
          </Badge>
        </div>

        <Avatar className="h-8 w-8 sm:hidden">
          <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
