import React from 'react';
import { Key, Lock, Globe } from 'lucide-react';

function CredentialsForm({ credentials, onChange }) {
  const handleChange = (e) => {
    onChange({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const regions = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-east-2', label: 'US East (Ohio)' },
    { value: 'us-west-1', label: 'US West (N. California)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'EU (Ireland)' },
    { value: 'eu-central-1', label: 'EU (Frankfurt)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' }
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Key className="inline h-4 w-4 mr-1" />
          AWS Access Key ID
        </label>
        <input
          type="password"
          name="aws_access_key_id"
          value={credentials.aws_access_key_id}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="AKIA..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Lock className="inline h-4 w-4 mr-1" />
          AWS Secret Access Key
        </label>
        <input
          type="password"
          name="aws_secret_access_key"
          value={credentials.aws_secret_access_key}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Your secret access key"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          AWS Session Token (Optional)
        </label>
        <input
          type="password"
          name="aws_session_token"
          value={credentials.aws_session_token}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Session token if using temporary credentials"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Globe className="inline h-4 w-4 mr-1" />
          AWS Region
        </label>
        <select
          name="region"
          value={credentials.region}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          {regions.map(region => (
            <option key={region.value} value={region.value}>
              {region.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> Your credentials are used only for this estimation 
          and are not stored. We recommend using temporary credentials or IAM roles 
          with read-only access.
        </p>
      </div>
    </div>
  );
}

export default CredentialsForm;