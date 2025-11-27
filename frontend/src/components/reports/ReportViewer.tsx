'use client';

import React from 'react';
import { Modal } from '@/components/common/Modal';
import { Table } from '@/components/common/Table';

interface ReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  report: any;
}

export function ReportViewer({ isOpen, onClose, report }: ReportViewerProps) {
  if (!report) return null;

  const columns = [
    { key: 'name', label: 'Resource' },
    { key: 'type', label: 'Type' },
    {
      key: 'monthlyCost',
      label: 'Monthly Cost',
      render: (value: number) => `$${value?.toFixed(2) || '0.00'}`,
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report Details" size="lg">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Total Monthly Cost</h3>
            <p className="text-2xl font-bold text-gray-900">
              ${report.totalCost?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Created</h3>
            <p className="text-2xl font-bold text-gray-900">
              {new Date(report.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {report.data?.resources && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Resources</h3>
            <Table columns={columns} data={report.data.resources} />
          </div>
        )}
      </div>
    </Modal>
  );
}