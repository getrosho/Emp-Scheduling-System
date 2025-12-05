"use client";

import {
  BarChartIcon,
  BellIcon,
  CalendarIcon,
  ClockIcon,
  LayersIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import { useDashboardMetrics } from "@/hooks/use-dashboard";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Button } from "@/components/ui/button";

const metricConfig = [
  {
    key: "totalEmployees",
    title: "Total Employees",
    icon: <PersonIcon className="h-5 w-5" />,
    format: (value: number) => value.toString(),
  },
  {
    key: "activeShifts",
    title: "Active Shifts Today",
    icon: <CalendarIcon className="h-5 w-5" />,
    format: (value: number) => value.toString(),
  },
  {
    key: "totalLocations",
    title: "Total Locations",
    icon: <LayersIcon className="h-5 w-5" />,
    format: (value: number) => value.toString(),
  },
  {
    key: "pendingRequests",
    title: "Pending Approvals",
    icon: <BellIcon className="h-5 w-5" />,
    format: (value: number) => value.toString(),
  },
  {
    key: "weeklyHours",
    title: "Weekly Scheduled Hours",
    icon: <ClockIcon className="h-5 w-5" />,
    format: (value: number) => `${value}h`,
  },
  {
    key: "overtimeAlerts",
    title: "Overtime Alerts",
    icon: <BarChartIcon className="h-5 w-5" />,
    format: (value: number) => value.toString(),
  },
] as const;

export default function DashboardPage() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useDashboardMetrics();

  const errorMessage =
    error && typeof error === "object" && "message" in error
      ? (error as any).message
      : "Failed to load dashboard data";

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Overview</p>
          <h1 className="text-3xl font-semibold text-slate-900">Operations Pulse</h1>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {metricConfig.map((metric, idx) => (
          <MetricCard
            key={metric.key}
            title={metric.title}
            value={
              data
                ? metric.format(
                    (data as Record<string, number>)[metric.key] ?? 0,
                  )
                : null
            }
            icon={metric.icon}
            isLoading={isLoading}
            isError={isError}
            errorMessage={errorMessage}
            delay={idx * 0.05}
          />
        ))}
      </div>
    </section>
  );
}

