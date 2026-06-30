import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateFileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  originalName?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
