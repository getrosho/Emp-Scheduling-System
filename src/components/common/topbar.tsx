"use client";

import Link from "next/link";
import { format } from "date-fns";
import { BellIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type TopbarProps = {
  onToggleSidebar?: () => void;
  notificationsCount?: number;
};

export function Topbar({ onToggleSidebar, notificationsCount = 0 }: TopbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const today = format(new Date(), "EEEE, MMM d");

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onToggleSidebar}>
          ☰
        </Button>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Today</p>
          <p className="text-lg font-semibold text-slate-900">{today}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/notifications" className="relative">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <BellIcon className="h-5 w-5" />
          </Button>
          {notificationsCount > 0 && (
            <span className="absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-semibold text-white">
              {notificationsCount}
            </span>
          )}
        </Link>

        <div className="relative">
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-2"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Avatar name={user?.name || "User"} />
            <div className="hidden text-left text-sm leading-tight sm:block">
              <p className="font-semibold text-slate-900">{user?.name || "User"}</p>
              <p className="text-xs text-slate-500">{user?.role || "Guest"}</p>
            </div>
            <ChevronDownIcon className="h-4 w-4 text-slate-500" />
          </Button>
          <div
            className={cn(
              "absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg",
              menuOpen ? "visible opacity-100" : "invisible opacity-0",
            )}
          >
            <Link
              href="/settings"
              className="block rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Settings
            </Link>
            <Link
              href="/profile"
              className="block rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Profile
            </Link>
            <form action="/api/auth/logout" method="post">
              <Button type="submit" variant="ghost" className="w-full justify-start text-slate-600">
                Logout
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
