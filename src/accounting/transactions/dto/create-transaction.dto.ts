import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class TransactionLineDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  debit: number;

  @IsNumber()
  @Type(() => Number)
  credit: number;

  @IsNumber()
  @Type(() => Number)
  accountId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  clientId?: number;
}

export class CreateTransactionDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  clientId?: number;

  @IsArray()
  @ArrayMinSize(2) // على الأقل سطرين للمعاملة المحاسبية
  @ValidateNested({ each: true })
  @Type(() => TransactionLineDto)
  entries: TransactionLineDto[];

  // ربط مع الفواتير (اختياري)
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  salesInvoiceId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  purchaseInvoiceId?: number;
}
