import React from 'react';
import { formatCurrency, formatHourlyPrice } from '../../utils/formatters';
import { Loading } from '../common/Loading';
import type { EC2PricingResponse } from '../../types';

interface PriceCardProps {
  data: EC2PricingResponse | null;
  isLoading: boolean;
  error: Error | null;
}

export const PriceCard: React.FC<PriceCardProps> = ({
  data,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <div className="card p-6 flex items-center justify-center">
        <Loading text="Fetching pricing..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-accent-red text-center">
        <p className="font-semibold mb-2">Error fetching pricing:</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card p-6 text-dark-300 text-center">
        <p className="font-semibold">Select an instance type to see pricing</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      {/* Monthly Total */}
      <div className="border-b border-dark-700 pb-4 mb-4">
        <p className="text-sm text-dark-300">Estimated Monthly Cost</p>
        <p className="text-4xl font-bold text-accent-green mt-1">
          {formatCurrency(data.price_per_month)}
        </p>
        <p className="text-sm text-dark-400">Based on 730 hours/month</p>
      </div>

      {/* Hourly & Yearly */}
      <div className="grid grid-cols-2 gap-4 border-b border-dark-700 pb-4 mb-4">
        <div>
          <p className="text-sm text-dark-300">Hourly</p>
          <p className="text-xl font-semibold text-dark-100">
            {formatHourlyPrice(data.price_per_hour)}
          </p>
        </div>
        <div>
          <p className="text-sm text-dark-300">Yearly</p>
          <p className="text-xl font-semibold text-dark-100">
            {formatCurrency(data.price_per_month * 12)}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-y-2 text-sm">
        <p className="text-dark-300">Instance Type</p>
        <p className="font-medium text-dark-100">{data.instance_type}</p>

        <p className="text-dark-300">Region</p>
        <p className="font-medium text-dark-100">{data.region}</p>

        <p className="text-dark-300">OS</p>
        <p className="font-medium text-dark-100">{data.operating_system}</p>

        <p className="text-dark-300">Pricing Type</p>
        <p className="font-medium text-dark-100">
          {data.on_demand ? 'On-Demand' : 'Reserved'}
        </p>
      </div>
    </div>
  );
};