export class DirectSaleItemDto {
  productId: number;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: 'FIXED' | 'PERCENTAGE';
}

export class CreateDirectSaleDto {
  clientId?: number;
  warehouseId: number;
  items: DirectSaleItemDto[];
  paymentMethod?: string; // cash, card, transfer
  paymentStatus?: 'PENDING' | 'PAID' | 'PARTIAL_PAYMENT';
  taxRate?: number; // percentage, default 0
  discount?: number;
  discountType?: 'FIXED' | 'PERCENTAGE';
  notes?: string;
}
