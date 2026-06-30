import { PaymentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PaymentSplitDto {
  @IsNumber()
  @Type(() => Number)
  amount: number; // المبلغ لهذه الطريقة

  @IsEnum(PaymentType)
  paymentType: PaymentType; // طريقة الدفع

  @IsNumber()
  @Type(() => Number)
  accountId: number; // الحساب الذي سيدفع منه (صندوق أو بنك)
}

export class CreatePaymentDto {
  @IsNumber()
  @Type(() => Number)
  supplierId: number; // المورد الذي سيتم الدفع له

  // Support both old single payment and new payment splits
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number; // المبلغ المدفوع (legacy - use payments array instead)

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  fromAccountId?: number; // الحساب الذي سيدفع منه (legacy - use payments array instead)

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentSplitDto)
  payments?: PaymentSplitDto[]; // تقسيمات الدفع (طريقة جديدة)

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  purchaseInvoiceId?: number; // الفاتورة المرتبطة (اختياري)

  @IsOptional()
  @IsDateString()
  date?: string; // تاريخ الدفع

  @IsOptional()
  @IsString()
  description?: string; // وصف الدفع

  @IsOptional()
  @IsString()
  notes?: string; // ملاحظات

  @IsOptional()
  @IsString()
  reference?: string; // رقم مرجعي
}
