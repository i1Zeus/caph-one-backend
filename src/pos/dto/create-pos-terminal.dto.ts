import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export enum PrintFormat {
  RECEIPT = 'RECEIPT',
  A5 = 'A5',
  A4 = 'A4',
}

export class CreatePosTerminalDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(PrintFormat)
  @IsOptional()
  printFormat?: PrintFormat;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
