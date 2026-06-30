import { TaskPriority, TaskStatus } from '@prisma/client';
import { Task } from '../entities/task.entity';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedTasksResponse {
  data: Task[];
  meta: PaginationMeta;
}

export interface FindAllTasksParams {
  page: number;
  limit: number;
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeIds?: string[]; // Changed from assigneeId to assigneeIds array
  createdByIds?: string[]; // Multi-creator filter
  taskStageId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  workspaceId?: string;
  showDueTasks?: boolean;
  sortBy?:
    | 'title'
    | 'priority'
    | 'status'
    | 'dueDate'
    | 'createdAt'
    | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
