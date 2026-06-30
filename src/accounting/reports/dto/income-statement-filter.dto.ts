import { IsDateString, IsOptional } from 'class-validator';

export class IncomeStatementFilterDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
