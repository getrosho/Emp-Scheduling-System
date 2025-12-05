import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export type Location = {
  id: string;
  label: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  notes?: string;
};

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const data = await apiClient.get<{ locations: Location[] }>("/api/locations");
      return data;
    },
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (location: Partial<Location> & { label: string }) => {
      return apiClient.post<{ location: Location }>("/api/locations", location);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: ["locations", id],
    queryFn: async () => {
      const data = await apiClient.get<{ location: Location }>(`/api/locations/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Location> }) => {
      return apiClient.patch<{ location: Location }>(`/api/locations/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["locations", variables.id] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete<{ deleted: boolean; message: string }>(`/api/locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

