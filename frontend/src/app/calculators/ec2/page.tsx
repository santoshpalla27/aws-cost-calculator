'use client';

import React from 'react';
import Header from '../../../components/layout/Header';
import EC2Calculator from '@/components/calculators/EC2Calculator';

export default function EC2CalculatorPage() {
  return (
    <div>
      <Header />
      <main className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">EC2 Cost Calculator</h1>
          <p className="text-gray-600 mb-8">Calculate Amazon EC2 instance costs</p>
          <EC2Calculator />
        </div>
      </main>
    </div>
  );
}