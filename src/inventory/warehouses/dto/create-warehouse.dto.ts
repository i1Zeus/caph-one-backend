import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  parentId?: number;

  // Note: Department functionality removed as departments are not in current schema
  // @IsOptional()
  // @IsNumber()
  // @IsPositive()
  // departmentId?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
