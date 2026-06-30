import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum RequestType {
  SALARY_ADVANCE = 'SALARY_ADVANCE',
  CERTIFICATE = 'CERTIFICATE',
  VACATION_BALANCE = 'VACATION_BALANCE',
  SHIFT_CHANGE = 'SHIFT_CHANGE',
  OVERTIME_APPROVAL = 'OVERTIME_APPROVAL',
  EXPENSE_CLAIM = 'EXPENSE_CLAIM',
  TRANSFER_REQUEST = 'TRANSFER_REQUEST',
  RESIGNATION = 'RESIGNATION',
  COMPLAINT = 'COMPLAINT',
  SUGGESTION = 'SUGGESTION',
  OTHER = 'OTHER',
}

export enum RequestPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export class CreateEmployeeRequestDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsEnum(RequestType)
  @IsNotEmpty()
  type: RequestType;

  @IsEnum(RequestPriority)
  @IsOptional()
  priority?: RequestPriority;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  requestedAmount?: number;
}
