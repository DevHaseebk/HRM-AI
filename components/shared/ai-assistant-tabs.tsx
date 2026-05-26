"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, FileText, AlertTriangle, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/ai-assistant", label: "Chat", icon: MessageSquare },
  { href: "/ai-assistant/documents", label: "Documents", icon: FileText },
  { href: "/ai-assistant/anomalies", label: "Anomalies", icon: AlertTriangle },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function AiAssistantTabs() {
  const pathname = usePathname();

  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1 shadow-sm">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          tab.href === "/ai-assistant"
            ? pathname === "/ai-assistant"
            : pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
