import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateActivityDto } from './create-activity.dto';

export class UpdateActivityDto extends PartialType(CreateActivityDto) {
  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsBoolean()
  isDone?: boolean;
}
