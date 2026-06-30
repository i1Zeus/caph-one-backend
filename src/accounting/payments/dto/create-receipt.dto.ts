import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateReceiptDto {
  @IsNumber()
  @Type(() => Number)
  clientId: number; // العميل الذي سيدفع

  @IsNumber()
  @Type(() => Number)
  amount: number; // المبلغ المقبوض

  @IsNumber()
  @Type(() => Number)
  toAccountId: number; // الحساب الذي سيستلم المال (صندوق أو بنك)

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
