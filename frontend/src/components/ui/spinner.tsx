import { Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Spinner = ({ className }: { className?: string }) => {
  return (
    <Loader className={cn('animate-spin text-primary', className)} />
  );
};