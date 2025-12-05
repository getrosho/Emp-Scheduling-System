"use client";

import { cn } from "@/lib/utils";

type AvatarProps = {
  name?: string;
  className?: string;
};

export function Avatar({ name = "User", className }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold uppercase text-white",
        className,
      )}
    >
      {initials}
    </div>
  );
}

