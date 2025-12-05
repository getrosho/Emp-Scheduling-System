import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export type Assignment = {
  id: string;
  shiftId: string;
  userId: string;
  status: string;
  shift?: unknown;
  user?: unknown;
};

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { type: "EMPLOYEE" | "SUBCONTRACTOR"; shiftId: string; userId?: string; subcontractorId?: string; slotsRequested?: number }) => {
      return apiClient.post<{ assignment: Assignment }>("/api/assignments", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

