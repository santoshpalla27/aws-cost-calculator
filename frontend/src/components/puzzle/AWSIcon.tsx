'use client';

import Image from 'next/image';

interface AWSIconProps {
  type: string;
  name: string;
  icon: string;
  isSelected?: boolean;
}

export function AWSIcon({ type, name, icon, isSelected }: AWSIconProps) {
  return (
    <div
      className={`flex flex-col items-center p-2 rounded-lg cursor-pointer transition-all ${
        isSelected ? 'bg-blue-100 border-2 border-blue-500' : 'bg-white border'
      }`}
    >
      <Image
        src={icon}
        alt={name}
        width={48}
        height={48}
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/icons/aws/default.svg';
        }}
      />
      <span className="text-xs text-center mt-1">{name}</span>
    </div>
  );
}