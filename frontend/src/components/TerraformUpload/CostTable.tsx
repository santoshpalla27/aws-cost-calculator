import React, { useState } from 'react';
import clsx from 'clsx';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
} from ' @heroicons/react/24/outline';
import type { ResourceCostEstimate } from '../../types';
import {
  formatCurrency,
  formatHourlyPrice,
  getResourceTypeIcon,
  getResourceTypeLabel,
} from '../../utils/formatters';

interface CostTableProps {
  resources: ResourceCostEstimate[];
}

type SortField = 'resource' | 'type' | 'price_per_month';
type SortOrder = 'asc' | 'desc';

export const CostTable: React.FC<CostTableProps> = ({ resources }) => {
  const [sortField, setSortField] = useState<SortField>('price_per_month');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedResources = [...resources].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'resource':
        comparison = a.resource.localeCompare(b.resource);
        break;
      case 'type':
        comparison = a.resource_type.localeCompare(b.resource_type);
        break;
      case 'price_per_month':
        comparison = a.price_per_month - b.price_per_month;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUpIcon className="w-3 h-3 ml-1 text-dark-400" />
    ) : (
      <ChevronDownIcon className="w-3 h-3 ml-1 text-dark-400" />
    );
  };

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full divide-y divide-dark-700">
        <thead className="bg-dark-800">
          <tr>
            <th
              scope="col"
              className="table-header cursor-pointer"
              onClick={() => handleSort('resource')}
            >
              <div className="flex items-center">
                Resource Name
                <SortIcon field="resource" />
              </div>
            </th>
            <th
              scope="col"
              className="table-header cursor-pointer"
              onClick={() => handleSort('type')}
            >
              <div className="flex items-center">
                Type
                <SortIcon field="type" />
              </div>
            </th>
            <th scope="col" className="table-header">
              Instance/Size
            </th>
            <th scope="col" className="table-header">
              Hourly
            </th>
            <th
              scope="col"
              className="table-header text-right cursor-pointer"
              onClick={() => handleSort('price_per_month')}
            >
              <div className="flex items-center justify-end">
                Monthly
                <SortIcon field="price_per_month" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-dark-900 divide-y divide-dark-800">
          {sortedResources.map((resource) => (
            <React.Fragment key={resource.resource}>
              <tr
                className="hover:bg-dark-800 transition-colors cursor-pointer"
                onClick={() =>
                  setExpandedRow(
                    expandedRow === resource.resource ? null : resource.resource
                  )
                }
              >
                <td className="table-cell font-medium text-dark-100">
                  <div className="flex items-center">
                    <span className="mr-2 text-lg">
                      {getResourceTypeIcon(resource.resource_type)}
                    </span>
                    <div>
                      <div className="flex items-center">
                        {resource.resource_name}
                        {resource.warnings.length > 0 && (
                          <ExclamationTriangleIcon
                            className="w-4 h-4 ml-2 text-accent-yellow"
                            title={resource.warnings.join(', ')}
                          />
                        )}
                      </div>
                      <span className="block text-xs text-dark-400 font-mono">
                        {resource.resource.split('.')[0]}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="table-cell">
                  {getResourceTypeLabel(resource.resource_type)}
                </td>
                <td className="table-cell">
                  {resource.instance_type || '-'}
                </td>
                <td className="table-cell font-mono">
                  {resource.price_per_hour
                    ? formatHourlyPrice(resource.price_per_hour)
                    : '-'}
                </td>
                <td
                  className={clsx(
                    'table-cell text-right font-bold',
                    resource.price_per_month > 0
                      ? 'text-accent-green'
                      : 'text-dark-400'
                  )}
                >
                  {formatCurrency(resource.price_per_month)}
                </td>
              </tr>
              {/* Expanded row with details */}
              {expandedRow === resource.resource && (
                <tr className="bg-dark-800">
                  <td colSpan={5} className="p-4 text-sm text-dark-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <span className="font-semibold text-dark-200">
                          Region:{' '}
                        </span>
                        <span>{resource.region || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-dark-200">
                          Yearly Cost:{' '}
                        </span>
                        <span>
                          {resource.price_per_year
                            ? formatCurrency(resource.price_per_year)
                            : '-'}
                        </span>
                      </div>
                      <div className="lg:col-span-1">
                        <span className="font-semibold text-dark-200">
                          Details:{' '}
                        </span>
                        <span className="font-mono text-xs">
                          {resource.pricing_details
                            ? JSON.stringify(resource.pricing_details, null, 2)
                            : '-'}
                        </span>
                      </div>
                      {resource.warnings.length > 0 && (
                        <div className="md:col-span-2 lg:col-span-3 flex items-start text-accent-yellow">
                          <ExclamationTriangleIcon className="w-5 h-5 mr-2 mt-1 flex-shrink-0" />
                          <div>
                            <span className="font-semibold">Warnings:</span>{' '}
                            {resource.warnings.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};