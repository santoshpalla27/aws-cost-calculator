import React from 'react';
import { useRegions } from '../../hooks/usePricing';
import { Skeleton } from '../common/Loading';

interface RegionSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  value,
  onChange,
}) => {
  const { data, isLoading, error } = useRegions();

  if (isLoading) {
    return (
      <div>
        <label className="label">Region</label>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    // Fallback to a predefined list or show error
    return (
      <div>
        <label className="label">Region</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="select"
        >
          <option value="us-east-1">US East (N. Virginia)</option>
          <option value="us-west-2">US West (Oregon)</option>
          <option value="eu-west-1">EU (Ireland)</option>
        </select>
        <p className="text-sm text-accent-red mt-1">
          Failed to load regions: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div>
      <label className="label">Region</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select"
      >
        {data?.regions.map((region) => (
          <option key={region.code} value={region.code}>
            {region.name}
          </option>
        ))}
      </select>
    </div>
  );
};