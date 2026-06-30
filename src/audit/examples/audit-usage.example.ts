import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit.service';

@Injectable()
export class AuditUsageExampleService {
  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Example: Creating a project with audit trail and navigation link
   */
  async createProjectExample(
    projectData: any,
    userId: string,
    workspaceSlug: string,
  ) {
    // Create the project
    const project = await this.prisma.project.create({
      data: {
        ...projectData,
        ownerId: userId,
      },
      include: {
        workspace: true,
        owner: true,
      },
    });

    // Log the creation with metadata for link generation
    await this.auditService.logCreate(
      'PROJECT',
      project.id,
      {
        name: project.name,
        description: project.description,
        ownerId: project.ownerId,
        workspaceId: project.workspaceId,
      },
      userId,
      {
        workspaceSlug: workspaceSlug,
        workspaceId: project.workspaceId,
      },
    );

    // The audit service will automatically generate: `/projects/${project.id}`
    return project;
  }

  /**
   * Example: Creating a task with audit trail and navigation link
   */
  async createTaskExample(taskData: any, userId: string, projectId: string) {
    // Create the task
    const task = await this.prisma.task.create({
      data: {
        ...taskData,
        projectId,
        createdById: userId,
      },
      include: {
        project: {
          include: {
            workspace: true,
          },
        },
        assignees: true,
      },
    });

    // Log the creation with metadata for link generation
    await this.auditService.logCreate(
      'TASK',
      task.id,
      {
        title: task.title,
        description: task.description,
        projectId: task.projectId,
        assignees: task.assignees.map((a) => a.id),
      },
      userId,
      {
        projectId: task.projectId,
        workspaceId: task.project.workspaceId,
        workspaceSlug: task.project.workspace?.slug,
      },
    );

    // The audit service will automatically generate: `/tasks/${task.id}`
    return task;
  }

  /**
   * Example: Updating a task with audit trail and navigation link
   */
  async updateTaskExample(taskId: string, updateData: any, userId: string) {
    // Get the old task data
    const oldTask = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            workspace: true,
          },
        },
        assignees: true,
      },
    });

    if (!oldTask) {
      throw new Error('Task not found');
    }

    // Update the task
    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        project: {
          include: {
            workspace: true,
          },
        },
        assignees: true,
      },
    });

    // Log the update with old and new values
    await this.auditService.logUpdate(
      'TASK',
      taskId,
      {
        title: oldTask.title,
        description: oldTask.description,
        status: oldTask.status,
        priority: oldTask.priority,
      },
      {
        title: updatedTask.title,
        description: updatedTask.description,
        status: updatedTask.status,
        priority: updatedTask.priority,
      },
      userId,
      {
        projectId: updatedTask.projectId,
        workspaceId: updatedTask.project.workspaceId,
        workspaceSlug: updatedTask.project.workspace?.slug,
      },
    );

    // The audit service will automatically generate: `/tasks/${taskId}`
    return updatedTask;
  }

  /**
   * Example: Creating a lead with audit trail and navigation link
   */
  async createLeadExample(
    leadData: any,
    userId: string,
    workspaceSlug: string,
  ) {
    // Create the lead
    const lead = await this.prisma.lead.create({
      data: {
        ...leadData,
      },
      include: {
        workspace: true,
        stage: true,
      },
    });

    // Log the creation
    await this.auditService.logCreate(
      'LEAD',
      lead.id,
      {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        companyName: lead.companyName,
        workspaceId: lead.workspaceId,
      },
      userId,
      {
        workspaceSlug: workspaceSlug,
        workspaceId: lead.workspaceId,
        stageId: lead.stageId,
      },
    );

    // For CREATE action, the audit service will generate: `/crm`
    // For UPDATE action, it would generate: `/crm/edit/${lead.id}`
    return lead;
  }

  /**
   * Example: Adding a comment with audit trail and navigation link
   */
  async addCommentExample(commentData: any, userId: string, taskId: string) {
    // Get task info for metadata
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Create the comment
    const comment = await this.prisma.comment.create({
      data: {
        ...commentData,
        taskId,
        authorId: userId,
      },
      include: {
        author: true,
        task: true,
      },
    });

    // Log the comment creation
    await this.auditService.logCreate(
      'COMMENT',
      comment.id,
      {
        content: comment.content,
        taskId: comment.taskId,
        authorId: comment.authorId,
      },
      userId,
      {
        taskId: taskId,
        projectId: task.projectId,
        workspaceId: task.project.workspaceId,
        workspaceSlug: task.project.workspace?.slug,
      },
    );

    // The audit service will automatically generate: `/tasks/${taskId}`
    return comment;
  }

  /**
   * Example: Workspace operations with audit trail and navigation link
   */
  async updateWorkspaceExample(
    workspaceId: string,
    updateData: any,
    userId: string,
  ) {
    // Get the old workspace data
    const oldWorkspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!oldWorkspace) {
      throw new Error('Workspace not found');
    }

    // Update the workspace
    const updatedWorkspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: updateData,
    });

    // Log the update
    await this.auditService.logUpdate(
      'WORKSPACE',
      workspaceId,
      {
        name: oldWorkspace.name,
        description: oldWorkspace.description,
        slug: oldWorkspace.slug,
      },
      {
        name: updatedWorkspace.name,
        description: updatedWorkspace.description,
        slug: updatedWorkspace.slug,
      },
      userId,
      {
        workspaceSlug: updatedWorkspace.slug,
        workspaceId: updatedWorkspace.id,
      },
    );

    // The audit service will automatically generate: `/workspaces/${updatedWorkspace.slug}`
    return updatedWorkspace;
  }

  /**
   * Example: Manual audit logging with custom links
   */
  async customAuditExample(userId: string) {
    // Log a custom action with manual link generation
    await this.auditService.logCustomAction(
      'EXPORT_DATA',
      'PROJECT',
      'project-123',
      {
        exportType: 'CSV',
        recordCount: 150,
        filters: { status: 'ACTIVE' },
      },
      userId,
      {
        projectId: 'project-123',
        // Custom metadata that could influence link generation
        exportPath: '/downloads/project-data.csv',
      },
    );

    // The audit service will automatically generate: `/projects/project-123`
  }

  /**
   * Example: Get audit history with links for a specific entity
   */
  async getEntityAuditHistory(
    entityType: string,
    entityId: string,
    limit: number = 50,
  ) {
    return this.auditService.getEntityHistory(entityType, entityId, limit);
  }

  /**
   * Example: Get recent audit history with links
   */
  async getRecentAuditHistory(limit: number = 100) {
    return this.auditService.getRecentHistory(limit);
  }

  /**
   * Example: Get audit statistics
   */
  async getAuditStatistics(days: number = 30) {
    return this.auditService.getAuditStatistics(days);
  }
}

/**
 * Example service showing bulk operations
 */
@Injectable()
export class ExampleBulkService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Example of bulk operation with manual audit logging
   */
  async bulkDeleteUsers(userIds: string[], performedBy: string) {
    // Log the bulk operation
    await this.auditService.logCustomAction(
      'BULK_DELETE',
      'USER',
      'bulk_operation',
      {
        userIds,
        count: userIds.length,
      },
      performedBy,
    );

    // Perform the operation
    const result = await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { isDeleted: true },
    });

    return result;
  }

  /**
   * Example of import operation with audit logging
   */
  async importUsersFromCSV(csvData: any[], performedBy: string) {
    const importId = `import_${Date.now()}`;

    try {
      // Log import start
      await this.auditService.logCustomAction(
        'IMPORT_START',
        'USER',
        importId,
        {
          recordCount: csvData.length,
          source: 'CSV',
        },
        performedBy,
      );

      // Process the import
      const results = [];
      for (const userData of csvData) {
        const user = await this.prisma.user.create({
          data: userData,
        });
        results.push(user);
      }

      // Log import success
      await this.auditService.logCustomAction(
        'IMPORT_SUCCESS',
        'USER',
        importId,
        {
          successCount: results.length,
          createdUserIds: results.map((u) => u.id),
        },
        performedBy,
      );

      return results;
    } catch (error) {
      // Log import failure
      await this.auditService.logCustomAction(
        'IMPORT_FAILED',
        'USER',
        importId,
        {
          error: error.message,
          recordCount: csvData.length,
        },
        performedBy,
      );

      throw error;
    }
  }
}

/**
 * Example showing how to get audit history
 */
@Injectable()
export class ExampleAuditQueryService {
  constructor(private auditService: AuditService) {}

  /**
   * Get all activities for a specific user
   */
  async getUserActivityHistory(userId: string) {
    return this.auditService.getEntityHistory('USER', userId);
  }

  /**
   * Get recent activities across the system
   */
  async getRecentSystemActivity() {
    return this.auditService.getRecentHistory(50);
  }

  /**
   * Get audit statistics for the dashboard
   */
  async getAuditDashboard() {
    return this.auditService.getAuditStatistics(30);
  }
}
