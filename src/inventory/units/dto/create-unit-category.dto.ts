import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateUnitCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
