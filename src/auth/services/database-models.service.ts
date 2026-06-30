import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface DatabaseModel {
  name: string;
  displayName: string;
  description?: string;
}

@Injectable()
export class DatabaseModelsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all database models dynamically from Prisma
   */
  async getAllModels(): Promise<DatabaseModel[]> {
    // Get all model names from Prisma's DMMF (Data Model Meta Format)
    let models: readonly any[] = [];

    try {
      // Try different ways to access DMMF
      const dmmf = (this.prisma as any)._dmmf;

      if (dmmf?.datamodel?.models) {
        models = dmmf.datamodel.models;
      } else {
        // Fallback: Try using Prisma.dmmf if available
        if (Prisma.dmmf?.datamodel?.models) {
          models = Prisma.dmmf.datamodel.models;
        } else {
          // Fallback to hardcoded list of key models from schema
          const hardcodedModels = [
            'User',
            'Role',
            'Permission',
            'UserRole',
            'RolePermission',
            'Project',
            'ProjectStage',
            'Task',
            'TaskStage',
            'Comment',
            'Workspace',
            'WorkspaceUser',
            'Lead',
            'Employee',
            'Account',
            'Transaction',
            'Invoice',
            'Client',
            'File',
          ];
          models = hardcodedModels.map((name) => ({ name }));
        }
      }
    } catch {
      // Ultimate fallback
      const fallbackModels = [
        'User',
        'Role',
        'Permission',
        'Project',
        'Task',
        'Workspace',
        'Lead',
        'Employee',
        'Account',
        'Transaction',
        'Invoice',
        'File',
      ];
      models = fallbackModels.map((name) => ({ name }));
    }

    return models.map((model: any) => ({
      name: model.name.toLowerCase(),
      displayName: this.formatDisplayName(model.name),
      description: this.getModelDescription(model.name),
    }));
  }

  /**
   * Get all available actions for permissions
   */
  getAvailableActions(): string[] {
    return ['create', 'read', 'update', 'delete'];
  }

  /**
   * Generate all possible permissions for all models
   */
  async generateAllPermissions(): Promise<
    Array<{
      name: string;
      description: string;
      resource: string;
      action: string;
    }>
  > {
    const models = await this.getAllModels();
    const actions = this.getAvailableActions();
    const permissions = [];

    for (const model of models) {
      for (const action of actions) {
        permissions.push({
          name: `${model.name}:${action}`,
          description: `${this.capitalizeFirst(action)} ${model.displayName}`,
          resource: model.name,
          action,
        });
      }
    }

    // Add special system permissions
    permissions.push(
      {
        name: 'admin:all',
        description: 'Full administrative access',
        resource: 'admin',
        action: 'all',
      },
      {
        name: 'reports:view',
        description: 'View reports',
        resource: 'reports',
        action: 'view',
      },
      {
        name: 'settings:manage',
        description: 'Manage system settings',
        resource: 'settings',
        action: 'manage',
      },
      {
        name: 'audit:view',
        description: 'View audit logs',
        resource: 'audit',
        action: 'view',
      },
    );

    return permissions;
  }

  /**
   * Seed all permissions for all models dynamically
   */
  async seedAllModelPermissions(): Promise<void> {
    const permissions = await this.generateAllPermissions();

    await this.prisma.permission.createMany({
      data: permissions,
      skipDuplicates: true,
    });

    console.log(
      `✅ Seeded ${permissions.length} permissions for ${(await this.getAllModels()).length} models`,
    );
  }

  /**
   * Get permissions grouped by model
   */
  async getPermissionsByModel(): Promise<Record<string, any[]>> {
    const models = await this.getAllModels();
    const actions = this.getAvailableActions();
    const result: Record<string, any[]> = {};

    // Get all existing permissions from database
    const existingPermissions = await this.prisma.permission.findMany({
      where: { isDeleted: false },
    });

    // Group by model
    for (const model of models) {
      result[model.name] = actions.map((action) => {
        const permissionName = `${model.name}:${action}`;
        const existingPermission = existingPermissions.find(
          (p) => p.name === permissionName,
        );

        return {
          id: existingPermission?.id,
          name: permissionName,
          action,
          description: `${this.capitalizeFirst(action)} ${model.displayName}`,
          exists: !!existingPermission,
        };
      });
    }

    // Add special permissions
    const specialPermissions = [
      { resource: 'admin', actions: ['all'] },
      { resource: 'reports', actions: ['view'] },
      { resource: 'settings', actions: ['manage'] },
      { resource: 'audit', actions: ['view'] },
    ];

    for (const special of specialPermissions) {
      result[special.resource] = special.actions.map((action) => {
        const permissionName = `${special.resource}:${action}`;
        const existingPermission = existingPermissions.find(
          (p) => p.name === permissionName,
        );

        return {
          id: existingPermission?.id,
          name: permissionName,
          action,
          description: `${this.capitalizeFirst(action)} ${this.formatDisplayName(special.resource)}`,
          exists: !!existingPermission,
        };
      });
    }

    return result;
  }

  /**
   * Format model name for display
   */
  private formatDisplayName(modelName: string): string {
    // Convert PascalCase to Title Case
    return modelName
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/^./, (str) => str.toUpperCase());
  }

  /**
   * Get description for a model
   */
  private getModelDescription(modelName: string): string {
    const descriptions: Record<string, string> = {
      User: 'System users and authentication',
      Role: 'User roles and permissions',
      Permission: 'System permissions',
      Project: 'Project management',
      Task: 'Task management',
      Workspace: 'Workspace organization',
      Lead: 'CRM leads and prospects',
      Employee: 'HR employee records',
      Account: 'Accounting chart of accounts',
      Transaction: 'Financial transactions',
      Invoice: 'Sales and purchase invoices',
      Client: 'Customer and vendor records',
      File: 'File attachments',
      Comment: 'Comments and notes',
    };

    return (
      descriptions[modelName] ||
      `Manage ${this.formatDisplayName(modelName).toLowerCase()}`
    );
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
