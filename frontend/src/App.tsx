import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from ' @tanstack/react-query';
import { Toaster, toast } from 'react-hot-toast';

import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Terraform Upload Components
import { DropZone } from './components/TerraformUpload/DropZone';
import { TotalCard } from './components/TerraformUpload/TotalCard';
import { CostTable } from './components/TerraformUpload/CostTable';

// Price Checker Components
import { ServiceSelector } from './components/PriceChecker/ServiceSelector';
import { RegionSelector } from './components/PriceChecker/RegionSelector';
import { InstanceTypeSelector } from './components/PriceChecker/InstanceTypeSelector';
import { PriceCard } from './components/PriceChecker/PriceCard';

// Hooks
import { useTerraformScan } from './hooks/useTerraform';
import { useEC2Price } from './hooks/usePricing';

// Types
import type { TerraformScanResponse, OperatingSystem } from './types';

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

type TabType = 'upload' | 'calculator' | 'history';

function TerraformUploadView() {
  const [scanResult, setScanResult] = useState<TerraformScanResponse | null>(null);
  const scanMutation = useTerraformScan();

  const handleFileSelect = async (file: File) => {
    try {
      setScanResult(null); // Clear previous results
      const result = await scanMutation.mutateAsync({ file });
      setScanResult(result);
      
      if (result.success) {
        toast.success(`Found ${result.resource_count} resources`);
      } else if (result.errors.length > 0) {
        toast.error(result.errors[0]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Scan failed');
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-dark-100 mb-2">
          Terraform Cost Analysis
        </h2>
        <p className="text-dark-300">
          Upload your Terraform code to estimate AWS infrastructure costs
        </p>
      </div>

      <DropZone
        onFileSelect={handleFileSelect}
        isLoading={scanMutation.isPending}
        disabled={scanMutation.isPending}
      />

      {scanMutation.isPending && (
        <div className="mt-8">
          <TotalCard
            monthlyTotal={0}
            yearlyTotal={0}
            resourceCount={0}
            scanDuration={0}
          />
        </div>
      )}

      {scanResult && scanResult.success && (
        <>
          <div className="mt-8">
            <TotalCard
              monthlyTotal={scanResult.total_monthly_cost}
              yearlyTotal={scanResult.total_yearly_cost}
              resourceCount={scanResult.resource_count}
              scanDuration={scanResult.scan_duration_seconds}
            />
          </div>

          {scanResult.warnings.length > 0 && (
            <div className="card p-4 mt-8 bg-accent-yellow/10 border-accent-yellow text-accent-yellow">
              <p className="font-semibold mb-2">Warnings</p>
              <ul className="list-disc list-inside text-sm">
                {scanResult.warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8">
            <h3 className="text-xl font-semibold text-dark-100 mb-4">
              Resource Breakdown
            </h3>
            <CostTable resources={scanResult.resources} />
          </div>
        </>
      )}

      {scanResult && !scanResult.success && (
        <div className="card p-6 mt-8 bg-accent-red/10 border-accent-red text-accent-red">
          <h3 className="text-xl font-semibold mb-3">Scan Failed</h3>
          <ul className="list-disc list-inside text-sm">
            {scanResult.errors.map((error, i) => (
              <li key={i}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PriceCalculatorView() {
  const [service, setService] = useState('AmazonEC2');
  const [region, setRegion] = useState('us-east-1');
  const [instanceType, setInstanceType] = useState('t3.micro');
  const [operatingSystem, setOperatingSystem] = useState<OperatingSystem>('Linux');

  const { data, isLoading, error } = useEC2Price(
    instanceType,
    region,
    operatingSystem,
    service === 'AmazonEC2' && !!instanceType
  );

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-dark-100 mb-2">
          AWS Price Calculator
        </h2>
        <p className="text-dark-300">
          Get live pricing for AWS services directly from the Pricing API
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <ServiceSelector value={service} onChange={setService} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RegionSelector value={region} onChange={setRegion} />

            {service === 'AmazonEC2' && (
              <>
                <InstanceTypeSelector
                  value={instanceType}
                  onChange={setInstanceType}
                  region={region}
                />

                <div>
                  <label className="label">Operating System</label>
                  <select
                    value={operatingSystem}
                    onChange={(e) => setOperatingSystem(e.target.value as OperatingSystem)}
                    className="select"
                  >
                    <option value="Linux">Linux</option>
                    <option value="Windows">Windows</option>
                    <option value="RHEL">RHEL</option>
                    <option value="SUSE">SUSE</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <PriceCard data={data} isLoading={isLoading} error={error} />
        </div>
      </div>
    </div>
  );
}

function HistoryView() {
  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-dark-100 mb-2">
          Estimation History
        </h2>
        <p className="text-dark-300">View your previous cost estimations</p>
      </div>

      <div className="card p-6 text-dark-300 text-center">
        <p className="font-semibold">History feature coming soon...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('upload');

  return (
    <div className="flex flex-col h-screen bg-dark-950 text-dark-100">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-dark-900 border-r border-dark-700">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        </aside>
        <main className="flex-1 flex flex-col">
          {activeTab === 'upload' && <TerraformUploadView />}
          {activeTab === 'calculator' && <PriceCalculatorView />}
          {activeTab === 'history' && <HistoryView />}
        </main>
      </div>
      <Toaster position="bottom-right" reverseOrder={false} />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;