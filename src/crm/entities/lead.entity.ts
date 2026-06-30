import { LeadStatus, Lead as PrismaLead } from '@prisma/client';

export class Lead implements PrismaLead {
  id: string;
  name: string;
  order: number | null;
  email: string | null;
  phone: string | null;
  description: string | null;
  companyName: string | null;
  industry: string | null;
  website: string | null;
  source: string | null;
  salesManId: string | null;
  employeeCount: number | null;
  revenue: number | null;
  status: LeadStatus;
  isCompany: boolean;
  workspaceId: string;
  stageId: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
