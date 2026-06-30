import { IsInt, IsOptional, IsString } from 'class-validator';

export class GenerateSalarySlipsDto {
  @IsString()
  workspaceId: string;

  @IsInt()
  year: number;

  @IsInt()
  month: number;

  @IsString()
  paidById: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  encryptionKey?: string;
}
