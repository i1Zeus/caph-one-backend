import { TaskPriority, TaskStatus } from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus = TaskStatus.PENDING;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority = TaskPriority.MEDIUM;

  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsUUID()
  @IsOptional()
  taskStageId?: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  assigneeIds?: string[];

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
