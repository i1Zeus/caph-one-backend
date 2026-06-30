import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePropertyGroupDto {
  @IsString()
  @MaxLength(255)
  name: string; // اسم المجموعة

  @IsOptional()
  @IsString()
  description?: string; // وصف المجموعة

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
