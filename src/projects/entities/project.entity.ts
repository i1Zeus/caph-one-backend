export class Project {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  ownerId: string;
  projectStageId?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
