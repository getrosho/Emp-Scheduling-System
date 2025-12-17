import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export type Shift = {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  date: string;
  durationMinutes: number;
  objectLabel?: string;
  objectId?: string;
  skillsRequired: string[];
  requiredWorkers?: number; // Amount of workers needed
  status: string;
  colorTag?: string;
  assignedEmployees: string[];
  shiftAssignments?: unknown[];
  object?: unknown;
};

export function useShifts(filters?: { status?: string; objectId?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: ["shifts", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append("status", filters.status);
      if (filters?.objectId) params.append("objectId", filters.objectId);
      if (filters?.from) params.append("from", filters.from);
      if (filters?.to) params.append("to", filters.to);
      const data = await apiClient.get<{ shifts: Shift[] }>(
        `/api/shifts${params.toString() ? `?${params.toString()}` : ""}`,
      );
      return data;
    },
  });
}

export type CreateShiftInput = {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  date: string;
  objectLabel?: string;
  objectId?: string;
  skillsRequired?: string[];
  requiredWorkers?: number; // Amount of workers needed
  assignedEmployeeIds?: string[];
  isRecurring?: boolean;
  recurringRule?: string;
  colorTag?: string;
};

export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (shift: CreateShiftInput) => {
      return apiClient.post<{ shift: Shift }>("/api/shifts", shift);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useShift(id: string) {
  return useQuery({
    queryKey: ["shifts", id],
    queryFn: async () => {
      const data = await apiClient.get<{ shift: Shift }>(`/api/shifts/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export type UpdateShiftInput = {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  date?: string;
  objectLabel?: string;
  objectId?: string;
  skillsRequired?: string[];
  assignedEmployeeIds?: string[];
  colorTag?: string;
  status?: string;
};

export function useUpdateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateShiftInput }) => {
      return apiClient.patch<{ shift: Shift }>(`/api/shifts/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["shifts", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete<{ deleted: boolean; message: string }>(`/api/shifts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

