export class Warehouse {
  id: number;
  name: string;
  parentId?: number | null;
  // departmentId?: number | null; // Removed - departments not in current schema
  location?: string | null;
  description?: string | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  // العلاقات (اختيارية)
  parent?: Warehouse | null;
  children?: Warehouse[];
  // department?: { // Removed - departments not in current schema
  //   id: number;
  //   name: string;
  // } | null;

  constructor(partial: Partial<Warehouse>) {
    Object.assign(this, partial);
  }
}
