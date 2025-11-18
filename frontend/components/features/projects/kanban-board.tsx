'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/lib/types/task';

interface KanbanColumn {
  id: string;
  title: string;
  taskIds: string[];
}

interface KanbanBoardProps {
  projectId: string;
}

export default function KanbanBoard({ projectId }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>([
    {
      id: 'todo',
      title: 'To Do',
      taskIds: ['task1', 'task2']
    },
    {
      id: 'in-progress',
      title: 'In Progress',
      taskIds: ['task3']
    },
    {
      id: 'done',
      title: 'Done',
      taskIds: ['task4']
    }
  ]);

  const [tasks, setTasks] = useState<Record<string, Task>>({
    task1: {
      id: 'task1',
      title: 'Design login page',
      description: 'Create mockups for the login page',
      status: 'TODO',
      priority: 'HIGH',
      assignee: { id: 'user1', name: 'John Doe', avatar: '' },
      labels: [{ id: 'label1', name: 'design', color: '#3b82f6' }]
    },
    task2: {
      id: 'task2',
      title: 'Set up project structure',
      description: 'Initialize the project with basic components',
      status: 'TODO',
      priority: 'MEDIUM',
      assignee: { id: 'user2', name: 'Jane Smith', avatar: '' },
      labels: [{ id: 'label2', name: 'setup', color: '#10b981' }]
    },
    task3: {
      id: 'task3',
      title: 'Implement authentication',
      description: 'Create login and registration functionality',
      status: 'IN_PROGRESS',
      priority: 'HIGHEST',
      assignee: { id: 'user1', name: 'John Doe', avatar: '' },
      labels: [{ id: 'label3', name: 'backend', color: '#8b5cf6' }]
    },
    task4: {
      id: 'task4',
      title: 'Write documentation',
      description: 'Document the API endpoints',
      status: 'DONE',
      priority: 'LOW',
      assignee: { id: 'user2', name: 'Jane Smith', avatar: '' },
      labels: [{ id: 'label4', name: 'documentation', color: '#f59e0b' }]
    }
  });

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const start = columns.find(column => column.id === source.droppableId);
    const finish = columns.find(column => column.id === destination.droppableId);

    if (start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = {
        ...start,
        taskIds: newTaskIds,
      };

      setColumns(columns.map(column =>
        column.id === newColumn.id ? newColumn : column
      ));
      return;
    }

    // Move from one list to another
    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = {
      ...start,
      taskIds: startTaskIds,
    };

    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = {
      ...finish,
      taskIds: finishTaskIds,
    };

    setColumns(columns.map(column =>
      column.id === newStart.id || column.id === newFinish.id
        ? column.id === newStart.id
          ? newStart
          : newFinish
        : column
    ));
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => (
          <div key={column.id} className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 bg-gray-100 rounded-t-lg">
              <h3 className="font-semibold">{column.title}</h3>
              <span className="bg-gray-200 text-gray-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {column.taskIds.length}
              </span>
            </div>
            
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`flex-grow p-2 min-h-[500px] rounded-b-lg ${
                    snapshot.isDraggingOver ? 'bg-gray-50' : 'bg-gray-25'
                  }`}
                >
                  {column.taskIds.map((taskId, index) => {
                    const task = tasks[taskId];
                    return (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-3 ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                          >
                            <Card className="hover:shadow-md transition-shadow">
                              <CardHeader className="p-3 pb-2">
                                <div className="flex justify-between items-start">
                                  <CardTitle className="text-sm font-medium">
                                    {task.title}
                                  </CardTitle>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      task.priority === 'HIGHEST' ? 'border-red-500 text-red-500' :
                                      task.priority === 'HIGH' ? 'border-orange-500 text-orange-500' :
                                      task.priority === 'MEDIUM' ? 'border-yellow-500 text-yellow-500' :
                                      task.priority === 'LOW' ? 'border-blue-500 text-blue-500' :
                                      'border-gray-500 text-gray-500'
                                    }`}
                                  >
                                    {task.priority}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="p-3 pt-2">
                                {task.description && (
                                  <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                                )}
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {task.labels?.map(label => (
                                    <Badge 
                                      key={label.id} 
                                      variant="secondary" 
                                      className="text-xs"
                                      style={{ backgroundColor: label.color + '20', color: label.color }}
                                    >
                                      {label.name}
                                    </Badge>
                                  ))}
                                </div>
                                {task.assignee && (
                                  <div className="flex items-center mt-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs mr-2">
                                      {task.assignee.name.charAt(0)}
                                    </div>
                                    <span className="text-xs text-gray-600">{task.assignee.name}</span>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}