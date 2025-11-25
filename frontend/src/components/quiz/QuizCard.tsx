'use client';

import Link from 'next/link';
import { Clock, BarChart3, Tag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface QuizCardProps {
  quiz: {
    id: string;
    title: string;
    description?: string;
    category: string;
    difficulty: string;
    time_limit_seconds: number;
    question_count: number;
    tags?: string[];
  };
}

const difficultyColors = {
  L1: 'bg-green-100 text-green-800',
  L2: 'bg-yellow-100 text-yellow-800',
  L3: 'bg-red-100 text-red-800',
};

const categoryColors = {
  aws: 'bg-orange-100 text-orange-800',
  devops: 'bg-blue-100 text-blue-800',
  terraform: 'bg-purple-100 text-purple-800',
  kubernetes: 'bg-cyan-100 text-cyan-800',
  docker: 'bg-sky-100 text-sky-800',
};

export function QuizCard({ quiz }: QuizCardProps) {
  const timeInMinutes = Math.floor(quiz.time_limit_seconds / 60);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>{quiz.title}</CardTitle>
          <Badge className={difficultyColors[quiz.difficulty]}>{quiz.difficulty}</Badge>
        </div>
        <CardDescription>{quiz.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metadata */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {timeInMinutes} min
          </div>
          <div className="flex items-center">
            <BarChart3 className="w-4 h-4 mr-1" />
            {quiz.question_count} questions
          </div>
        </div>

        {/* Category Badge */}
        <div className="flex justify-between items-center">
          <Badge className={categoryColors[quiz.category]}>
            {quiz.category.toUpperCase()}
          </Badge>
        </div>

        {/* Tags */}
        {quiz.tags && quiz.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quiz.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline">
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </Badge>
            ))}
            {quiz.tags.length > 3 && (
              <Badge variant="outline">+{quiz.tags.length - 3}</Badge>
            )}
          </div>
        )}

        {/* Action Button */}
        <Link href={`/quiz/${quiz.id}`} passHref>
          <Button className="w-full">Start Quiz</Button>
        </Link>
      </CardContent>
    </Card>
  );
}