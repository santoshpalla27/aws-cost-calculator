'use client';

import React from 'react';
import Header from '@/components/layout/Header';
import EKSCalculator from '@/components/calculators/EKSCalculator';

export default function EKSCalculatorPage() {
  return (
    <div>
      <Header />
      <main className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">EKS Cost Calculator</h1>
          <p className="text-gray-600 mb-8">Calculate Amazon EKS cluster costs</p>
          <EKSCalculator />
        </div>
      </main>
    </div>
  );
}