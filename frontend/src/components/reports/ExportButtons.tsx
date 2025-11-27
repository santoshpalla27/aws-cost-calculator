'use client';

import React from 'react';
import { Button } from '@/components/common/Button';
import api from '@/lib/api';

interface ExportButtonsProps {
  reportId: string;
}

export function ExportButtons({ reportId }: ExportButtonsProps) {
  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      const response = await api.get(`/reports/export/${reportId}?format=${format}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${reportId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(`Failed to export ${format}:`, error);
    }
  };

  return (
    <div className="flex space-x-2">
      <Button onClick={() => handleExport('pdf')}>
        Export PDF
      </Button>
      <Button variant="outline" onClick={() => handleExport('csv')}>
        Export CSV
      </Button>
    </div>
  );
}