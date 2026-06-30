import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateCurrencyDto {
  @IsString()
  @IsNotEmpty()
  name: string; // e.g., "US Dollar", "Iraqi Dinar", "Euro"

  @IsString()
  @IsNotEmpty()
  code: string; // e.g., "USD", "IQD", "EUR"

  @IsString()
  @IsNotEmpty()
  symbol: string; // e.g., "$", "د.ع", "€"

  @IsNumber()
  @Type(() => Number)
  @Min(0.0001)
  rate: number; // Exchange rate relative to main currency

  @IsOptional()
  @IsBoolean()
  isMain?: boolean; // Only one currency can be main

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(10)
  decimalPlaces?: number; // Number of decimal places for this currency

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
