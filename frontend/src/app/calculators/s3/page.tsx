'use client';

import React from 'react';
import AppHeader from '../../../components/layout/AppHeader';
import S3Calculator from '@/components/calculators/S3Calculator';

export default function S3CalculatorPage() {
  return (
    <div>
      <AppHeader />
      <main className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">S3 Cost Calculator</h1>
          <p className="text-gray-600 mb-8">Calculate Amazon S3 storage costs</p>
          <S3Calculator />
        </div>
      </main>
    </div>
  );
}