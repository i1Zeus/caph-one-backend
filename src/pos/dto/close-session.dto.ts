import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseSessionDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  closingBalance: number;

  @IsString()
  @IsOptional()
  closingNotes?: string;
}
