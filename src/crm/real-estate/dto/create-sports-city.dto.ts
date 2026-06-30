import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSportsCityDto {
  @IsString()
  @MaxLength(255)
  name: string; // اسم المدينة الرياضية

  @IsOptional()
  @IsString()
  description?: string; // وصف المدينة الرياضية

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
