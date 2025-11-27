'use client';

import React, { useState } from 'react';

const RDSCalculator = () => {
  const [formData, setFormData] = useState({
    engine: 'postgres',
    instanceClass: 'db.t3.micro',
    region: 'us-east-1',
    storageType: 'gp2',
    storageSize: 20,
    multiAZ: false,
    backupStorage: 0
  });
  
  const [result, setResult] = useState<{monthlyCost: number, hourlyCost: number} | null>(null);

  const engines = ['postgres', 'mysql', 'mariadb', 'oracle-se2', 'sqlserver-ex', 'aurora-mysql'];
  const instanceClasses = [
    'db.t3.micro', 'db.t3.small', 'db.t3.medium', 'db.t3.large',
    'db.m5.large', 'db.m5.xlarge', 'db.r5.large', 'db.r5.xlarge'
  ];
  const storageTypes = ['gp2', 'gp3', 'io1', 'magnetic'];
  const regions = [
    { id: 'us-east-1', name: 'US East (N. Virginia)' },
    { id: 'us-west-2', name: 'US West (Oregon)' },
    { id: 'eu-west-1', name: 'Europe (Ireland)' },
  ];

  const handleCalculate = () => {
    // Simplified pricing calculation
    const basePrices: { [key: string]: number } = {
      'db.t3.micro': 0.017,
      'db.t3.small': 0.034,
      'db.t3.medium': 0.068,
      'db.t3.large': 0.136,
      'db.m5.large': 0.192,
      'db.m5.xlarge': 0.384,
      'db.r5.large': 0.29,
      'db.r5.xlarge': 0.58,
    };

    const storagePrices: { [key: string]: number } = {
      'gp2': 0.115,
      'gp3': 0.10,
      'io1': 0.125,
      'magnetic': 0.10,
    };

    let hourlyRate = basePrices[formData.instanceClass] || 0.1;
    
    // Multi-AZ doubles the cost
    if (formData.multiAZ) {
      hourlyRate *= 2;
    }

    const monthlyInstanceCost = hourlyRate * 730;
    const monthlyStorageCost = formData.storageSize * storagePrices[formData.storageType];
    const monthlyBackupCost = formData.backupStorage * 0.095;
    
    const totalMonthlyCost = monthlyInstanceCost + monthlyStorageCost + monthlyBackupCost;
    
    setResult({
      monthlyCost: totalMonthlyCost,
      hourlyCost: hourlyRate
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              (type === 'number' ? Number(value) : value)
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">RDS Cost Estimator</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Database Engine</label>
          <select
            name="engine"
            value={formData.engine}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {engines.map(engine => (
              <option key={engine} value={engine}>{engine}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instance Class</label>
          <select
            name="instanceClass"
            value={formData.instanceClass}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {instanceClasses.map(ic => (
              <option key={ic} value={ic}>{ic}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
          <select
            name="region"
            value={formData.region}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {regions.map(region => (
              <option key={region.id} value={region.id}>{region.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Storage Type</label>
          <select
            name="storageType"
            value={formData.storageType}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {storageTypes.map(st => (
              <option key={st} value={st}>{st}</option>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Backup Storage (GB)</label>
          <input
            type="number"
            name="backupStorage"
            value={formData.backupStorage}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            name="multiAZ"
            checked={formData.multiAZ}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700">
            Multi-AZ Deployment
          </label>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded shadow-sm">
              <p className="text-sm text-gray-600">Monthly Cost</p>
              <p className="text-2xl font-bold text-blue-600">${result.monthlyCost.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-white rounded shadow-sm">
              <p className="text-sm text-gray-600">Hourly Cost</p>
              <p className="text-2xl font-bold text-blue-600">${result.hourlyCost.toFixed(4)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RDSCalculator;