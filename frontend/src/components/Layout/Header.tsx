import React from 'react';
import {
  CurrencyDollarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

export const Header: React.FC = () => {
  return (
    <header className="bg-dark-900 border-b border-dark-700 py-4 px-6 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        {/* Logo */}
        <div className="flex-shrink-0">
          <CurrencyDollarIcon className="h-8 w-8 text-accent-green" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold text-dark-100">
            AWS Cost Estimator
          </h1>
          <p className="text-sm text-dark-400">
            Terraform Infrastructure Pricing
          </p>
        </div>
      </div>

      {/* Actions */}
      <div>
        <button
          className="p-2 rounded-full text-dark-400 hover:bg-dark-800 hover:text-dark-100 transition-colors"
          title="Settings"
        >
          <Cog6ToothIcon className="h-6 w-6" />
        </button>
      </div>
    </header>
  );
};