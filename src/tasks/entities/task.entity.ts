import { TaskPriority, TaskStatus } from '@prisma/client';

export interface SubtaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: Date;
}

export interface TaskWithFullSubtasks extends Omit<Task, 'subtasks'> {
  subtasks?: Task[];
}

export class Task {
  id: string;
  parentId?: string;
  title: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  taskStageId?: string;
  createdById?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Relations (optional, populated when included in queries)
  parent?: {
    id: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
  };

  subtasks?: SubtaskSummary[];

  project?: {
    id: string;
    name: string;
    description?: string;
    owner?: {
      id: string;
      name: string;
      email: string;
    };
  };

  assignees?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  }[];

  createdBy?: {
    id: string;
    name: string;
    email: string;
  };

  taskStage?: {
    id: string;
    name: string;
    description?: string;
    order?: number;
    color?: string;
  };
}
