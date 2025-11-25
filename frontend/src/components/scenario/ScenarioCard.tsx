'use client';

import Link from 'next/link';
import { AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ScenarioCardProps {
  scenario: {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    time_limit_seconds: number;
    tags?: string[];
  };
}

export function ScenarioCard({ scenario }: ScenarioCardProps) {
  const timeInMinutes = Math.floor(scenario.time_limit_seconds / 60);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{scenario.title}</CardTitle>
        <CardDescription>{scenario.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm text-muted-foreground">
          <Badge>{scenario.category.toUpperCase()}</Badge>
          <Badge variant={scenario.difficulty === 'L3' ? 'destructive' : 'secondary'}>
            {scenario.difficulty}
          </Badge>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {timeInMinutes} min
          </div>
        </div>
        <Link href={`/scenarios/${scenario.id}`} passHref>
          <Button className="w-full">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Start Scenario
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}