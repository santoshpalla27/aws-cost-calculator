'use client';

import React from 'react';
import { Card } from '@/components/common/Card';

interface ReportsListProps {
  reports: any[];
  onRefresh: () => void;
}

export function ReportsList({ reports, onRefresh }: ReportsListProps) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No reports found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <Card key={report.id} className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-gray-900">{report.name}</h3>
              <p className="text-sm text-gray-500">
                Created: {new Date(report.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">
                ${report.totalCost?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-gray-500">per month</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}