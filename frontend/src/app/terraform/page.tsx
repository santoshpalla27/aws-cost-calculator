'use client';

import React, { useState } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import CostBreakdown from '@/components/terraform/CostBreakdown';

export default function TerraformPage() {
  const [costData, setCostData] = useState(null);

  return (
    <div>
      <AppHeader />
      <main className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terraform Cost Estimator</h1>
          <p className="text-gray-600 mb-8">Analyze your Terraform infrastructure costs</p>

          <div className="grid grid-cols-1 gap-8">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Upload Terraform Files</h2>
              <p className="text-gray-600 mb-4">
                Upload your Terraform configuration files (.tf) to estimate infrastructure costs.
              </p>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="mb-4">Drag & drop Terraform files here or click to browse</p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Select Files
                </button>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Cost Breakdown</h2>
              {costData ? (
                <CostBreakdown
                  totalMonthlyCost={1234.56}
                  resources={[
                    { name: 'aws_instance.web', type: 't3.micro', monthlyCost: 23.45 },
                    { name: 'aws_db_instance.app', type: 'db.t3.small', monthlyCost: 34.56 }
                  ]}
                  services={[
                    { name: 'EC2', monthlyCost: 150.25 },
                    { name: 'RDS', monthlyCost: 299.99 }
                  ]}
                />
              ) : (
                <p className="text-gray-500 text-center py-8">Upload files to see cost breakdown</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}