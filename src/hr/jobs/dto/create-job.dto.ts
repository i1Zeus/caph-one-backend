import { IsOptional, IsString } from 'class-validator';

export class CreateJobDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
