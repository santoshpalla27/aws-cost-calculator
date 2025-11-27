'use client';

import React from 'react';
import Header from '../../components/layout/Header';
import { CostOverview } from '@/components/dashboard/CostOverview';
import { TopResources } from '@/components/dashboard/TopResources';
import { CostTrends } from '@/components/dashboard/CostTrends';

export default function DashboardPage() {
  return (
    <div>
      <Header />
      <main className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Infrastructure cost overview and analytics</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <CostOverview />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TopResources />
            <CostTrends />
          </div>
        </div>
      </main>
    </div>
  );
}