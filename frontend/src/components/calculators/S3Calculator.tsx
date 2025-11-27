'use client';

import React, { useState } from 'react';

const S3Calculator = () => {
  const [formData, setFormData] = useState({
    storageClass: 'STANDARD',
    storageSize: 100,
    monthlyRequests: 10000,
    monthlyDataTransfer: 10,
    region: 'us-east-1'
  });
  
  const [result, setResult] = useState<{monthlyCost: number} | null>(null);

  const storageClasses = [
    'STANDARD',
    'INTELLIGENT_TIERING',
    'STANDARD_IA',
    'ONEZONE_IA',
    'GLACIER',
    'GLACIER_IR',
    'DEEP_ARCHIVE'
  ];

  const handleCalculate = () => {
    const storagePrices: { [key: string]: number } = {
      'STANDARD': 0.023,
      'INTELLIGENT_TIERING': 0.023,
      'STANDARD_IA': 0.0125,
      'ONEZONE_IA': 0.01,
      'GLACIER': 0.004,
      'GLACIER_IR': 0.004,
      'DEEP_ARCHIVE': 0.00099
    };

    const storagePrice = storagePrices[formData.storageClass];
    const storageCost = formData.storageSize * storagePrice;
    
    // Request pricing (simplified: $0.005 per 1000 requests)
    const requestCost = (formData.monthlyRequests / 1000) * 0.005;
    
    // Data transfer (first 1GB free, then $0.09/GB)
    let dataTransferCost = 0;
    if (formData.monthlyDataTransfer > 1) {
      dataTransferCost = (formData.monthlyDataTransfer - 1) * 0.09;
    }
    
    const totalMonthlyCost = storageCost + requestCost + dataTransferCost;
    
    setResult({ monthlyCost: totalMonthlyCost });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: e.target.type === 'number' ? Number(value) : value
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">S3 Cost Estimator</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Storage Class</label>
          <select
            name="storageClass"
            value={formData.storageClass}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {storageClasses.map(sc => (
              <option key={sc} value={sc}>{sc}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Storage Size (GB)</label>
          <input
            type="number"
            name="storageSize"
            value={formData.storageSize}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Requests</label>
          <input
            type="number"
            name="monthlyRequests"
            value={formData.monthlyRequests}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Transfer Out (GB)</label>
          <input
            type="number"
            name="monthlyDataTransfer"
            value={formData.monthlyDataTransfer}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <button
        onClick={handleCalculate}
        className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Calculate Cost
      </button>
      
      {result && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Cost Estimate</h3>
          <div className="p-4 bg-white rounded shadow-sm">
            <p className="text-sm text-gray-600">Total Monthly Cost</p>
            <p className="text-2xl font-bold text-blue-600">${result.monthlyCost.toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default S3Calculator;