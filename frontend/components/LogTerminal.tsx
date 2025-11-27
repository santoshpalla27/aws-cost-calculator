import React, { useEffect, useRef } from 'react';
import { Terminal, Loader2 } from 'lucide-react';

interface LogTerminalProps {
    logs: string[];
    status: 'pending' | 'processing' | 'completed' | 'failed';
}

export const LogTerminal: React.FC<LogTerminalProps> = ({ logs, status }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="w-full max-w-3xl mx-auto bg-slate-950 rounded-lg border border-slate-800 overflow-hidden shadow-2xl font-mono text-sm">
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                    <Terminal className="w-4 h-4" />
                    <span>Terraform Output</span>
                </div>
                <div className="flex items-center gap-2">
                    {status === 'processing' && (
                        <span className="flex items-center gap-2 text-blue-400 text-xs">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Processing...
                        </span>
                    )}
                    {status === 'failed' && <span className="text-red-400 text-xs">Failed</span>}
                    {status === 'completed' && <span className="text-emerald-400 text-xs">Completed</span>}
                </div>
            </div>
            <div className="p-4 h-96 overflow-y-auto space-y-1">
                {logs.length === 0 && (
                    <div className="text-slate-600 italic">Waiting for logs...</div>
                )}
                {logs.map((log, index) => (
                    <div key={index} className="break-all whitespace-pre-wrap text-slate-300">
                        <span className="text-slate-600 mr-2">$</span>
                        {log}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};
