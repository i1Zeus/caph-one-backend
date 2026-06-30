export class ProductCategory {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  products?: any[];

  constructor(partial: Partial<ProductCategory>) {
    Object.assign(this, partial);
  }
}
