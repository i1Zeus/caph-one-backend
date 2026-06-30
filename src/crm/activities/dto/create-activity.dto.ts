import { ActivityType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateActivityDto {
  @IsString()
  @IsNotEmpty()
  leadId: string;

  @IsEnum(ActivityType)
  activityType: ActivityType;

  @IsDateString()
  activityDate: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsBoolean()
  isDone?: boolean;
}
