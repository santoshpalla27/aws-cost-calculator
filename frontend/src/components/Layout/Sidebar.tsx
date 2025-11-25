import React from 'react';
import clsx from 'clsx';
import {
  CloudArrowUpIcon,
  CalculatorIcon,
  ChartBarIcon,
} from ' @heroicons/react/24/outline';

interface SidebarProps {
  activeTab: 'upload' | 'calculator' | 'history';
  onTabChange: (tab: 'upload' | 'calculator' | 'history') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    {
      id: 'upload' as const,
      label: 'Terraform Upload',
      icon: CloudArrowUpIcon,
      description: 'Scan infrastructure code',
    },
    {
      id: 'calculator' as const,
      label: 'Price Calculator',
      icon: CalculatorIcon,
      description: 'Check live AWS prices',
    },
    {
      id: 'history' as const,
      label: 'History',
      icon: ChartBarIcon,
      description: 'Previous estimates',
    },
  ];

  return (
    <nav className="p-4 space-y-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={clsx(
            'w-full flex items-start gap-3 p-3 rounded-lg transition-colors',
            activeTab === tab.id
              ? 'bg-dark-800 text-dark-100'
              : 'text-dark-400 hover:bg-dark-800/50 hover:text-dark-200'
          )}
        >
          <tab.icon className="h-6 w-6 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col items-start">
            <span className="font-medium">{tab.label}</span>
            <span className="text-sm text-dark-400">{tab.description}</span>
          </div>
        </button>
      ))}
    </nav>
  );
};