import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export type DashboardMetrics = {
  totalEmployees: number;
  activeShifts: number;
  totalLocations: number;
  pendingRequests: number;
  weeklyHours: number;
  overtimeAlerts: number;
};

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      try {
        const data = await apiClient.get<DashboardMetrics>("/api/dashboard");
        return data;
      } catch (error) {
        console.error("Dashboard API error:", error);
        throw error;
      }
    },
    refetchInterval: 30_000,
    retry: 1,
    staleTime: 10_000, // Consider data fresh for 10 seconds
  });
}

