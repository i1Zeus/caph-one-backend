import { LeadStage as PrismaLeadStage } from '@prisma/client';

export class LeadStage implements PrismaLeadStage {
  id: string;
  name: string;
  description: string | null;
  order: number | null;
  color: string | null;
  workspaceId: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
