import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogData {
  actionType: string; // CREATE, UPDATE, DELETE, ASSIGN, etc
  entityType: string; // USER, PROJECT, TASK, STAGE, etc
  entityId: string; // ID of the affected entity
  details?: any; // Extra info about the action (changes, old values, etc)
  performedBy?: string; // User ID who performed the action
  metadata?: {
    oldValues?: any;
    newValues?: any;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
    workspaceSlug?: string; // For generating workspace-specific links
    projectId?: string; // For task links that need project context
  };
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService, private tenantPrisma: TenantPrismaService) {}

  /**
   * Generate navigation link based on entity type and action
   */
  private generateNavigationLink(
    entityType: string,
    entityId: string,
    actionType: string,
    metadata?: any,
  ): string | null {
    const normalizedEntityType = entityType.toUpperCase();
    const normalizedActionType = actionType.toUpperCase();

    switch (normalizedEntityType) {
      case 'TASK':
        if (normalizedActionType === 'DELETE') return null;
        return `/tasks/${entityId}`;

      case 'PROJECT':
        if (normalizedActionType === 'DELETE') return null;
        return `/projects/${entityId}`;

      case 'USER':
        // Users page doesn't have individual view routes in the current structure
        return null;

      case 'WORKSPACE':
        if (normalizedActionType === 'DELETE') return null;
        // Need workspace slug for proper navigation
        if (metadata?.workspaceSlug) {
          return `/workspaces/${metadata.workspaceSlug}`;
        }
        return null;

      case 'LEAD':
        if (normalizedActionType === 'DELETE') return null;
        if (normalizedActionType === 'CREATE') {
          return '/crm'; // Redirect to CRM list for newly created leads
        }
        return `/crm/edit/${entityId}`;

      case 'COMMENT':
        // Comments belong to tasks, so link to the parent task
        if (metadata?.projectId && metadata?.taskId) {
          return `/tasks/${metadata.taskId}`;
        }
        return null;

      case 'TASKSTAGE':
      case 'PROJECTSTAGE':
      case 'LEADSTAGE':
        // Stages don't have individual pages, link to their parent entity
        if (normalizedEntityType === 'TASKSTAGE' && metadata?.projectId) {
          return `/projects/${metadata.projectId}/tasks`;
        }
        if (
          normalizedEntityType === 'PROJECTSTAGE' &&
          metadata?.workspaceSlug
        ) {
          return `/projects`;
        }
        if (normalizedEntityType === 'LEADSTAGE') {
          return '/crm';
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * Log an audit entry to ActionHistory
   */
  async logAction(data: AuditLogData): Promise<void> {
    try {
      // Generate navigation link automatically
      const link = this.generateNavigationLink(
        data.entityType,
        data.entityId,
        data.actionType,
        data.metadata,
      );

      await this.tenantPrisma.client.actionHistory.create({
        data: {
          actionType: data.actionType,
          entityType: data.entityType,
          entityId: data.entityId.toString(), // تحويل إلى string
          details: data.details || data.metadata || {},
          performedBy: data.performedBy,
          link: link, // Use the generated link
        },
      });
    } catch (error) {
      // Log error but don't throw to avoid breaking the main operation
      console.error('Failed to log audit entry:', error);
    }
  }

  /**
   * Log CREATE operations
   */
  async logCreate(
    entityType: string,
    entityId: string,
    data: any,
    performedBy?: string,
    metadata?: any,
  ): Promise<void> {
    await this.logAction({
      actionType: 'CREATE',
      entityType: entityType.toUpperCase(),
      entityId,
      details: { data },
      performedBy,
      metadata,
    });
  }

  /**
   * Log UPDATE operations with old and new values
   */
  async logUpdate(
    entityType: string,
    entityId: string,
    oldValues: any,
    newValues: any,
    performedBy?: string,
    metadata?: any,
  ): Promise<void> {
    const changes = this.calculateChanges(oldValues, newValues);

    await this.logAction({
      actionType: 'UPDATE',
      entityType: entityType.toUpperCase(),
      entityId,
      details: {
        changes,
        oldValues,
        newValues,
      },
      performedBy,
      metadata,
    });
  }

  /**
   * Log DELETE operations
   */
  async logDelete(
    entityType: string,
    entityId: string,
    deletedData: any,
    performedBy?: string,
    metadata?: any,
  ): Promise<void> {
    await this.logAction({
      actionType: 'DELETE',
      entityType: entityType.toUpperCase(),
      entityId,
      details: { deletedData },
      performedBy,
      metadata,
    });
  }

  /**
   * Log ASSIGN operations (for task assignments, role changes, etc.)
   */
  async logAssign(
    entityType: string,
    entityId: string,
    assignmentDetails: any,
    performedBy?: string,
    metadata?: any,
  ): Promise<void> {
    await this.logAction({
      actionType: 'ASSIGN',
      entityType: entityType.toUpperCase(),
      entityId,
      details: assignmentDetails,
      performedBy,
      metadata,
    });
  }

  /**
   * Log custom actions
   */
  async logCustomAction(
    actionType: string,
    entityType: string,
    entityId: string,
    details: any,
    performedBy?: string,
    metadata?: any,
  ): Promise<void> {
    await this.logAction({
      actionType: actionType.toUpperCase(),
      entityType: entityType.toUpperCase(),
      entityId,
      details,
      performedBy,
      metadata,
    });
  }

  /**
   * Calculate changes between old and new values
   */
  private calculateChanges(oldValues: any, newValues: any): any {
    const changes: any = {};

    // Compare primitive values and arrays
    Object.keys(newValues).forEach((key) => {
      if (oldValues[key] !== newValues[key]) {
        changes[key] = {
          from: oldValues[key],
          to: newValues[key],
        };
      }
    });

    return changes;
  }

  /**
   * Get audit history for a specific entity
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
    limit: number = 50,
  ) {
    return this.tenantPrisma.client.actionHistory.findMany({
      where: {
        entityType: entityType.toUpperCase(),
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get audit history for a specific action type
   */
  async getActionHistory(actionType: string, limit: number = 100) {
    return this.tenantPrisma.client.actionHistory.findMany({
      where: {
        actionType: actionType.toUpperCase(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get audit history for a specific entity type
   */
  async getEntityTypeHistory(entityType: string, limit: number = 100) {
    return this.tenantPrisma.client.actionHistory.findMany({
      where: {
        entityType: entityType.toUpperCase(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get recent audit history across all entities
   */
  async getRecentHistory(limit: number = 100) {
    return this.tenantPrisma.client.actionHistory.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalActions, actionsByType, actionsByEntity, topUsers] =
      await Promise.all([
        // Total actions in the period
        this.tenantPrisma.client.actionHistory.count({
          where: {
            createdAt: {
              gte: startDate,
            },
          },
        }),

        // Actions grouped by type
        this.tenantPrisma.client.actionHistory.groupBy({
          by: ['actionType'],
          where: {
            createdAt: {
              gte: startDate,
            },
          },
          _count: {
            id: true,
          },
        }),

        // Actions grouped by entity type
        this.tenantPrisma.client.actionHistory.groupBy({
          by: ['entityType'],
          where: {
            createdAt: {
              gte: startDate,
            },
          },
          _count: {
            id: true,
          },
        }),

        // Top users by activity
        this.tenantPrisma.client.actionHistory.groupBy({
          by: ['performedBy'],
          where: {
            createdAt: {
              gte: startDate,
            },
            performedBy: {
              not: null,
            },
          },
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
          take: 10,
        }),
      ]);

    return {
      totalActions,
      actionsByType: actionsByType.map((item) => ({
        actionType: item.actionType,
        count: item._count.id,
      })),
      actionsByEntity: actionsByEntity.map((item) => ({
        entityType: item.entityType,
        count: item._count.id,
      })),
      topUsers: topUsers.map((item) => ({
        userId: item.performedBy,
        count: item._count.id,
      })),
    };
  }
}
