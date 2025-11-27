'use client';

import React, { useState } from 'react';

const EC2Calculator = () => {
  const [formData, setFormData] = useState({
    instanceType: 't3.micro',
    region: 'us-east-1',
    os: 'linux',
    purchaseOption: 'on-demand',
    quantity: 1,
    hoursPerMonth: 730
  });
  
  const [result, setResult] = useState<{monthlyCost: number, hourlyCost: number} | null>(null);

  const instanceTypes = [
    { id: 't3.micro', name: 'T3 Micro', vcpus: 2, memory: '1 GiB', cost: 0.0116 },
    { id: 't3.small', name: 'T3 Small', vcpus: 2, memory: '2 GiB', cost: 0.0232 },
    { id: 't3.medium', name: 'T3 Medium', vcpus: 2, memory: '4 GiB', cost: 0.0464 },
    { id: 't3.large', name: 'T3 Large', vcpus: 2, memory: '8 GiB', cost: 0.0928 },
    { id: 'm5.large', name: 'M5 Large', vcpus: 2, memory: '8 GiB', cost: 0.096 },
    { id: 'm5.xlarge', name: 'M5 XLarge', vcpus: 4, memory: '16 GiB', cost: 0.192 },
  ];

  const regions = [
    { id: 'us-east-1', name: 'US East (N. Virginia)' },
    { id: 'us-west-2', name: 'US West (Oregon)' },
    { id: 'eu-west-1', name: 'Europe (Ireland)' },
    { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)' },
  ];

  const handleCalculate = () => {
    // Find the selected instance type
    const selectedInstance = instanceTypes.find(i => i.id === formData.instanceType);
    
    if (!selectedInstance) return;
    
    // Calculate base cost
    let hourlyRate = selectedInstance.cost;
    
    // Adjust based on OS (simplified)
    if (formData.os === 'windows') {
      hourlyRate *= 1.3; // Windows typically costs more
    }
    
    // Adjust based on purchase option (simplified)
    if (formData.purchaseOption === 'reserved') {
      hourlyRate *= 0.6; // Reserved instances are typically 40% cheaper
    } else if (formData.purchaseOption === 'spot') {
      hourlyRate *= 0.5; // Spot instances are typically 50% cheaper
    }
    
    // Calculate total costs
    const totalHourlyCost = hourlyRate * formData.quantity;
    const totalMonthlyCost = totalHourlyCost * formData.hoursPerMonth;
    
    setResult({
      monthlyCost: totalMonthlyCost,
      hourlyCost: totalHourlyCost
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'hoursPerMonth' ? Number(value) : value
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">EC2 Cost Calculator</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instance Type
          </label>
          <select
            name="instanceType"
            value={formData.instanceType}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {instanceTypes.map(instance => (
              <option key={instance.id} value={instance.id}>
                {instance.name} ({instance.vcpus} vCPUs, {instance.memory})
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Region
          </label>
          <select
            name="region"
            value={formData.region}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {regions.map(region => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Operating System
          </label>
          <select
            name="os"
            value={formData.os}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="linux">Linux</option>
            <option value="windows">Windows</option>
            <option value="rhel">RHEL</option>
            <option value="suse">SUSE</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Purchase Option
          </label>
          <select
            name="purchaseOption"
            value={formData.purchaseOption}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="on-demand">On-Demand</option>
            <option value="reserved">Reserved Instance</option>
            <option value="spot">Spot Instance</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity
          </label>
          <input
            type="number"
            name="quantity"
            min="1"
            value={formData.quantity}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hours per Month
          </label>
          <input
            type="number"
            name="hoursPerMonth"
            min="1"
            max="744"
            value={formData.hoursPerMonth}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <button
        onClick={handleCalculate}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Calculate Cost
      </button>
      
      {result && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Cost Estimate</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Monthly Cost</p>
              <p className="text-xl font-bold text-blue-600">${result.monthlyCost.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Hourly Cost</p>
              <p className="text-xl font-bold text-blue-600">${result.hourlyCost.toFixed(4)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EC2Calculator;