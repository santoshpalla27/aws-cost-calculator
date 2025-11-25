'use client';

import { Progress } from '@/components/ui/progress';

interface QuizProgressProps {
  currentIndex: number;
  totalQuestions: number;
  answeredCount: number;
}

export function QuizProgress({ currentIndex, totalQuestions, answeredCount }: QuizProgressProps) {
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>
          Question {currentIndex + 1} of {totalQuestions}
        </span>
        <span>
          {answeredCount} answered
        </span>
      </div>
      <Progress value={progress} />
    </div>
  );
}