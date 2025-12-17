import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export type WorkObject = {
  id: string;
  label: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  notes?: string;
};

export function useObjects() {
  return useQuery({
    queryKey: ["objects"],
    queryFn: async () => {
      const data = await apiClient.get<{ objects: WorkObject[] }>("/api/objects");
      return data;
    },
  });
}

export function useCreateObject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (object: Partial<WorkObject> & { label: string }) => {
      return apiClient.post<{ object: WorkObject }>("/api/objects", object);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objects"] });
    },
  });
}

export function useObject(id: string) {
  return useQuery({
    queryKey: ["objects", id],
    queryFn: async () => {
      const data = await apiClient.get<{ object: WorkObject }>(`/api/objects/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdateObject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WorkObject> }) => {
      return apiClient.patch<{ object: WorkObject }>(`/api/objects/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["objects"] });
      queryClient.invalidateQueries({ queryKey: ["objects", variables.id] });
    },
  });
}

export function useDeleteObject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete<{ deleted: boolean; message: string }>(`/api/objects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objects"] });
    },
  });
}

