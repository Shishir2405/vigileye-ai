"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, DollarSign, LayoutDashboard, Map, Settings, Upload, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/map", label: "Live Map", icon: Map },
  { href: "/alerts", label: "Alert Inbox", icon: AlertTriangle },
  { href: "/budget", label: "Budget Simulator", icon: DollarSign },
  { href: "/coverage", label: "Coverage", icon: Users },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/admin", label: "Admin", icon: Settings },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-5">
        <LayoutDashboard className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold tracking-tight">VigilEye AI</span>
      </div>
      <div className="px-4 pb-2">
        <span className="eyebrow">AI Structural Monitoring</span>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-pill px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
                active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border/30 bg-background md:flex md:flex-col">
      <SidebarNav />
    </aside>
  );
}
