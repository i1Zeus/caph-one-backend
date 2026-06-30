import { ProductType } from '@prisma/client';
import { ProductCategory } from '../../categories/entities/category.entity';
import { Unit } from '../../units/entities/unit.entity';

export class Product {
  id: number;
  name: string;
  barcode: string;
  description?: string | null;
  type: ProductType; // نوع المنتج
  salesUnitId?: number | null;
  purchaseUnitId?: number | null;
  salesUnit?: Unit;
  purchaseUnit?: Unit;
  purchasePrice?: number | null;
  salePrice?: number | null;
  minStockAlert?: number | null;
  imageUrl?: string | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  categories?: ProductCategory[];

  constructor(partial: Partial<Product>) {
    Object.assign(this, partial);
  }
}
