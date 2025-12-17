import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { format } from "date-fns";

export type EmployeeAvailabilityStatus = {
  employeeId: string;
  isAvailable: boolean | null; // true = available, false = unavailable, null = no info
  hasOverlappingConfirmedShift: boolean;
  availabilityRecord?: {
    id: string;
    date: string;
    isAvailable: boolean | null;
    startTime: string | null;
    endTime: string | null;
  };
};

export type EmployeesAvailabilityForDateResponse = {
  employees: EmployeeAvailabilityStatus[];
};

/**
 * Get availability status for all employees on a specific date
 */
export function useEmployeesAvailabilityForDate(date: string | Date) {
  const dateStr = typeof date === "string" ? date : format(date, "yyyy-MM-dd");
  
  return useQuery({
    queryKey: ["employeesAvailabilityForDate", dateStr],
    queryFn: async () => {
      const data = await apiClient.get<EmployeesAvailabilityForDateResponse>(
        `/api/employees/availability/date?date=${dateStr}`
      );
      return data;
    },
    enabled: !!dateStr,
  });
}

