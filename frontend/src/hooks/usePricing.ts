import { useQuery, useMutation } from ' @tanstack/react-query';
import { pricingApi } from '../api/client';
import type {
  RegionsResponse,
  InstanceTypesResponse,
  EC2PricingResponse,
} from '../types';

export function useRegions() {
  return useQuery<RegionsResponse>({
    queryKey: ['regions'],
    queryFn: pricingApi.getRegions,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

export function useInstanceTypes(region: string = 'us-east-1') {
  return useQuery<InstanceTypesResponse>({
    queryKey: ['instanceTypes', region],
    queryFn: () => pricingApi.getInstanceTypes(region),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    enabled: !!region,
  });
}

export function useEC2Price(
  instanceType: string,
  region: string,
  operatingSystem: string = 'Linux',
  enabled: boolean = true
) {
  return useQuery<EC2PricingResponse>({
    queryKey: ['ec2Price', instanceType, region, operatingSystem],
    queryFn: () => pricingApi.getEC2Price(instanceType, region, operatingSystem),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: enabled && !!instanceType && !!region,
  });
}

export function usePriceEstimate() {
  return useMutation({
    mutationFn: ({
      service,
      region,
      parameters,
    }: {
      service: string;
      region: string;
      parameters: Record<string, any>;
    }) => pricingApi.estimate(service, region, parameters),
  });
}