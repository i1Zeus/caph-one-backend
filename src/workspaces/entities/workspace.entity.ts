export class Workspace {
  id: string;
  name: string;
  description?: string;
  slug: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class WorkspaceUser {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  joinedAt: Date;
}
