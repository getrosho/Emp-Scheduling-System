import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Role } from "@/generated/prisma/enums";

export type PendingShift = {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  date: string;
  object?: {
    id: string;
    label: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    notes?: string;
  };
  objectLabel?: string;
  coWorkers?: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
  }>;
  assignment: {
    id: string;
    status: string;
    createdAt: string;
  };
};

export type PendingShiftsResponse = {
  shifts: PendingShift[];
};

/**
 * Get pending shifts for the current employee/manager
 * Enabled if user is an employee or manager (managers are treated as workers)
 */
export function usePendingShifts(userRole?: Role) {
  const isWorker = userRole === Role.EMPLOYEE || userRole === Role.MANAGER;
  
  return useQuery({
    queryKey: ["pending-shifts"],
    queryFn: async () => {
      const data = await apiClient.get<PendingShiftsResponse>("/api/shifts/pending");
      return data;
    },
    enabled: isWorker, // Fetch if user is an employee or manager
    retry: false, // Don't retry on 403 errors
  });
}

