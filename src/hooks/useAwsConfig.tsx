import { fetchAwsConfig } from "@/utils/awsConfig";
import { useQuery } from "@tanstack/react-query";
import type { AwsConfigResponse } from '@/types/api';

export const useAwsConfig = () => {
  return useQuery<AwsConfigResponse>({
    queryKey: ["aws-config"],
    queryFn: fetchAwsConfig,
    refetchInterval: 10000,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
};
