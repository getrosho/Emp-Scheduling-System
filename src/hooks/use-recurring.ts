import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export type RecurringTemplate = {
  id: string;
  name: string;
  description?: string;
  rule: string;
  interval: number;
  byWeekday: string[];
  startDate: string;
  endDate?: string;
  shiftDuration: number;
  baseStartTime: string;
  baseEndTime: string;
  timezone: string;
};

export function useRecurringTemplates() {
  return useQuery({
    queryKey: ["recurring"],
    queryFn: async () => {
      const data = await apiClient.get<{ templates: RecurringTemplate[] }>("/api/recurring");
      return data;
    },
  });
}

export function useCreateRecurringTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (template: Partial<RecurringTemplate> & { name: string; rule: string; startDate: string }) => {
      return apiClient.post<{ template: RecurringTemplate }>("/api/recurring", template);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
    },
  });
}

export function useExpandRecurringTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { templateId: string; rangeStart: string; rangeEnd: string }) => {
      return apiClient.patch<{ shifts: unknown[] }>("/api/recurring", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

