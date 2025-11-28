import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { DollarSign, TrendingUp, AlertCircle, Server } from 'lucide-react';

function CostEstimation({ data }) {
  const { costEstimation, summary, metadata } = data;

  const COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

  // Prepare data for resource type distribution
  const resourceTypeData = Object.entries(metadata.resourceTypes).map(([type, count]) => ({
    name: type.replace('aws_', ''),
    value: count
  }));

  // Prepare data for cost breakdown by resource
  const costByResourceData = costEstimation.resources
    .filter(r => r.hourly)
    .sort((a, b) => b.hourly - a.hourly)
    .slice(0, 10)
    .map(r => ({
      name: `${r.name}`,
      cost: parseFloat((r.hourly * 730).toFixed(2))
    }));

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Hourly</span>
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {summary.summary.hourly}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Daily</span>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {summary.summary.daily}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Monthly</span>
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {summary.summary.monthly}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Yearly</span>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {summary.summary.yearly}
          </p>
        </div>
      </div>

      {/* Mocking Report Warning */}
      {costEstimation.mockingReport && costEstimation.mockingReport.mockedResources > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">Data Mocking Notice</p>
              <p className="mt-1 text-sm text-yellow-700">
                {costEstimation.mockingReport.warnings[0]}
              </p>
              <details className="mt-2">
                <summary className="text-sm text-yellow-700 cursor-pointer">View mocked attributes</summary>
                <div className="mt-2 text-sm text-yellow-700">
                  {Object.entries(costEstimation.mockingReport.mockedAttributes).map(([resource, attrs]) => (
                    <div key={resource}>{resource}: {attrs.join(', ')}</div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cost Breakdown Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Top 10 Resources by Monthly Cost
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costByResourceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `$${value}`} />
              <Tooltip formatter={(value) => [`$${value}`, 'Monthly Cost']} />
              <Legend />
              <Bar dataKey="cost" fill="#4F46E5" name="Monthly Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Resource Type Distribution */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Resource Type Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={resourceTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {resourceTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Resource List */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          <Server className="inline h-5 w-5 mr-2" />
          Detailed Resource Costs
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hourly
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monthly
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {costEstimation.resources.map((resource, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {resource.name}
                    {resource.module && (
                      <span className="text-xs text-gray-500 ml-2">
                        (module: {resource.module})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {resource.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${resource.hourly?.toFixed(4) || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${resource.hourly ? (resource.hourly * 730).toFixed(2) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {resource.details && (
                      <details>
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                          View details
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                          {JSON.stringify(resource.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Infrastructure Metadata
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Total Resources</p>
            <p className="text-2xl font-bold text-gray-900">{metadata.totalResources}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Modules</p>
            <p className="text-2xl font-bold text-gray-900">{metadata.modules}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Region</p>
            <p className="text-2xl font-bold text-gray-900">{metadata.region}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Currency</p>
            <p className="text-2xl font-bold text-gray-900">{summary.currency}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CostEstimation;