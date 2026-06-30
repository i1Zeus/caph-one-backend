export class PropertyGroup {
  id: number;
  name: string;
  description: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  properties?: any[]; // Array of properties in this group
}
