import React from 'react';

function LoadingSpinner() {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
        <p className="text-center text-lg font-medium text-gray-900 mb-2">Calculating cost estimation...</p>
        <p className="text-center text-sm text-gray-600">
          This may take a few moments while we fetch real-time pricing data
        </p>
      </div>
    </div>
  );
}

export default LoadingSpinner;