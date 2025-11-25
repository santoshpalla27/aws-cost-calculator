'use client';

import {
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  BarChart3,
  ChevronDown,
  ChevronUp,
  BookOpen
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useRouter } from 'next/navigation';

interface QuizResultsProps {
  result: {
    attemptId: string;
    quizTitle: string;
    category: string;
    difficulty: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    percentage: number;
    timeTaken: number;
    passed: boolean;
    passingScore: number;
    answers: {
      questionId: string;
      questionText: string;
      selectedOptionIds: string[];
      correctOptionIds: string[];
      isCorrect: boolean;
      pointsEarned: number;
      maxPoints: number;
      explanation: string;
    }[];
    completedAt: string;
  };
}

export function QuizResults({ result }: QuizResultsProps) {
  const router = useRouter();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Results Header */}
      <Card className={result.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center">
            {result.passed ? (
              <CheckCircle2 className="w-12 h-12 text-green-500 mr-4" />
            ) : (
              <XCircle className="w-12 h-12 text-red-500 mr-4" />
            )}
            <div>
              <CardTitle className="text-2xl">
                {result.passed ? 'Congratulations!' : 'Keep Practicing!'}
              </CardTitle>
              <p className="text-muted-foreground">
                {result.passed
                  ? 'You passed the quiz!'
                  : `You need ${result.passingScore}% to pass`}
              </p>
            </div>
          </div>
          <div className="text-4xl font-bold">
            {result.percentage.toFixed(1)}%
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {/* ... stats cards */}
      </div>

      {/* Answer Review */}
      <Card>
        <CardHeader>
          <CardTitle>Answer Review</CardTitle>
        </CardHeader>
        <CardContent>
          {result.answers.map((answer, index) => (
            <Collapsible key={answer.questionId}>
              {/* ... collapsible content */}
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        <Button onClick={() => router.push(`/quiz/${result.quizTitle}`)}>Try Again</Button>
      </div>
    </div>
  );
}