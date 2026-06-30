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

export class UpdateReceiptSplitDto {
  @IsNumber()
  @Type(() => Number)
  amount: number; // المبلغ لهذه الطريقة

  @IsEnum(PaymentType)
  paymentType: PaymentType; // طريقة الدفع

  @IsNumber()
  @Type(() => Number)
  accountId: number; // الحساب الذي سيستلم المال

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  invoiceConfigId?: number; // معرف تكوين الفاتورة المحاسبي
}

export class UpdateReceiptDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  clientId?: number; // العميل

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  salesInvoiceId?: number; // الفاتورة المرتبطة (اختياري - يمكن إزالتها بإرسال null)

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateReceiptSplitDto)
  payments?: UpdateReceiptSplitDto[]; // تقسيمات الدفع
}
