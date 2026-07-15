import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchLoadBalancers,
  fetchLoadBalancerByName,
  deleteLoadBalancer,
  createLoadBalancer,
} from "@/services/loadBalancerApi";
import type { LoadBalancer } from "@/services/loadBalancerApi";

const QUERY_KEYS = {
  loadBalancers: ["loadBalancers"] as const,
};

export function useLoadBalancers() {
  return useQuery<LoadBalancer[]>({
    queryKey: QUERY_KEYS.loadBalancers,
    queryFn: fetchLoadBalancers,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useLoadBalancerByName(name?: string) {
  return useQuery<LoadBalancer | null>({
    queryKey: ["loadBalancerByName", name],
    queryFn: () => fetchLoadBalancerByName(name ?? ""),
    enabled: Boolean(name?.trim()),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useDeleteLoadBalancer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteLoadBalancer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.loadBalancers });
    },
  });
}

export function useCreateLoadBalancer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLoadBalancer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.loadBalancers });
    },
  });
}
