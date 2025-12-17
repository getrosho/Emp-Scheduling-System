import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { Employee } from "@/types/employees";

type MyEmployeeResponse = {
  employee: Employee;
};

/**
 * Get the current user's employee record
 * Returns null if employee record doesn't exist (e.g., for managers who haven't been added as employees yet)
 */
export function useMyEmployee() {
  return useQuery({
    queryKey: ["my-employee"],
    queryFn: async () => {
      try {
        const data = await apiClient.get<MyEmployeeResponse>("/api/employees/me");
        return data;
      } catch (error: any) {
        // If 404, employee record doesn't exist - this is OK for managers
        // Check both status code and error message
        const is404 = error?.status === 404 || 
                     error?.response?.status === 404 ||
                     error?.message?.includes("404") ||
                     error?.message?.includes("not found");
        
        if (is404) {
          console.warn("[useMyEmployee] Employee record not found - this is OK for managers who haven't been added as employees yet");
          // Return a valid response structure with null employee
          return { employee: null } as any;
        }
        
        // For other errors, log and rethrow
        console.error("[useMyEmployee] Error fetching employee:", error);
        throw error;
      }
    },
    retry: false, // Don't retry on 404 errors
    // Don't treat 404 as an error - it's expected for managers
    throwOnError: false,
  });
}

