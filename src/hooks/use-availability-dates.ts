import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export type DateAvailability = {
  id: string;
  date: string; // YYYY-MM-DD
  isAvailable: boolean;
};

export type AvailabilityResponse = {
  availability: Array<{
    id: string;
    date: string | null;
    isAvailable: boolean | null;
    day?: string;
    startTime?: string | null;
    endTime?: string | null;
  }>;
};

/**
 * Get employee availability for a specific month
 */
export function useEmployeeAvailabilityDates(
  employeeId: string,
  month?: string // YYYY-MM format
) {
  return useQuery({
    queryKey: ["employee-availability-dates", employeeId, month],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (month) params.append("month", month);
      params.append("type", "dates");
      
      const data = await apiClient.get<AvailabilityResponse>(
        `/api/employees/${employeeId}/availability?${params.toString()}`
      );
      return data;
    },
    enabled: !!employeeId,
  });
}

/**
 * Update employee date-based availability
 */
export function useUpdateEmployeeAvailabilityDates() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      employeeId,
      availabilities,
    }: {
      employeeId: string;
      availabilities: Array<{ date: string; isAvailable: boolean }>;
    }) => {
      return apiClient.post<AvailabilityResponse>(
        `/api/employees/${employeeId}/availability`,
        { availabilities }
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate all availability queries for this employee
      queryClient.invalidateQueries({
        queryKey: ["employee-availability-dates", variables.employeeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["employee", variables.employeeId],
      });
    },
  });
}

/**
 * Update a single availability record
 */
export function useUpdateAvailabilityRecord() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      employeeId,
      availabilityId,
      date,
      isAvailable,
    }: {
      employeeId: string;
      availabilityId: string;
      date: string;
      isAvailable: boolean;
    }) => {
      return apiClient.patch<{ availability: DateAvailability }>(
        `/api/employees/${employeeId}/availability/${availabilityId}`,
        { date, isAvailable }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["employee-availability-dates", variables.employeeId],
      });
    },
  });
}

