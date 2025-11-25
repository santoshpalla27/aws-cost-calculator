'use client';

interface LogLine {
  lineNumber: number;
  content: string;
  level: 'info' | 'warning' | 'error' | 'debug';
}

interface LogViewerProps {
  logs: string;
}

function parseLogs(logText: string): LogLine[] {
  return logText.split('\n').map((line, index) => {
    let level: LogLine['level'] = 'info';
    if (line.toLowerCase().includes('error')) level = 'error';
    else if (line.toLowerCase().includes('warn')) level = 'warning';
    else if (line.toLowerCase().includes('debug')) level = 'debug';
    return { lineNumber: index + 1, content: line, level };
  });
}

export function LogViewer({ logs }: LogViewerProps) {
  const parsedLogs = parseLogs(logs);

  const levelColors = {
    info: 'text-gray-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
    debug: 'text-blue-500',
  };

  return (
    <pre className="bg-gray-900 text-white p-4 rounded-lg text-sm overflow-x-auto">
      {parsedLogs.map((line) => (
        <div key={line.lineNumber} className="flex">
          <span className="w-10 text-gray-600">{line.lineNumber}</span>
          <span className={levelColors[line.level]}>{line.content}</span>
        </div>
      ))}
    </pre>
  );
}
