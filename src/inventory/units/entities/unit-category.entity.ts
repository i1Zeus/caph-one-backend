import { Unit } from './unit.entity';

export class UnitCategory {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  units?: Unit[];

  constructor(partial: Partial<UnitCategory>) {
    Object.assign(this, partial);
  }
}
