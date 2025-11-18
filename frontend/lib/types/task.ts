// frontend/lib/types/task.ts

export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'DONE' | 'CANCELLED';
  priority: 'LOWEST' | 'LOW' | 'MEDIUM' | 'HIGH' | 'HIGHEST';
  assignee?: User;
  labels?: Label[];
  storyPoints?: number;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}