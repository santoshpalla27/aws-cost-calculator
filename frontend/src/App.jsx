import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import FileUpload from './components/FileUpload';
import CredentialsForm from './components/CredentialsForm';
import CostEstimation from './components/CostEstimation';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';
import { estimateCost } from './services/api';
import './index.css';

function App() {
  const [files, setFiles] = useState([]);
  const [credentials, setCredentials] = useState({
    aws_access_key_id: '',
    aws_secret_access_key: '',
    aws_session_token: '',
    region: 'us-east-1'
  });
  const [estimation, setEstimation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFilesSelected = (selectedFiles) => {
    setFiles(selectedFiles);
    setError(null);
  };

  const handleCredentialsChange = (creds) => {
    setCredentials(creds);
  };

  const handleEstimate = async () => {
    if (files.length === 0) {
      toast.error('Please upload Terraform files');
      return;
    }

    if (!credentials.aws_access_key_id || !credentials.aws_secret_access_key) {
      toast.error('Please provide AWS credentials');
      return;
    }

    setLoading(true);
    setError(null);
    setEstimation(null);

    try {
      const result = await estimateCost(files, credentials);
      setEstimation(result.data);
      toast.success('Cost estimation completed!');
    } catch (err) {
      setError(err.message);
      toast.error('Failed to estimate costs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer />
      
      {loading && <LoadingSpinner />}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Terraform Cost Estimator
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Get real-time AWS cost estimates for your Terraform infrastructure
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Upload Terraform Files
              </h2>
              <FileUpload onFilesSelected={handleFilesSelected} />
            </div>

            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                AWS Credentials
              </h2>
              <CredentialsForm 
                credentials={credentials} 
                onChange={handleCredentialsChange} 
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <button
              onClick={handleEstimate}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Estimating...' : 'Calculate Cost Estimation'}
            </button>

            {error && <ErrorDisplay error={error} />}
            
            {estimation && <CostEstimation data={estimation} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;