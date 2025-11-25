import { useMutation } from '@tanstack/react-query';
import { terraformApi } from '../api/client';
import type { TerraformScanResponse } from '../types';

export function useTerraformScan() {
  return useMutation<
    TerraformScanResponse,
    Error,
    { file: File; skipInit?: boolean; targetRegion?: string }
  >({
    mutationFn: ({ file, skipInit, targetRegion }) =>
      terraformApi.scan(file, skipInit, targetRegion),
  });
}

export function useTerraformValidate() {
  return useMutation({
    mutationFn: (file: File) => terraformApi.validate(file),
  });
}