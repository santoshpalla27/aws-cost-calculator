import React from 'react';
import { AlertCircle } from 'lucide-react';

function ErrorDisplay({ error }) {
  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
      <div className="flex">
        <AlertCircle className="h-5 w-5 text-red-400" />
        <div className="ml-3">
          <p className="text-sm font-medium text-red-800">
            Error Occurred
          </p>
          <p className="mt-1 text-sm text-red-700">
            {error}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ErrorDisplay;