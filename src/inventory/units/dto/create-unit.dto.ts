import { UnitType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export { UnitType };

export class CreateUnitDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  categoryId: number;

  @IsOptional()
  @IsEnum(UnitType)
  type?: UnitType = UnitType.MAIN;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0.000001)
  ratio?: number = 1.0;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
