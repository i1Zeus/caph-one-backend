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
  accountId: number; // الحساب الذي سيستلم المال (صندوق أو بنك)
}

export class CreateReceiptDto {
  @IsNumber()
  @Type(() => Number)
  clientId: number; // العميل الذي سيدفع

  // Support both old single payment and new payment splits
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number; // المبلغ المقبوض (legacy - use payments array instead)

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  toAccountId?: number; // الحساب الذي سيستلم المال (legacy - use payments array instead)

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentSplitDto)
  payments?: PaymentSplitDto[]; // تقسيمات الدفع (طريقة جديدة)

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  salesInvoiceId?: number; // الفاتورة المرتبطة (اختياري)

  @IsOptional()
  @IsDateString()
  date?: string; // تاريخ المقبوض

  @IsOptional()
  @IsString()
  description?: string; // وصف المقبوض

  @IsOptional()
  @IsString()
  notes?: string; // ملاحظات

  @IsOptional()
  @IsString()
  reference?: string; // رقم مرجعي
}
