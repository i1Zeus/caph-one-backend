import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  ActionCategory,
  ActionStatus,
  ActionType,
  Severity,
} from './create-disciplinary-action.dto';

export class UpdateDisciplinaryActionDto {
  @IsEnum(ActionType)
  @IsOptional()
  type?: ActionType;

  @IsEnum(Severity)
  @IsOptional()
  severity?: Severity;

  @IsEnum(ActionCategory)
  @IsOptional()
  category?: ActionCategory;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  actionDate?: string;

  @IsString()
  @IsOptional()
  penalty?: string;

  @IsOptional()
  @Type(() => Number)
  deductionAmount?: number;

  @IsOptional()
  @IsNumber()
  deductionDays?: number;

  @IsOptional()
  @IsNumber()
  suspensionDays?: number;

  @IsString()
  @IsOptional()
  evidenceUrl?: string;

  @IsString()
  @IsOptional()
  witnessNames?: string;

  @IsEnum(ActionStatus)
  @IsOptional()
  status?: ActionStatus;

  @IsDateString()
  @IsOptional()
  resolvedDate?: string;

  @IsString()
  @IsOptional()
  resolvedNotes?: string;
}
