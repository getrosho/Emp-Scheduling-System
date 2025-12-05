"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  title: string;
  value: string | number | null;
  icon: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  delay?: number;
};

export function MetricCard({
  title,
  value,
  icon,
  isLoading,
  isError,
  errorMessage,
  delay = 0,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700")}>
          {icon}
        </div>
      </div>
      <div className="mt-4 min-h-[40px] text-3xl font-semibold text-slate-900">
        {isLoading && <div className="h-8 w-24 animate-pulse rounded-md bg-slate-100" />}
        {!isLoading && isError && (
          <p className="text-sm font-medium text-rose-500">{errorMessage ?? "Error"}</p>
        )}
        {!isLoading && !isError && (value ?? "—")}
      </div>
    </motion.div>
  );
}

