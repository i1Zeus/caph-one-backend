import {
  DiscountType,
  InvoiceStatus,
  PaymentType,
  PrintFormat,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
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

export class CreateSalesInvoiceItemDto {
  @IsNumber()
  @Type(() => Number)
  productId: number; // معرف المنتج

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  unitId?: number; // معرف الوحدة (اختياري)

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  trackingId?: number; // معرف التتبع (اختياري)

  @IsNumber()
  @Type(() => Number)
  quantity: number; // الكمية

  @IsNumber()
  @Type(() => Number)
  unitPrice: number; // سعر الوحدة
}

export class CreateSalesInvoiceDto {
  @IsOptional()
  @IsString()
  invoiceNumber?: string; // رقم الفاتورة (اختياري - سيتم توليده تلقائياً إذا لم يتم تحديده)

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  clientId?: number; // العميل (اختياري - يمكن أن يكون null للعملاء غير المحددين)

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  warehouseId?: number; // المخزن (اختياري - مطلوب فقط عند وجود أصناف)

  @IsNumber()
  @Type(() => Number)
  totalAmount: number; // المبلغ الإجمالي

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  paidAmount?: number; // المبلغ المدفوع (legacy - use payments array instead)

  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType; // طريقة الدفع (legacy - use payments array instead)

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentSplitDto)
  payments?: PaymentSplitDto[]; // تقسيمات الدفع (طريقة جديدة)

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus; // حالة الفاتورة (افتراضي UNPAID)

  @IsOptional()
  @IsString()
  description?: string; // وصف الفاتورة

  @IsOptional()
  @IsString()
  notes?: string; // ملاحظات

  @IsOptional()
  @IsDateString()
  dueDate?: string; // تاريخ الاستحقاق

  @IsOptional()
  @IsDateString()
  invoiceDate?: string; // تاريخ الفاتورة (افتراضي اليوم)

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  currencyId?: number; // Optional currency ID - if not provided, will use main currency

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  invoiceConfigId?: number; // معرف تكوين الفاتورة المحاسبي (اختياري - إذا لم يُحدد، لن يتم إنشاء قيود محاسبية)

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesInvoiceItemDto)
  items?: CreateSalesInvoiceItemDto[]; // أصناف الفاتورة (اختياري)

  // POS Integration Fields
  @IsOptional()
  @IsBoolean()
  isPOS?: boolean; // هل هذه معاملة من نقطة البيع

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  posSessionId?: number; // معرف جلسة نقطة البيع

  @IsOptional()
  @IsString()
  cashierId?: string; // معرف الموظف (الكاشير)

  @IsOptional()
  @IsEnum(PrintFormat)
  printFormat?: PrintFormat; // تنسيق الطباعة

  // Discount Fields
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discount?: number; // قيمة الخصم

  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType; // نوع الخصم (FIXED أو PERCENTAGE)

  // Return Invoice Fields
  @IsOptional()
  @IsBoolean()
  isReturn?: boolean; // هل هذه فاتورة إرجاع

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  originalInvoiceId?: number; // معرف الفاتورة الأصلية في حالة الإرجاع
}
