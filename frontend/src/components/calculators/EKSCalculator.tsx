'use client';

import React, { useState } from 'react';

interface NodeGroup {
  instanceType: string;
  nodeCount: number;
  hourlyHours: number;
}

const EKSCalculator = () => {
  const [nodeGroups, setNodeGroups] = useState<NodeGroup[]>([
    { instanceType: 't3.medium', nodeCount: 2, hourlyHours: 730 }
  ]);
  
  const [result, setResult] = useState<{monthlyCost: number} | null>(null);

  const instanceTypes = ['t3.medium', 't3.large', 't3.xlarge', 'm5.large', 'm5.xlarge', 'c5.large'];

  const handleCalculate = () => {
    // EKS cluster cost: $0.10 per hour
    const clusterCost = 0.10 * 730;
    
    // Calculate node costs
    const nodePrices: { [key: string]: number } = {
      't3.medium': 0.0416,
      't3.large': 0.0832,
      't3.xlarge': 0.1664,
      'm5.large': 0.096,
      'm5.xlarge': 0.192,
      'c5.large': 0.085,
    };

    let nodeGroupCost = 0;
    nodeGroups.forEach(ng => {
      const price = nodePrices[ng.instanceType] || 0.1;
      nodeGroupCost += price * ng.nodeCount * ng.hourlyHours;
    });
    
    const totalMonthlyCost = clusterCost + nodeGroupCost;
    setResult({ monthlyCost: totalMonthlyCost });
  };

  const addNodeGroup = () => {
    setNodeGroups([...nodeGroups, { instanceType: 't3.medium', nodeCount: 1, hourlyHours: 730 }]);
  };

  const removeNodeGroup = (index: number) => {
    if (nodeGroups.length > 1) {
      setNodeGroups(nodeGroups.filter((_, i) => i !== index));
    }
  };

  const updateNodeGroup = (index: number, field: keyof NodeGroup, value: string | number) => {
    const updated = [...nodeGroups];
    updated[index] = { ...updated[index], [field]: value };
    setNodeGroups(updated);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">EKS Cost Estimator</h2>
      
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">EKS Cluster Configuration</h3>
        
        <div className="mb-6">
          <h4 className="font-medium mb-3 text-gray-700">Node Groups</h4>
          {nodeGroups.map((ng, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instance Type</label>
                <select
                  value={ng.instanceType}
                  onChange={(e) => updateNodeGroup(index, 'instanceType', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm"
                >
                  {instanceTypes.map(it => (
                    <option key={it} value={it}>{it}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Node Count</label>
                <input
                  type="number"
                  value={ng.nodeCount}
                  onChange={(e) => updateNodeGroup(index, 'nodeCount', Number(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours/Month</label>
                <input
                  type="number"
                  value={ng.hourlyHours}
                  onChange={(e) => updateNodeGroup(index, 'hourlyHours', Number(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              
              {nodeGroups.length > 1 && (
                <div className="flex items-end">
                  <button
                    onClick={() => removeNodeGroup(index)}
                    className="mt-2 text-red-600 text-sm"
                  >
                    Remove Node Group
                  </button>
                </div>
              )}
            </div>
          ))}
          
          <button
            onClick={addNodeGroup}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            + Add Node Group
          </button>
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

export default EKSCalculator;