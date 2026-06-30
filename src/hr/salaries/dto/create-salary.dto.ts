import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSalaryDto {
  @IsString()
  employeeId: string;

  @IsString()
  amount: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsInt()
  currentYear: number;

  @IsInt()
  currentMonth: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isSalaryGet?: boolean;

  @IsOptional()
  @IsString()
  paidById?: string;

  @IsOptional()
  @IsString()
  encryptionKey?: string;
}
