'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Flame } from 'lucide-react';

interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  streakCount: number;
  completedToday: boolean;
}

export default function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([
    {
      id: 'h1',
      name: 'Morning Exercise',
      description: '30 minutes workout',
      frequency: 'DAILY',
      streakCount: 12,
      completedToday: false,
    },
    {
      id: 'h2',
      name: 'Read Books',
      description: 'Read at least 20 pages',
      frequency: 'DAILY',
      streakCount: 8,
      completedToday: true,
    },
    {
      id: 'h3',
      name: 'Meditation',
      description: '10 minutes of mindfulness',
      frequency: 'DAILY',
      streakCount: 5,
      completedToday: false,
    }
  ]);

  const toggleHabitCompletion = (id: string) => {
    setHabits(habits.map(habit => 
      habit.id === id 
        ? { 
            ...habit, 
            completedToday: !habit.completedToday,
            streakCount: !habit.completedToday 
              ? habit.streakCount + 1 
              : Math.max(0, habit.streakCount - 1)
          } 
        : habit
    ));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Habit Tracker</CardTitle>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Habit
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {habits.map((habit) => (
            <div key={habit.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="flex items-center">
                  <h3 className="font-medium">{habit.name}</h3>
                  <div className="ml-2 flex items-center">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium ml-1">{habit.streakCount}</span>
                  </div>
                </div>
                {habit.description && (
                  <p className="text-sm text-gray-600 mt-1">{habit.description}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {habit.frequency.charAt(0) + habit.frequency.slice(1).toLowerCase()}
                </Badge>
                <Button
                  size="sm"
                  variant={habit.completedToday ? "default" : "outline"}
                  onClick={() => toggleHabitCompletion(habit.id)}
                >
                  {habit.completedToday ? 'Done' : 'Mark Done'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}