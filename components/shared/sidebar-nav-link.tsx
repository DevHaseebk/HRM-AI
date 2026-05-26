"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigation } from "@/components/shared/navigation-provider";

interface SidebarNavLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function SidebarNavLink({ href, label, icon }: SidebarNavLinkProps) {
  const pathname = usePathname();
  const { pendingHref, startNavigation } = useNavigation();
  const isActive = pathname === href;
  const isPending = pendingHref === href;

  return (
    <Link
      href={href}
      prefetch
      scroll={false}
      onClick={() => startNavigation(href)}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-all duration-200",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        isActive &&
          "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border",
        isPending && "pointer-events-none opacity-70"
      )}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      ) : (
        icon
      )}
      <span className="truncate">{label}</span>
    </Link>
  );
}
