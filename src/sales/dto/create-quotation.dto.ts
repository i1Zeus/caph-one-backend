export class QuotationItemDto {
  productId: number;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: 'FIXED' | 'PERCENTAGE';
}

export class CreateQuotationDto {
  clientId?: number;
  warehouseId: number;
  items: QuotationItemDto[];
  validityDate?: string; // ISO date string
  taxRate?: number; // percentage, default 0
  discount?: number;
  discountType?: 'FIXED' | 'PERCENTAGE';
  notes?: string;
}
