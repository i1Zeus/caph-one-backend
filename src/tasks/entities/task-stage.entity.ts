export class TaskStage {
  id: string;
  name: string;
  description?: string;
  order: number;
  color?: string;
  projectId: string;
  isDefault: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
