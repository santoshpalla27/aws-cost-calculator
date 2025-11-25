import React from 'react';
import clsx from 'clsx';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  text,
  className,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center', className)}>
      <div className={clsx('animate-spin rounded-full border-b-2 border-accent-blue', sizeClasses[size])} />
      {text && <p className="mt-2 text-dark-300 text-sm">{text}</p>}
    </div>
  );
};

export const LoadingOverlay: React.FC<{ text?: string }> = ({ text }) => {
  return (
    <div className="absolute inset-0 bg-dark-950 bg-opacity-70 flex items-center justify-center z-50 rounded-xl">
      <div className="flex flex-col items-center">
        <Loading size="lg" />
        {text && <p className="mt-4 text-dark-100 text-lg font-medium">{text}</p>}
      </div>
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={clsx('animate-pulse-slow bg-dark-700 rounded-md', className)} />
  );
};