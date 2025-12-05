import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export type Notification = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: unknown;
};

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const data = await apiClient.get<{ notifications: Notification[] }>("/api/notifications");
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.patch<{ notification: Notification }>(`/api/notifications`, { id, read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

