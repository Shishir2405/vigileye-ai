"use client";

import { useState } from "react";
import { Bell, Menu, UserCircle } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./Sidebar";

export function Topbar({ title }: { title: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/30 bg-background px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent>
            <SidebarNav onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <UserCircle className="h-6 w-6 text-muted-foreground" />
      </div>
    </header>
  );
}
