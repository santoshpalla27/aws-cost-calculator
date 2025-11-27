import React, { useState } from 'react';
import { PlanUploader } from './components/PlanUploader';
import { CostChart } from './components/CostChart';
import { LogTerminal } from './components/LogTerminal';
import { parseTerraformPlan, filterManagedResources } from './services/parserService';
import { generateCostReport, generateDiffReport } from './services/pricingEngine';
import { CostReport, DiffReport, ViewMode, TfResourceChange } from './types';
import {
    Calculator,
    ArrowRightLeft,
    TrendingUp,
    Package,
    AlertTriangle,
    Github,
    Loader2,
    ServerCrash,
    FileJson,
    XCircle,
    CheckCircle
} from 'lucide-react';

const App: React.FC = () => {
    const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.UPLOAD);
    const [report, setReport] = useState<CostReport | null>(null);
    const [diffReport, setDiffReport] = useState<DiffReport | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tempOld, setTempOld] = useState<File[] | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [processingStatus, setProcessingStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');

    const processFiles = async (files: File[]): Promise<{ resources: TfResourceChange[], name: string }> => {
        const jsonFile = files.find(f => f.name.endsWith('.json'));
        const tfFiles = files.filter(f => f.name.endsWith('.tf'));

        if (jsonFile) {
            try {
                const content = await jsonFile.text();
                const plan = parseTerraformPlan(content);
                if (plan) {
                    return {
                        resources: filterManagedResources(plan),
                        name: jsonFile.name
                    };
                }
            } catch (e) {
                console.warn("Failed to parse JSON");
            }
        }

        if (tfFiles.length > 0) {
            setLogs([]);
            setProcessingStatus('processing');

            try {
                const formData = new FormData();
                tfFiles.forEach(file => {
                    formData.append('files', file);
                    formData.append('paths', file.webkitRelativePath || file.name);
                });

                const startRes = await fetch('/api/generate-plan', {
                    method: 'POST',
                    body: formData
                });

                if (!startRes.ok) throw new Error('Failed to start plan generation');
                const { jobId } = await startRes.json();

                return new Promise((resolve, reject) => {
                    const eventSource = new EventSource(`/api/jobs/${jobId}/stream`);

                    eventSource.onmessage = (event) => {
                        const { type, data } = JSON.parse(event.data);

                        if (type === 'log') {
                            setLogs(prev => [...prev, data]);
                        } else if (type === 'complete') {
                            eventSource.close();
                            setProcessingStatus('completed');
                            resolve({
                                resources: filterManagedResources(data),
                                name: `${tfFiles.length} Terraform Files (Generated Plan)`
                            });
                        } else if (type === 'error') {
                            eventSource.close();
                            setProcessingStatus('failed');
                            reject(new Error(data));
                        }
                    };

                    eventSource.onerror = () => {
                        eventSource.close();
                        reject(new Error("Connection lost"));
                    };
                });
            } catch (error) {
                setProcessingStatus('failed');
                throw error;
            }
        }

        throw new Error("No valid Terraform Plan (JSON) or Configuration (TF) files found.");
    };

    const handleSingleUpload = async (files: File[]) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await processFiles(files);
            const costReport = await generateCostReport(result.resources);
            setReport(costReport);
            setFileName(result.name);
            setViewMode(ViewMode.REPORT);
        } catch (err: any) {
            setError(err.message || "Failed to generate report. Ensure backend is running.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDiffUpload = async (oldFiles: File[], newFiles: File[]) => {
        setIsLoading(true);
        setError(null);
        try {
            const oldResult = await processFiles(oldFiles);
            const newResult = await processFiles(newFiles);

            const diff = await generateDiffReport(oldResult.resources, newResult.resources);
            setDiffReport(diff);
            setViewMode(ViewMode.DIFF);
        } catch (err: any) {
            setError(err.message || "Failed to generate diff.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col font-sans">
            {/* Navbar */}
            <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <Calculator className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                            OpenCost
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setViewMode(ViewMode.UPLOAD)}
                            className={`text-sm font-medium hover:text-white transition-colors ${viewMode === ViewMode.UPLOAD ? 'text-blue-400' : 'text-slate-400'}`}
                        >
                            New Estimate
                        </button>
                        <a href="#" className="text-slate-400 hover:text-white transition-colors">
                            <Github className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-red-400">
                        <ServerCrash className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="font-semibold">Error:</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
                        {processingStatus !== 'pending' ? (
                            <LogTerminal logs={logs} status={processingStatus} />
                        ) : (
                            <>
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                                <p className="text-xl font-semibold text-white">Fetching Real-time Pricing from AWS...</p>
                                <p className="text-sm text-slate-400 mt-2">Connecting to pricing engine...</p>
                            </>
                        )}
                    </div>
                )}

                {viewMode === ViewMode.UPLOAD && (
                    <div className="max-w-2xl mx-auto space-y-12">
                        <div className="text-center space-y-4">
                            <h2 className="text-3xl font-bold text-white">Estimate Infrastructure Costs</h2>
                            <p className="text-slate-400 text-lg">
                                Upload Terraform Plan JSON or Code Folder for instant cost analysis
                            </p>
                            <div className="inline-block bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
                                <p className="text-xs text-slate-400 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Real-time AWS Pricing API integration
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-8">
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
                                <div className="flex items-center gap-2 mb-4">
                                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                                    <h3 className="text-lg font-semibold text-white">Single Plan Analysis</h3>
                                </div>
                                <PlanUploader
                                    onUpload={handleSingleUpload}
                                    label="Upload plan.json or folder"
                                    allowMultiple={true}
                                />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-800"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-slate-900 text-slate-500">OR COMPARE PLANS</span>
                                </div>
                            </div>

                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl opacity-90">
                                <div className="flex items-center gap-2 mb-4">
                                    <ArrowRightLeft className="w-5 h-5 text-blue-400" />
                                    <h3 className="text-lg font-semibold text-white">Cost Diff (Before vs After)</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <PlanUploader
                                        onUpload={(f) => setTempOld(f)}
                                        label="Old Plan"
                                        allowMultiple={true}
                                    />
                                    <PlanUploader
                                        onUpload={(f) => tempOld && handleDiffUpload(tempOld, f)}
                                        label="New Plan"
                                        allowMultiple={true}
                                    />
                                </div>
                                {!tempOld && <p className="text-xs text-slate-500 mt-2 text-center">Upload 'Old Plan' first</p>}
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === ViewMode.REPORT && report && (
                    <div className="space-y-8 animate-fade-in">
                        {report.errors && report.errors.length > 0 && (
                            <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-xl flex items-start gap-3">
                                <XCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-amber-400 font-semibold text-sm">Partial Pricing Data</h4>
                                    <p className="text-slate-400 text-xs mt-1">
                                        {report.errors.length} resource(s) could not be priced. Check console for details.
                                    </p>
                                    <details className="text-xs text-slate-500 mt-2 cursor-pointer">
                                        <summary className="text-amber-300 hover:text-amber-200">View Errors</summary>
                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                            {report.errors.map((err, i) => (
                                                <li key={i} className="text-slate-400">
                                                    <strong>{err.resource}</strong>: {err.error}
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                </div>
                            </div>
                        )}

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                <p className="text-sm text-slate-400 font-medium">Estimated Monthly Cost</p>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-4xl font-bold text-white">${report.totalMonthlyCost.toFixed(2)}</span>
                                    <span className="text-sm text-slate-500">USD</span>
                                </div>
                            </div>
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                <p className="text-sm text-slate-400 font-medium">Total Resources</p>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-4xl font-bold text-blue-400">{report.items.length}</span>
                                    <span className="text-sm text-slate-500">Priced</span>
                                </div>
                            </div>
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                <p className="text-sm text-slate-400 font-medium">Most Expensive Service</p>
                                <div className="mt-2">
                                    {Object.entries(report.summaryByService).sort((a, b) => b[1] - a[1])[0] ? (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xl font-semibold text-white">
                                                {Object.entries(report.summaryByService).sort((a, b) => b[1] - a[1])[0][0]}
                                            </span>
                                            <span className="text-emerald-400 font-mono">
                                                ${Object.entries(report.summaryByService).sort((a, b) => b[1] - a[1])[0][1].toFixed(2)}
                                            </span>
                                        </div>
                                    ) : <span className="text-slate-500">N/A</span>}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Charts */}
                            <div className="lg:col-span-1 bg-slate-800 p-6 rounded-xl border border-slate-700">
                                <h3 className="text-lg font-semibold text-white mb-6">Cost Distribution</h3>
                                <CostChart
                                    type="pie"
                                    data={Object.entries(report.summaryByService).map(([k, v]) => ({ name: k, value: parseFloat(v.toFixed(2)) }))}
                                />
                            </div>

                            {/* Resource List */}
                            <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-white">Resource Breakdown</h3>
                                    <div className="flex items-center gap-2 text-xs bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full">
                                        <FileJson className="w-3 h-3" />
                                        {fileName}
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-900/50 text-slate-400 uppercase font-medium">
                                            <tr>
                                                <th className="px-6 py-4">Resource</th>
                                                <th className="px-6 py-4">Type</th>
                                                <th className="px-6 py-4 text-right">Monthly Cost</th>
                                                <th className="px-6 py-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {report.items.map((item) => (
                                                <React.Fragment key={item.id}>
                                                    <tr className="hover:bg-slate-700/50 transition-colors group">
                                                        <td className="px-6 py-4 font-medium text-white">
                                                            <div className="flex flex-col">
                                                                <span>{item.resourceName}</span>
                                                                <span className="text-xs text-slate-500 font-mono mt-1">{item.id}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-300">
                                                            <div className="flex items-center gap-2">
                                                                <Package className="w-4 h-4 text-slate-500" />
                                                                {item.resourceType}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono text-emerald-400">
                                                            ${item.monthlyCost.toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="group relative inline-block">
                                                                {item.metadata?.note ? (
                                                                    <AlertTriangle className="w-4 h-4 text-amber-500/50 hover:text-amber-500 cursor-help" />
                                                                ) : (
                                                                    <CheckCircle className="w-4 h-4 text-emerald-500/50" />
                                                                )}
                                                                <div className="absolute right-0 w-64 p-4 bg-slate-900 border border-slate-700 rounded-lg shadow-xl invisible group-hover:visible z-10 top-full mt-2">
                                                                    <p className="text-xs font-bold text-slate-300 mb-2">Calculation Breakdown</p>
                                                                    <ul className="space-y-1 text-xs text-slate-400">
                                                                        {item.breakdown.map((bd, i) => (
                                                                            <li key={i} className="flex justify-between">
                                                                                <span>{bd.description}</span>
                                                                                <span className="font-mono text-slate-200">${(bd.rate * bd.quantity).toFixed(2)}</span>
                                                                            </li>
                                                                        ))}
                                                                        {item.metadata?.note && (
                                                                            <li className="flex justify-between border-t border-slate-700 pt-2 mt-2">
                                                                                <span>Note:</span>
                                                                                <span>{item.metadata.note}</span>
                                                                            </li>
                                                                        )}
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === ViewMode.DIFF && diffReport && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                <p className="text-sm text-slate-400 font-medium">Original Cost</p>
                                <p className="text-2xl font-bold text-slate-300 mt-2">${diffReport.oldCost.toFixed(2)}</p>
                            </div>
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                <p className="text-sm text-slate-400 font-medium">New Cost</p>
                                <p className="text-2xl font-bold text-white mt-2">${diffReport.newCost.toFixed(2)}</p>
                            </div>
                            <div className={`p-6 rounded-xl border ${diffReport.diff > 0 ? 'bg-red-500/10 border-red-500/50' : 'bg-emerald-500/10 border-emerald-500/50'}`}>
                                <p className="text-sm font-medium opacity-80">Net Difference</p>
                                <div className="flex items-baseline gap-3 mt-2">
                                    <span className={`text-3xl font-bold ${diffReport.diff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {diffReport.diff > 0 ? '+' : ''}${diffReport.diff.toFixed(2)}
                                    </span>
                                    <span className={`text-sm font-mono ${diffReport.diff > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                                        ({diffReport.percentChange > 0 ? '+' : ''}{diffReport.percentChange.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                            <div className="p-6 border-b border-slate-700">
                                <h3 className="text-lg font-semibold text-white">Detailed Diff</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                {diffReport.addedItems.length > 0 && (
                                    <div>
                                        <h4 className="text-emerald-400 text-sm font-bold uppercase mb-2">Added Resources</h4>
                                        <div className="space-y-2">
                                            {diffReport.addedItems.map(item => (
                                                <div key={item.id} className="flex justify-between items-center p-3 bg-emerald-500/5 rounded border border-emerald-500/20">
                                                    <span className="text-slate-300 text-sm font-medium flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                                        {item.resourceName} ({item.resourceType})
                                                    </span>
                                                    <span className="text-emerald-400 font-mono">+${item.monthlyCost.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {diffReport.modifiedItems.length > 0 && (
                                    <div>
                                        <h4 className="text-amber-400 text-sm font-bold uppercase mb-2 mt-4">Modified Resources</h4>
                                        <div className="space-y-2">
                                            {diffReport.modifiedItems.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-3 bg-amber-500/5 rounded border border-amber-500/20">
                                                    <span className="text-slate-300 text-sm font-medium flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                                        {item.resourceName}
                                                    </span>
                                                    <div className="flex items-center gap-4 text-sm">
                                                        <span className="text-slate-500 line-through">${item.oldCost.toFixed(2)}</span>
                                                        <ArrowRightLeft className="w-4 h-4 text-slate-600" />
                                                        <span className="text-white">${item.newCost.toFixed(2)}</span>
                                                        <span className={`font-mono ${item.diff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                            {item.diff > 0 ? '+' : ''}${item.diff.toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {diffReport.removedItems.length > 0 && (
                                    <div>
                                        <h4 className="text-red-400 text-sm font-bold uppercase mb-2 mt-4">Removed Resources</h4>
                                        <div className="space-y-2">
                                            {diffReport.removedItems.map(item => (
                                                <div key={item.id} className="flex justify-between items-center p-3 bg-red-500/5 rounded border border-red-500/20">
                                                    <span className="text-slate-300 text-sm font-medium flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                                        {item.resourceName} ({item.resourceType})
                                                    </span>
                                                    <span className="text-red-400 font-mono">-${item.monthlyCost.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;