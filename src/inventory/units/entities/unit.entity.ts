import { UnitType } from '@prisma/client';
import { UnitCategory } from './unit-category.entity';

export class Unit {
  id: number;
  name: string;
  symbol?: string | null;
  description?: string | null;
  categoryId: number;
  category?: UnitCategory;
  type: UnitType;
  ratio: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Unit>) {
    Object.assign(this, partial);
    // Convert Decimal to number for ratio
    if (partial.ratio) {
      this.ratio = Number(partial.ratio);
    }
  }
}

// Re-export the Prisma enum for convenience
export { UnitType };
