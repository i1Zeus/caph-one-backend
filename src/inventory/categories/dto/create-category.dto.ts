import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'اسم الفئة يجب أن يكون أطول من حرفين' })
  @MaxLength(255, { message: 'اسم الفئة يجب أن يكون أقصر من 255 حرف' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'وصف الفئة يجب أن يكون أقصر من 1000 حرف' })
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
