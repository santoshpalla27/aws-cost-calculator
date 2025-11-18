'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Calendar, RotateCcw } from 'lucide-react';
import { Task } from '@/lib/types/task';

export default function PersonalTaskList() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'pt1',
      title: 'Morning jog',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: '2023-11-19',
    },
    {
      id: 'pt2',
      title: 'Read 30 pages',
      status: 'TODO',
      priority: 'LOW',
      dueDate: '2023-11-19',
    },
    {
      id: 'pt3',
      title: 'Call dentist',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: '2023-11-20',
    },
    {
      id: 'pt4',
      title: 'Weekly planning',
      status: 'DONE',
      priority: 'MEDIUM',
    }
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const addTask = () => {
    if (newTaskTitle.trim() === '') return;
    
    const newTask: Task = {
      id: `pt${tasks.length + 1}`,
      title: newTaskTitle,
      status: 'TODO',
      priority: 'MEDIUM',
    };
    
    setTasks([newTask, ...tasks]);
    setNewTaskTitle('');
  };

  const toggleTaskCompletion = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id 
        ? { 
            ...task, 
            status: task.status === 'DONE' ? 'TODO' : 'DONE',
            completedAt: task.status === 'DONE' ? undefined : new Date().toISOString()
          } 
        : task
    ));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGHEST':
        return 'bg-red-500';
      case 'HIGH':
        return 'bg-orange-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'LOW':
        return 'bg-blue-500';
      case 'LOWEST':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Personal Tasks</CardTitle>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Add a new task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTask()}
            className="max-w-xs"
          />
          <Button size="sm" onClick={addTask}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div 
              key={task.id} 
              className={`flex items-center p-3 rounded-lg border ${
                task.status === 'DONE' ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'
              }`}
            >
              <Checkbox
                checked={task.status === 'DONE'}
                onCheckedChange={() => toggleTaskCompletion(task.id)}
                className="mr-3"
              />
              <div className="flex-1">
                <div className="flex items-center">
                  <span className={`text-sm font-medium ${task.status === 'DONE' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <div className="ml-2 flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="mt-1">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getPriorityColor(task.priority)}`}
                  >
                    {task.priority}
                  </Badge>
                </div>
              </div>
              {task.status === 'DONE' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleTaskCompletion(task.id)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}