import React from 'react';
import clsx from 'clsx';

interface ServiceSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const services = [
  { id: 'AmazonEC2', name: 'EC2', icon: '🖥️', description: 'Virtual Servers' },
  { id: 'AmazonRDS', name: 'RDS', icon: '🗄️', description: 'Managed Databases' },
  { id: 'AmazonS3', name: 'S3', icon: '🪣', description: 'Object Storage' },
  { id: 'AWSLambda', name: 'Lambda', icon: 'λ', description: 'Serverless' },
];

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <div>
      <label className="label">Service</label>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-1">
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => onChange(service.id)}
            className={clsx(
              'p-3 rounded-lg border transition-all text-left',
              value === service.id
                ? 'border-accent-blue bg-accent-blue/10 text-dark-100'
                : 'border-dark-700 bg-dark-800 text-dark-300 hover:border-dark-600'
            )}
          >
            <div className="flex items-center space-x-2">
              <span className="text-xl">{service.icon}</span>
              <div>
                <p className="font-medium">{service.name}</p>
                <p className="text-xs text-dark-400">{service.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};