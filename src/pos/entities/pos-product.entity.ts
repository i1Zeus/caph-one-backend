export class POSProduct {
  id: number;
  name: string;
  barcode?: string;
  salePrice: number;
  purchasePrice?: number;
  description?: string;
  type: string;
  isActive: boolean;
  imageUrl?: string;
  salesUnit?: {
    id: number;
    name: string;
  };
  purchaseUnit?: {
    id: number;
    name: string;
  };
  // Stock information from all warehouses
  stock: {
    warehouseId: number;
    warehouseName: string;
    availableQuantity: number;
    trackings: {
      id: number;
      quantity: number;
      expiryDate?: Date;
      batchNumber?: string;
    }[];
  }[];
  totalStock: number;
}
