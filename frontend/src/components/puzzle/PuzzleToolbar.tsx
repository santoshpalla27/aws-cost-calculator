'use client';

import { Button } from '@/components/ui/button';
import { Zap, Trash2 } from 'lucide-react';

interface PuzzleToolbarProps {
  onConnectClick: () => void;
  onDeleteClick: () => void;
  isConnecting: boolean;
}

export function PuzzleToolbar({ onConnectClick, onDeleteClick, isConnecting }: PuzzleToolbarProps) {
  return (
    <div className="flex flex-col space-y-2 p-2 border rounded-lg">
      <Button
        variant={isConnecting ? 'secondary' : 'ghost'}
        size="icon"
        onClick={onConnectClick}
        title="Connect components"
      >
        <Zap className="w-5 h-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDeleteClick}
        title="Delete selected component"
      >
        <Trash2 className="w-5 h-5 text-red-500" />
      </Button>
    </div>
  );
}