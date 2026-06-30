import { PartnerType } from '@prisma/client';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  img?: string;
  // role field removed - now using userRoles relation
  type?: PartnerType;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
