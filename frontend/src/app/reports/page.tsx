'use client';

import React from 'react';
import AppHeader from '../../components/layout/AppHeader';

export default function ReportsPage() {
  return (
    <div>
      <AppHeader />
      <main className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cost Reports</h1>
          <p className="text-gray-600 mb-8">View and analyze your cost reports</p>

          <div className="bg-white shadow rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">No reports available yet</h2>
            <p className="text-gray-600 mb-6">
              Start by running a cost estimation to generate reports.
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Run Cost Estimation
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}