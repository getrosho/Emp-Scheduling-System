"use client";

import { PropsWithChildren, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";
import { cn } from "@/lib/utils";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";

export function DashboardShell({ children }: PropsWithChildren) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const locale = useLocale();
  const t = useTranslations("sidebar");

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <aside
        className={cn(
          "fixed inset-y-0 z-40 flex flex-col border-r border-slate-200 bg-slate-900 text-white transition-all duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className={cn("flex items-center justify-between py-4", collapsed ? "px-2 justify-center" : "px-4")}>
          <Link href={`/${locale}/dashboard`} className={cn("text-lg font-semibold tracking-tight", collapsed && "text-sm")}>
            {collapsed ? "SF" : "ShiftFlow"}
          </Link>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              ✕
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav
            collapsed={collapsed}
            onNavigate={() => {
              setSidebarOpen(false);
            }}
          />
        </div>
        <div className={cn("border-t border-slate-800", collapsed ? "p-2" : "p-4")}>
          <Button
            variant="ghost"
            className={cn("w-full text-slate-300", collapsed && "px-0 justify-center")}
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? t("expand") : t("collapse")}
          >
            {collapsed ? "E" : t("collapse")}
          </Button>
        </div>
      </aside>

      <div className={cn("flex flex-1 flex-col transition-all duration-300 min-w-0 overflow-x-hidden", collapsed ? "lg:ml-16" : "lg:ml-0")}>
        <Topbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          notificationsCount={3}
        />
        <main className="flex-1 px-5 py-6 min-w-0 overflow-x-hidden">{children}</main>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 text-slate-900 lg:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <HamburgerMenuIcon className="h-5 w-5" />
      </Button>
    </div>
  );
}
