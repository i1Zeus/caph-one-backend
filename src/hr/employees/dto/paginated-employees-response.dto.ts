import { Employee } from '@prisma/client';

export class PaginatedEmployeesResponseDto {
  employees: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
