'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';

export function CostOverview() {
  const [stats, setStats] = useState({
    totalMonthlyCost: 0,
    totalReports: 0,
    avgCostPerReport: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/reports', { params: { limit: 100 } });
      const reports = response.data.reports || [];
      
      const totalCost = reports.reduce((sum: number, r: any) => sum + (r.totalCost || 0), 0);
      const avgCost = reports.length > 0 ? totalCost / reports.length : 0;
      
      setStats({
        totalMonthlyCost: totalCost,
        totalReports: reports.length,
        avgCostPerReport: avgCost,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Monthly Cost</h3>
        <p className="text-3xl font-bold text-blue-600">${stats.totalMonthlyCost.toFixed(2)}</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Reports</h3>
        <p className="text-3xl font-bold text-green-600">{stats.totalReports}</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Cost/Report</h3>
        <p className="text-3xl font-bold text-purple-600">${stats.avgCostPerReport.toFixed(2)}</p>
      </div>
    </>
  );
}