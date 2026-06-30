import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  ActionCategory,
  ActionStatus,
  ActionType,
  Severity,
} from './create-disciplinary-action.dto';

export class GetDisciplinaryActionsDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsEnum(ActionType)
  type?: ActionType;

  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  @IsOptional()
  @IsEnum(ActionCategory)
  category?: ActionCategory;

  @IsOptional()
  @IsEnum(ActionStatus)
  status?: ActionStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: 'actionDate' | 'createdAt' | 'severity' = 'actionDate';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class ResolveActionDto {
  @IsEnum(ActionStatus)
  @IsNotEmpty()
  status: ActionStatus;

  @IsDateString()
  @IsOptional()
  resolvedDate?: string;

  @IsString()
  @IsOptional()
  resolvedNotes?: string;
}
