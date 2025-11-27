import React from 'react';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white rounded-lg shadow border border-gray-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}