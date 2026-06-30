import { User } from '../entities/user.entity';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedUsersResponse {
  data: User[];
  meta: PaginationMeta;
}

export interface FindAllUsersParams {
  page: number;
  limit: number;
  search: string;
  role?: string; // Changed from UserRole to string
  status?: 'active' | 'inactive' | 'all';
  sortBy?: 'name' | 'email' | 'createdAt'; // Removed 'role' from sortBy options
  sortOrder?: 'asc' | 'desc';
  workspaceId?: string; // Add workspace filtering
}
