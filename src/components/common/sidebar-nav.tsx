"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  DashboardIcon,
  PersonIcon,
  BellIcon,
  LayersIcon,
  MixIcon,
  RocketIcon,
  TargetIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";

type SidebarNavProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  type?: "separator";
};

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const locale = useLocale();

  const NAV_ITEMS: (NavItem | { type: "separator" })[] = [
    { label: t("monthOverview"), href: `/${locale}/dashboard`, icon: DashboardIcon },
    { label: t("employees"), href: `/${locale}/employees`, icon: PersonIcon },
    { label: t("subcontractors"), href: `/${locale}/subcontractors`, icon: RocketIcon },
    { type: "separator" },
    { label: t("managerView"), href: `/${locale}/manager/view`, icon: PersonIcon },
    { label: t("objects"), href: `/${locale}/objects`, icon: TargetIcon },
  ];

  return (
    <nav className={cn("mt-6 space-y-1", collapsed ? "px-1" : "px-2")}>
      {NAV_ITEMS.map((item, index) => {
        if (item.type === "separator") {
          return (
            <div
              key={`separator-${index}`}
              className={cn("my-2 border-t border-slate-700", collapsed ? "mx-1" : "mx-3")}
            />
          );
        }
        
        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
        const Icon = item.icon;
        
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
              collapsed ? "justify-center px-2" : "gap-3 px-3",
              isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800",
            )}
            aria-current={isActive ? "page" : undefined}
            title={collapsed ? item.label : undefined}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
