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

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
  { label: "Employees", href: "/employees", icon: PersonIcon },
  { label: "Locations", href: "/locations", icon: TargetIcon },
  { label: "Shifts", href: "/shifts", icon: CalendarIcon },
  { label: "Recurring", href: "/recurring", icon: MixIcon },
  { label: "Planner", href: "/planner", icon: LayersIcon },
  { label: "Subcontractors", href: "/subcontractors", icon: RocketIcon },
  { label: "Notifications", href: "/notifications", icon: BellIcon },
];

type SidebarNavProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("mt-6 space-y-1", collapsed ? "px-1" : "px-2")}>
      {NAV_ITEMS.map((item) => {
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
