'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';

export function TopResources() {
  const [resources, setResources] = useState<any[]>([]);

  useEffect(() => {
    fetchTopResources();
  }, []);

  const fetchTopResources = async () => {
    try {
      const response = await api.get('/reports', { params: { limit: 5 } });
      setResources(response.data.reports || []);
    } catch (error) {
      console.error('Failed to fetch top resources:', error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Expensive Resources</h2>
      <div className="space-y-4">
        {resources.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No resources found</p>
        ) : (
          resources.map((resource: any, index: number) => (
            <div key={index} className="flex justify-between items-center border-b pb-3 last:border-b-0">
              <div>
                <p className="font-medium text-gray-900">{resource.name || 'Unnamed Resource'}</p>
                <p className="text-sm text-gray-500">
                  Created {new Date(resource.createdAt).toLocaleDateString()}
                </p>
              </div>
              <p className="font-semibold text-gray-900">${resource.totalCost?.toFixed(2) || '0.00'}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}