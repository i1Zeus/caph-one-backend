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

export class UpdatePaymentSplitDto {
  @IsNumber()
  @Type(() => Number)
  amount: number; // المبلغ لهذه الطريقة

  @IsEnum(PaymentType)
  paymentType: PaymentType; // طريقة الدفع

  @IsNumber()
  @Type(() => Number)
  accountId: number; // الحساب الذي سيدفع منه (صندوق أو بنك)

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  invoiceConfigId?: number; // معرف تكوين الفاتورة المحاسبي
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  supplierId?: number; // المورد الذي سيتم الدفع له

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  purchaseInvoiceId?: number; // الفاتورة المرتبطة (اختياري - يمكن إزالتها بإرسال null)

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePaymentSplitDto)
  payments?: UpdatePaymentSplitDto[]; // تقسيمات الدفع
}
