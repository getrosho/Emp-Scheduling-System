import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export type AssignShiftInput = {
  userId: string;
};

export type ConfirmShiftInput = {
  note?: string;
};

export type DeclineShiftInput = {
  reason: string;
};

/**
 * Assign a shift to an employee (Manager/Admin only)
 */
export function useAssignShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ shiftId, userId }: { shiftId: string; userId: string }) => {
      return apiClient.patch<{ assignment: any }>(
        `/api/shifts/${shiftId}/assign`,
        { userId }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shifts", variables.shiftId] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["month-status"] });
    },
  });
}

/**
 * Confirm a shift assignment (Employee only)
 */
export function useConfirmShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ shiftId, note }: { shiftId: string; note?: string }) => {
      return apiClient.patch<{ assignment: any }>(
        `/api/shifts/${shiftId}/confirm`,
        { note }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shifts", variables.shiftId] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["pending-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["month-status"] });
    },
  });
}

/**
 * Decline a shift assignment (Employee only)
 */
export function useDeclineShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ shiftId, reason }: { shiftId: string; reason: string }) => {
      return apiClient.patch<{ success: boolean; message: string }>(
        `/api/shifts/${shiftId}/decline`,
        { reason }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shifts", variables.shiftId] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["pending-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["month-status"] });
    },
  });
}

