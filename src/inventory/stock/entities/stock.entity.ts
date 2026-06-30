export enum StockStatus {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export class Stock {
  id: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  reorderLevel?: number | null;
  threshold?: number; // The threshold used for status calculation (reorderLevel or minStockAlert)
  status?: StockStatus; // Stock status based on quantity vs threshold
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;

  // العلاقات (اختيارية)
  product?: {
    id: number;
    name: string;
    barcode: string;
    salesUnit?: {
      id: number;
      name: string;
      symbol?: string | null;
    } | null;
    purchaseUnit?: {
      id: number;
      name: string;
      symbol?: string | null;
    } | null;
    purchasePrice?: number | null;
    salePrice?: number | null;
    minStockAlert?: number | null;
  };

  warehouse?: {
    id: number;
    name: string;
    location?: string | null;
  };

  trackings?: any[];
  baseUnit?: {
    id: number;
    name: string;
    symbol?: string | null;
    type: string;
    ratio: number;
  } | null;

  constructor(partial: Partial<Stock>) {
    Object.assign(this, partial);
  }
}
