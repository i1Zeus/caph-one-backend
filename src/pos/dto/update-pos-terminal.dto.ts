import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PrintFormat } from './create-pos-terminal.dto';

export class UpdatePosTerminalDto {
  @IsString()
  @IsOptional()
  name?: string;

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
