export class WarehouseTransactionItem {
  id: number;
  transactionId: number;
  productId: number;
  quantity: number;
  unitPrice?: number | null;
  totalPrice?: number | null;
  itemNote?: string | null;
  createdAt: Date;
  updatedAt: Date;

  product?: {
    id: number;
    name: string;
    barcode: string;
    unit: {
      id: number;
      name: string;
      symbol?: string | null;
    };
    purchasePrice?: number | null;
    salePrice?: number | null;
  };

  constructor(partial: Partial<WarehouseTransactionItem>) {
    Object.assign(this, partial);
  }
}

export class WarehouseTransaction {
  id: number;
  type: string;
  fromWarehouseId?: number | null;
  toWarehouseId?: number | null;
  totalPrice?: number | null;
  note?: string | null;
  partyName?: string | null;
  referenceNumber?: string | null;
  userId?: string | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;

  // أصناف المعاملة
  items?: WarehouseTransactionItem[];

  // العلاقات (اختيارية)
  fromWarehouse?: {
    id: number;
    name: string;
    location?: string | null;
  } | null;

  toWarehouse?: {
    id: number;
    name: string;
    location?: string | null;
  } | null;

  constructor(partial: Partial<WarehouseTransaction>) {
    Object.assign(this, partial);
  }
}
