import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenSessionDto {
  @IsInt()
  @Type(() => Number)
  posId: number;

  @IsString()
  employeeId: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  openingBalance: number;

  @IsString()
  @IsOptional()
  openingNotes?: string;
}
