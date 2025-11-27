'use client';

import React from 'react';

export function CostTrends() {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Cost Trends (Last 30 Days)</h2>
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">Chart will be displayed here with cost trends over time</p>
      </div>
    </div>
  );
}