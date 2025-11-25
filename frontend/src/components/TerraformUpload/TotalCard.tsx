import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import {
  BanknotesIcon,
  CalendarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface TotalCardProps {
  monthlyTotal: number;
  yearlyTotal: number;
  resourceCount: number;
  scanDuration: number;
  currency?: string;
}

export const TotalCard: React.FC<TotalCardProps> = ({
  monthlyTotal,
  yearlyTotal,
  resourceCount,
  scanDuration,
  currency = 'USD',
}) => {
  return (
    <div className="card p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Monthly/Yearly Total */}
      <div className="flex flex-col items-start">
        <div className="flex items-center text-dark-300">
          <BanknotesIcon className="h-5 w-5 mr-2" />
          <span className="text-sm font-medium">Estimated Monthly Cost</span>
        </div>
        <p className="text-4xl font-bold text-accent-green mt-2">
          {formatCurrency(monthlyTotal, currency)}
        </p>
        <p className="text-dark-400 mt-1">
          {formatCurrency(yearlyTotal, currency)} per year
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 border-l border-dark-700 pl-6">
        <div className="flex flex-col items-start">
          <ClockIcon className="h-5 w-5 text-dark-400 mb-1" />
          <span className="text-sm text-dark-300">Scan Time</span>
          <span className="text-lg font-semibold text-dark-100">
            {scanDuration.toFixed(1)}s
          </span>
        </div>
        <div className="flex flex-col items-start">
          <BanknotesIcon className="h-5 w-5 text-dark-400 mb-1" />
          <span className="text-sm text-dark-300">Resources</span>
          <span className="text-lg font-semibold text-dark-100">
            {resourceCount}
          </span>
        </div>
        <div className="flex flex-col items-start">
          <CalendarIcon className="h-5 w-5 text-dark-400 mb-1" />
          <span className="text-sm text-dark-300">Avg/Resource</span>
          <span className="text-lg font-semibold text-dark-100">
            {resourceCount > 0
              ? formatCurrency(monthlyTotal / resourceCount, currency)
              : '$0.00'}
          </span>
        </div>
      </div>
    </div>
  );
};