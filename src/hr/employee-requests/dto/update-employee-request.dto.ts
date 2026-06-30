import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { RequestPriority, RequestType } from './create-employee-request.dto';

export class UpdateEmployeeRequestDto {
  @IsEnum(RequestType)
  @IsOptional()
  type?: RequestType;

  @IsEnum(RequestPriority)
  @IsOptional()
  priority?: RequestPriority;

  @IsString()
  @IsOptional()
  title?: string;

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
