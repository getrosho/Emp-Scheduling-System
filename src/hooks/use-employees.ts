import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { EmployeeRole, EmployeeStatus } from "@/generated/prisma/enums";
import type { Employee, EmployeeListResponse, EmployeeResponse, Pagination } from "@/types/employees";

export type CreateEmployeeInput = {
  fullName: string;
  email: string;
  phone?: string;
  role?: EmployeeRole;
  status?: EmployeeStatus;
  subcontractor?: boolean;
  preferredLocationIds?: string[];
  weeklyLimitHours?: number;
  availability?: Array<{
    day: string;
    start: string | null;
    end: string | null;
  }>;
  notes?: string;
};

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;

export type EmployeeFilters = {
  role?: EmployeeRole | "ALL" | "";
  status?: EmployeeStatus;
  locationId?: string;
  subcontractor?: boolean;
  q?: string;
  page?: number;
  limit?: number;
};

export function useEmployees(filters?: EmployeeFilters) {
  return useQuery({
    queryKey: ["employees", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Only send role if it's a valid single role (not "ALL" or empty)
      if (filters?.role) {
        const roleValue = filters.role;
        // Check if role is a valid EmployeeRole (not "ALL" or empty string)
        // Check for empty string first (before type narrowing removes it)
        if (roleValue !== "" && roleValue !== "ALL") {
          // Now TypeScript knows roleValue is EmployeeRole
          params.append("role", roleValue);
        }
      }
      
      if (filters?.status) {
        params.append("status", filters.status);
      }
      
      if (filters?.locationId && filters.locationId !== "") {
        params.append("locationId", filters.locationId);
      }
      
      if (filters?.subcontractor !== undefined) {
        params.append("subcontractor", filters.subcontractor.toString());
      }
      
      if (filters?.q && filters.q !== "") {
        params.append("q", filters.q);
      }
      
      if (filters?.page) {
        params.append("page", filters.page.toString());
      }
      
      if (filters?.limit) {
        params.append("limit", filters.limit.toString());
      }
      
      const response = await apiClient.get<{
        employees: Employee[];
        pagination: Pagination;
      }>(
        `/api/employees${params.toString() ? `?${params.toString()}` : ""}`,
      );
      return response;
    },
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ["employees", id],
    queryFn: async () => {
      const response = await apiClient.get<{ employee: Employee }>(`/api/employees/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (employee: CreateEmployeeInput) => {
      return apiClient.post<EmployeeResponse>("/api/employees", employee);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEmployeeInput }) => {
      return apiClient.put<EmployeeResponse>(`/api/employees/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees", variables.id] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete<{ deleted: boolean; message: string }>(`/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateEmployeeAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, availability }: { id: string; availability: Array<{ day: string; startTime: string; endTime: string; timezone?: string }> }) => {
      return apiClient.post<{ availability: any[] }>(`/api/employees/${id}/availability`, {
        employeeId: id,
        availability,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employees", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

