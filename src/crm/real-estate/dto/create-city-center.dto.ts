import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCityCenterDto {
  @IsString()
  @MaxLength(255)
  name: string; // اسم مركز المدينة

  @IsOptional()
  @IsString()
  description?: string; // وصف مركز المدينة

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string; // المدينة

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string; // الحي/المنطقة

  @IsOptional()
  @IsString()
  address?: string; // العنوان
}
