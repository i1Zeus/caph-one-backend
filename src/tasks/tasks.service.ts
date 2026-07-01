import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { DynamicPermissionsService } from '../auth/services/dynamic-permissions.service';
import {
  NotificationsService,
  UserNotificationPreferences,
} from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import {
  FindAllTasksParams,
  PaginatedTasksResponse,
} from './dto/paginated-tasks-response.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskWithFullSubtasks } from './entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService, private tenantPrisma: TenantPrismaService,
    private notificationsService: NotificationsService,
    private permissionsService: DynamicPermissionsService,
  ) {}

  /**
   * Helper method to map user data to notification preferences
   * TODO: Add proper notification preference fields to User model in schema
   */
  private mapUserToNotificationPreferences(user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  }): UserNotificationPreferences {
    return {
      email: true, // Default to enabled - should be configurable per user
      whatsapp: !!user.phone, // Only enable if user has phone number
      emailAddress: user.email,
      phoneNumber: user.phone,
    };
  }

  /**
   * Send task assignment notification to newly assigned users
   */
  private async sendTaskAssignmentNotifications(
    task: Task,
    newlyAssignedUserIds: string[],
  ): Promise<void> {
    if (newlyAssignedUserIds.length === 0) return;

    // Get project name if not included in task
    let projectName = task.project?.name;
    if (!projectName) {
      const project = await this.tenantPrisma.client.project.findUnique({
        where: { id: task.projectId },
        select: { name: true },
      });
      projectName = project?.name || 'Unknown Project';
    }

    // Get user details for notification
    const users = await this.tenantPrisma.client.user.findMany({
      where: {
        id: { in: newlyAssignedUserIds },
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    // Send notifications to each newly assigned user
    const notificationPromises = users.map(async (user) => {
      const preferences = this.mapUserToNotificationPreferences(user);

      try {
        await this.notificationsService.sendTaskAssignmentNotification(
          user.name,
          task.title,
          projectName,
          preferences,
          task.id,
        );
      } catch (error) {
        // Log error but don't fail the task assignment
        console.error(`Failed to send notification to user ${user.id}:`, error);
      }
    });

    await Promise.allSettled(notificationPromises);
  }

  async create(createTaskDto: CreateTaskDto, userId?: string): Promise<Task> {
    try {
      // Verify that the project exists
      const project = await this.tenantPrisma.client.project.findFirst({
        where: {
          id: createTaskDto.projectId,
          isDeleted: false,
        },
      });

      if (!project) {
        throw new BadRequestException('Project not found');
      }

      // Verify task stage if provided
      if (createTaskDto.taskStageId) {
        const taskStage = await this.tenantPrisma.client.taskStage.findFirst({
          where: {
            id: createTaskDto.taskStageId,
            projectId: createTaskDto.projectId,
            isDeleted: false,
          },
        });

        if (!taskStage) {
          throw new BadRequestException(
            'Task stage not found or does not belong to the specified project',
          );
        }
      }

      // Verify parent task if provided
      if (createTaskDto.parentId) {
        const parentTask = await this.tenantPrisma.client.task.findFirst({
          where: {
            id: createTaskDto.parentId,
            projectId: createTaskDto.projectId, // Subtask must be in same project
            isDeleted: false,
          },
        });

        if (!parentTask) {
          throw new BadRequestException(
            'Parent task not found or does not belong to the specified project',
          );
        }

        // Note: No need to check circular dependencies when creating a new task
        // A new task can never create circular dependencies since it has no children yet
      }

      // Verify assignees if provided
      if (createTaskDto.assigneeIds && createTaskDto.assigneeIds.length > 0) {
        const users = await this.tenantPrisma.client.user.findMany({
          where: {
            id: { in: createTaskDto.assigneeIds },
            isDeleted: false,
            // Verify users are members of the project's workspace
            workspaces: {
              some: {
                workspaceId: project.workspaceId,
              },
            },
          },
        });

        if (users.length !== createTaskDto.assigneeIds.length) {
          throw new BadRequestException(
            'One or more assignees not found or not members of the project workspace',
          );
        }
      }

      // Determine order if not provided
      let order = createTaskDto.order;
      if (order === undefined && createTaskDto.taskStageId) {
        const maxOrderTask = await this.tenantPrisma.client.task.findFirst({
          where: {
            taskStageId: createTaskDto.taskStageId,
            isDeleted: false,
          },
          orderBy: { order: 'desc' },
          select: { order: true },
        });
        order = (maxOrderTask?.order ?? -1) + 1;
      }

      const task = await this.tenantPrisma.client.task.create({
        data: {
          title: createTaskDto.title,
          description: createTaskDto.description,
          startDate: createTaskDto.startDate
            ? new Date(createTaskDto.startDate)
            : undefined,
          endDate: createTaskDto.endDate
            ? new Date(createTaskDto.endDate)
            : undefined,
          status: createTaskDto.status || TaskStatus.PENDING,
          priority: createTaskDto.priority || TaskPriority.MEDIUM,
          projectId: createTaskDto.projectId,
          taskStageId: createTaskDto.taskStageId,
          parentId: createTaskDto.parentId,
          createdById: userId || undefined,
          order: order ?? 0,
          assignees: createTaskDto.assigneeIds
            ? {
                connect: createTaskDto.assigneeIds.map((id) => ({ id })),
              }
            : undefined,
        },
        include: {
          parent: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
            },
          },
          subtasks: {
            where: {
              isDeleted: false,
              OR: [
                { taskStageId: null }, // Tasks without a stage
                {
                  taskStage: {
                    isDeleted: false,
                  },
                },
              ],
            },
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          assignees: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          taskStage: {
            select: {
              id: true,
              name: true,
              description: true,
              order: true,
              color: true,
            },
          },
        },
      });

      // Send notifications to assigned users if any
      if (createTaskDto.assigneeIds && createTaskDto.assigneeIds.length > 0) {
        await this.sendTaskAssignmentNotifications(
          task as Task,
          createTaskDto.assigneeIds,
        );
      }

      return task as Task;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create task');
    }
  }

  async findAll(
    filters: {
      projectId?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeIds?: string[];
      createdByIds?: string[];
      taskStageId?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
      dueDate?: string;
      workspaceId?: string;
      showDueTasks?: boolean;
    },
    userId?: string,
  ): Promise<Task[]> {
    // Start with base conditions
    const whereClause: any = {
      isDeleted: false,
    };

    // Build additional conditions
    const additionalConditions: any[] = [];

    // Exclude tasks with deleted stages
    additionalConditions.push({
      OR: [
        { taskStageId: null }, // Tasks without a stage
        {
          taskStage: {
            isDeleted: false,
          },
        },
      ],
    });

    // Add project membership filtering for users without tasks:all permission
    if (userId) {
      const hasTasksAllPermission =
        await this.permissionsService.userHasResourcePermission(
          userId,
          'tasks',
          'all',
        );

      if (!hasTasksAllPermission) {
        // Users without tasks:all permission can only see tasks from projects they are members of OR tasks assigned to them
        const accessConditions = {
          OR: [
            // Tasks from projects where user is owner or contributor
            {
              project: {
                OR: [
                  { ownerId: userId },
                  {
                    contributors: {
                      some: {
                        id: userId,
                      },
                    },
                  },
                ],
              },
            },
            // Tasks assigned to the user
            {
              assignees: {
                some: {
                  id: userId,
                },
              },
            },
          ],
        };

        additionalConditions.push(accessConditions);
      }
    }

    // Apply filters
    if (filters?.projectId) {
      additionalConditions.push({ projectId: filters.projectId });
    }

    if (filters?.status) {
      additionalConditions.push({ status: filters.status });
    }

    if (filters?.priority) {
      additionalConditions.push({ priority: filters.priority });
    }

    if (filters?.assigneeIds && filters.assigneeIds.length > 0) {
      // Filter tasks that have ANY of the specified assignees
      additionalConditions.push({
        assignees: {
          some: {
            id: {
              in: filters.assigneeIds,
            },
          },
        },
      });
    }

    if (filters?.createdByIds && filters.createdByIds.length > 0) {
      additionalConditions.push({
        createdById: {
          in: filters.createdByIds,
        },
      });
    }

    if (filters?.taskStageId) {
      additionalConditions.push({ taskStageId: filters.taskStageId });
    }

    if (filters?.workspaceId) {
      additionalConditions.push({
        project: {
          workspaceId: filters.workspaceId,
        },
      });
    }

    // Date range filtering (for task creation dates)
    if (filters?.startDate || filters?.endDate) {
      const createdAtCondition: any = {};

      if (filters.startDate) {
        createdAtCondition.gte = new Date(filters.startDate);
      }

      if (filters.endDate) {
        // Add one day and subtract 1ms to include the entire end date
        const endDate = new Date(filters.endDate);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setMilliseconds(endDate.getMilliseconds() - 1);
        createdAtCondition.lte = endDate;
      }

      additionalConditions.push({ createdAt: createdAtCondition });
    }

    // Due date filtering (for task due dates)
    if (filters?.dueDate) {
      // Filter tasks that are due by the specified date
      const dueDate = new Date(filters.dueDate);
      dueDate.setDate(dueDate.getDate() + 1);
      dueDate.setMilliseconds(dueDate.getMilliseconds() - 1);
      additionalConditions.push({
        endDate: {
          lte: dueDate,
        },
        // Exclude completed tasks from due date filter
        status: {
          not: TaskStatus.COMPLETED,
        },
      });
    }

    // Show due tasks (tasks that are due today or overdue)
    if (filters?.showDueTasks) {
      const now = new Date();
      // Set to end of today to include tasks due today
      const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );
      additionalConditions.push({
        endDate: {
          lte: endOfToday,
        },
        // Only include tasks that have an end date set
        NOT: {
          endDate: null,
        },
        // Exclude completed tasks from due tasks filter
        status: {
          not: TaskStatus.COMPLETED,
        },
      });
    }

    if (filters?.search) {
      additionalConditions.push({
        OR: [
          {
            title: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
          {
            project: {
              name: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
          },
        ],
      });
    }

    // Combine all conditions
    if (additionalConditions.length > 0) {
      whereClause.AND = additionalConditions;
    }

    const tasks = await this.tenantPrisma.client.task.findMany({
      where: whereClause,
      include: {
        parent: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        subtasks: {
          where: { isDeleted: false },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignees: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        taskStage: {
          select: {
            id: true,
            name: true,
            description: true,
            order: true,
            color: true,
          },
        },
      },
      orderBy: [
        // { order: 'asc' },
        // { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return tasks as Task[];
  }

  async findAllPaginated(
    params: FindAllTasksParams,
    userId?: string,
  ): Promise<PaginatedTasksResponse> {
    const {
      page,
      limit,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...filters
    } = params;
    const skip = (page - 1) * limit;

    // Start with base conditions
    const whereClause: any = {
      isDeleted: false,
    };

    // Build additional conditions
    const additionalConditions: any[] = [];

    // Exclude tasks with deleted stages
    additionalConditions.push({
      OR: [
        { taskStageId: null }, // Tasks without a stage
        {
          taskStage: {
            isDeleted: false,
          },
        },
      ],
    });

    // Add project membership filtering for users without tasks:all permission
    if (userId) {
      const hasTasksAllPermission =
        await this.permissionsService.userHasResourcePermission(
          userId,
          'tasks',
          'all',
        );

      if (!hasTasksAllPermission) {
        // Users without tasks:all permission can only see tasks from projects they are members of OR tasks assigned to them
        const accessConditions = {
          OR: [
            // Tasks from projects where user is owner or contributor
            {
              project: {
                OR: [
                  { ownerId: userId },
                  {
                    contributors: {
                      some: {
                        id: userId,
                      },
                    },
                  },
                ],
              },
            },
            // Tasks assigned to the user
            {
              assignees: {
                some: {
                  id: userId,
                },
              },
            },
          ],
        };

        additionalConditions.push(accessConditions);
      }
    }

    // Apply filters
    if (filters.projectId) {
      additionalConditions.push({ projectId: filters.projectId });
    }

    if (filters.status) {
      additionalConditions.push({ status: filters.status });
    }

    if (filters.priority) {
      additionalConditions.push({ priority: filters.priority });
    }

    if (filters.assigneeIds && filters.assigneeIds.length > 0) {
      // Filter tasks that have ANY of the specified assignees
      additionalConditions.push({
        assignees: {
          some: {
            id: {
              in: filters.assigneeIds,
            },
          },
        },
      });
    }

    if (filters.createdByIds && filters.createdByIds.length > 0) {
      additionalConditions.push({
        createdById: {
          in: filters.createdByIds,
        },
      });
    }

    if (filters.taskStageId) {
      additionalConditions.push({ taskStageId: filters.taskStageId });
    }

    if (filters.workspaceId) {
      additionalConditions.push({
        project: {
          workspaceId: filters.workspaceId,
        },
      });
    }

    // Date range filtering (for task creation dates)
    if (filters.startDate || filters.endDate) {
      const createdAtCondition: any = {};

      if (filters.startDate) {
        createdAtCondition.gte = new Date(filters.startDate);
      }

      if (filters.endDate) {
        // Add one day and subtract 1ms to include the entire end date
        const endDate = new Date(filters.endDate);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setMilliseconds(endDate.getMilliseconds() - 1);
        createdAtCondition.lte = endDate;
      }

      additionalConditions.push({ createdAt: createdAtCondition });
    }

    // Due date filtering (for task due dates)
    if (filters.dueDate) {
      // Filter tasks that are due by the specified date
      const dueDate = new Date(filters.dueDate);
      dueDate.setDate(dueDate.getDate() + 1);
      dueDate.setMilliseconds(dueDate.getMilliseconds() - 1);
      additionalConditions.push({
        endDate: {
          lte: dueDate,
        },
        // Exclude completed tasks from due date filter
        status: {
          not: TaskStatus.COMPLETED,
        },
      });
    }

    // Show due tasks (tasks that are due today or overdue)
    if (filters.showDueTasks) {
      const now = new Date();
      // Set to end of today to include tasks due today
      const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );
      additionalConditions.push({
        endDate: {
          lte: endOfToday,
        },
        // Only include tasks that have an end date set
        NOT: {
          endDate: null,
        },
        // Exclude completed tasks from due tasks filter
        status: {
          not: TaskStatus.COMPLETED,
        },
      });
    }

    if (filters.search) {
      additionalConditions.push({
        OR: [
          {
            title: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
          {
            project: {
              name: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
          },
        ],
      });
    }

    // Combine all conditions
    if (additionalConditions.length > 0) {
      whereClause.AND = additionalConditions;
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === 'title') {
      orderBy.title = sortOrder;
    } else if (sortBy === 'priority') {
      orderBy.priority = sortOrder;
    } else if (sortBy === 'status') {
      orderBy.status = sortOrder;
    } else if (sortBy === 'dueDate') {
      orderBy.endDate = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'updatedAt') {
      orderBy.updatedAt = sortOrder;
    } else {
      orderBy.createdAt = 'desc'; // Default fallback
    }

    // Get total count for pagination
    const total = await this.tenantPrisma.client.task.count({
      where: whereClause,
    });

    // Get paginated tasks
    const tasks = await this.tenantPrisma.client.task.findMany({
      where: whereClause,
      include: {
        parent: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        subtasks: {
          where: { isDeleted: false },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignees: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        taskStage: {
          select: {
            id: true,
            name: true,
            description: true,
            order: true,
            color: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: tasks as Task[],
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  async findOne(id: string, userId?: string): Promise<Task> {
    const whereClause: any = {
      id,
      isDeleted: false,
    };

    // Build additional conditions
    const additionalConditions: any[] = [];

    // Exclude tasks with deleted stages
    additionalConditions.push({
      OR: [
        { taskStageId: null }, // Tasks without a stage
        {
          taskStage: {
            isDeleted: false,
          },
        },
      ],
    });

    // Add project membership filtering for non-admin users
    if (userId) {
      // Check if user has admin:all permission
      const hasAdminAccess =
        await this.permissionsService.userHasResourcePermission(
          userId,
          'admin',
          'all',
        );

      if (!hasAdminAccess) {
        // Non-admin users can only see tasks from projects they are members of OR tasks assigned to them
        additionalConditions.push({
          OR: [
            // Tasks from projects where user is owner or contributor
            {
              project: {
                OR: [
                  { ownerId: userId },
                  {
                    contributors: {
                      some: {
                        id: userId,
                      },
                    },
                  },
                ],
              },
            },
            // Tasks assigned to the user
            {
              assignees: {
                some: {
                  id: userId,
                },
              },
            },
          ],
        });
      }
    }

    // Combine conditions
    if (additionalConditions.length > 0) {
      whereClause.AND = additionalConditions;
    }

    const task = await this.tenantPrisma.client.task.findFirst({
      where: whereClause,
      include: {
        parent: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        subtasks: {
          where: { isDeleted: false },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        assignees: {
          select: {
            id: true,
            name: true,
            email: true,
            // role field removed - now using userRoles relation
          },
        },
        taskStage: {
          select: {
            id: true,
            name: true,
            description: true,
            order: true,
            color: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task as Task;
  }

  /**
   * Private method to find a task without access control filtering (for internal operations)
   */
  private async findOneInternal(id: string): Promise<Task> {
    const task = await this.tenantPrisma.client.task.findFirst({
      where: {
        id,
        isDeleted: false,
        OR: [
          { taskStageId: null }, // Tasks without a stage
          {
            taskStage: {
              isDeleted: false,
            },
          },
        ],
      },
      include: {
        parent: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        subtasks: {
          where: { isDeleted: false },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        assignees: {
          select: {
            id: true,
            name: true,
            email: true,
            // role field removed - now using userRoles relation
          },
        },
        taskStage: {
          select: {
            id: true,
            name: true,
            description: true,
            order: true,
            color: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task as Task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    // Check if task exists and get current assignees
    const existingTask = await this.tenantPrisma.client.task.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        assignees: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingTask) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Track current assignee IDs for notification logic
    const currentAssigneeIds = existingTask.assignees.map(
      (assignee) => assignee.id,
    );

    try {
      // Verify project if provided
      if (updateTaskDto.projectId) {
        const project = await this.tenantPrisma.client.project.findFirst({
          where: {
            id: updateTaskDto.projectId,
            isDeleted: false,
          },
        });

        if (!project) {
          throw new BadRequestException('Project not found');
        }
      }

      // Verify task stage if provided
      if (updateTaskDto.taskStageId) {
        const projectId = updateTaskDto.projectId || existingTask.projectId;
        const taskStage = await this.tenantPrisma.client.taskStage.findFirst({
          where: {
            id: updateTaskDto.taskStageId,
            projectId: projectId,
            isDeleted: false,
          },
        });

        if (!taskStage) {
          throw new BadRequestException(
            'Task stage not found or does not belong to the specified project',
          );
        }
      }

      // Verify parent task if provided
      if (updateTaskDto.parentId !== undefined) {
        if (updateTaskDto.parentId) {
          const parentTask = await this.tenantPrisma.client.task.findFirst({
            where: {
              id: updateTaskDto.parentId,
              projectId: updateTaskDto.projectId || existingTask.projectId,
              isDeleted: false,
            },
          });

          if (!parentTask) {
            throw new BadRequestException(
              'Parent task not found or does not belong to the specified project',
            );
          }

          // Check for circular dependencies
          if (
            await this.wouldCreateCircularDependency(id, updateTaskDto.parentId)
          ) {
            throw new BadRequestException(
              'Cannot update task: would create circular dependency',
            );
          }
        }
      }

      // Verify assignees if provided
      if (updateTaskDto.assigneeIds) {
        // Get the project's workspace ID
        const projectId = updateTaskDto.projectId || existingTask.projectId;
        const project = await this.tenantPrisma.client.project.findFirst({
          where: {
            id: projectId,
            isDeleted: false,
          },
          select: { workspaceId: true },
        });

        if (!project) {
          throw new BadRequestException('Project not found');
        }

        const users = await this.tenantPrisma.client.user.findMany({
          where: {
            id: { in: updateTaskDto.assigneeIds },
            isDeleted: false,
            // Verify users are members of the project's workspace
            workspaces: {
              some: {
                workspaceId: project.workspaceId,
              },
            },
          },
        });

        if (users.length !== updateTaskDto.assigneeIds.length) {
          throw new BadRequestException(
            'One or more assignees not found or not members of the project workspace',
          );
        }
      }

      // Prepare update data
      const { assigneeIds, startDate, endDate, ...updateData } = updateTaskDto;

      const task = await this.tenantPrisma.client.task.update({
        where: { id },
        data: {
          ...updateData,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          assignees: assigneeIds
            ? {
                set: assigneeIds.map((id) => ({ id })),
              }
            : undefined,
        },
        include: {
          parent: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
            },
          },
          subtasks: {
            where: {
              isDeleted: false,
              OR: [
                { taskStageId: null }, // Tasks without a stage
                {
                  taskStage: {
                    isDeleted: false,
                  },
                },
              ],
            },
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          assignees: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          taskStage: {
            select: {
              id: true,
              name: true,
              description: true,
              order: true,
              color: true,
            },
          },
        },
      });

      // Send notifications to newly assigned users
      if (assigneeIds) {
        const newlyAssignedUserIds = assigneeIds.filter(
          (id) => !currentAssigneeIds.includes(id),
        );
        if (newlyAssignedUserIds.length > 0) {
          await this.sendTaskAssignmentNotifications(
            task as Task,
            newlyAssignedUserIds,
          );
        }
      }

      return task as Task;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update task');
    }
  }

  async reorderTasks(
    reorderTasksDto: ReorderTasksDto,
  ): Promise<{ message: string }> {
    try {
      // Validate all tasks exist and get their current data
      const taskIds = reorderTasksDto.tasks.map((t) => t.id);
      const existingTasks = await this.tenantPrisma.client.task.findMany({
        where: {
          id: { in: taskIds },
          isDeleted: false,
        },
        select: {
          id: true,
          taskStageId: true,
        },
      });

      if (existingTasks.length !== taskIds.length) {
        throw new BadRequestException('One or more tasks not found');
      }

      // Update each task's order and stage
      const updatePromises = reorderTasksDto.tasks.map((taskOrder) =>
        this.tenantPrisma.client.task.update({
          where: { id: taskOrder.id },
          data: {
            order: taskOrder.order,
            taskStageId: taskOrder.taskStageId,
          },
        }),
      );

      await Promise.all(updatePromises);

      return { message: 'Tasks reordered successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to reorder tasks');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if task exists
    const existingTask = await this.tenantPrisma.client.task.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingTask) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    try {
      // Soft delete the task
      await this.tenantPrisma.client.task.update({
        where: { id },
        data: {
          isDeleted: true,
        },
      });

      return { message: `Task with ID ${id} has been deleted` };
    } catch (error) {
      throw new BadRequestException('Failed to delete task');
    }
  }

  async assignUsers(taskId: string, userIds: string[]): Promise<Task> {
    const task = await this.findOneInternal(taskId);

    // Get the task's project workspace ID
    const project = await this.tenantPrisma.client.project.findFirst({
      where: {
        id: task.projectId,
        isDeleted: false,
      },
      select: { workspaceId: true },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    // Verify users exist and are members of the project's workspace
    const users = await this.tenantPrisma.client.user.findMany({
      where: {
        id: { in: userIds },
        isDeleted: false,
        // Verify users are members of the project's workspace
        workspaces: {
          some: {
            workspaceId: project.workspaceId,
          },
        },
      },
    });

    if (users.length !== userIds.length) {
      throw new BadRequestException(
        'One or more users not found or not members of the project workspace',
      );
    }

    const updatedTask = await this.tenantPrisma.client.task.update({
      where: { id: taskId },
      data: {
        assignees: {
          connect: userIds.map((id) => ({ id })),
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignees: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        taskStage: {
          select: {
            id: true,
            name: true,
            description: true,
            order: true,
            color: true,
          },
        },
      },
    });

    await this.sendTaskAssignmentNotifications(updatedTask as Task, userIds);

    return updatedTask as Task;
  }

  async unassignUsers(taskId: string, userIds: string[]): Promise<Task> {
    const task = await this.findOneInternal(taskId);

    const updatedTask = await this.tenantPrisma.client.task.update({
      where: { id: taskId },
      data: {
        assignees: {
          disconnect: userIds.map((id) => ({ id })),
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignees: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        taskStage: {
          select: {
            id: true,
            name: true,
            description: true,
            order: true,
            color: true,
          },
        },
      },
    });

    return updatedTask as Task;
  }

  async getTasksByProject(projectId: string, userId?: string): Promise<Task[]> {
    return this.findAll({ projectId }, userId);
  }

  async getTasksByUser(
    userId: string,
    requestingUserId?: string,
  ): Promise<Task[]> {
    return this.findAll({ assigneeIds: [userId] }, requestingUserId);
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
    return this.update(taskId, { status });
  }

  async updateTaskPriority(
    taskId: string,
    priority: TaskPriority,
  ): Promise<Task> {
    return this.update(taskId, { priority });
  }

  // Subtask-specific methods

  /**
   * Check if creating a parent-child relationship would create a circular dependency
   */
  private async wouldCreateCircularDependency(
    taskId: string,
    ancestorId: string,
  ): Promise<boolean> {
    if (taskId === ancestorId) {
      return true;
    }

    const ancestorTask = await this.tenantPrisma.client.task.findFirst({
      where: {
        id: ancestorId,
        isDeleted: false,
      },
      select: { parentId: true },
    });

    if (!ancestorTask?.parentId) {
      return false;
    }

    return this.wouldCreateCircularDependency(taskId, ancestorTask.parentId);
  }

  /**
   * Get a task with all its subtasks in a hierarchical structure
   */
  async findWithSubtasks(id: string): Promise<TaskWithFullSubtasks> {
    const task = await this.tenantPrisma.client.task.findFirst({
      where: {
        id,
        isDeleted: false,
        OR: [
          { taskStageId: null }, // Tasks without a stage
          {
            taskStage: {
              isDeleted: false,
            },
          },
        ],
      },
      include: {
        parent: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        subtasks: {
          where: {
            isDeleted: false,
            OR: [
              { taskStageId: null }, // Tasks without a stage
              {
                taskStage: {
                  isDeleted: false,
                },
              },
            ],
          },
          include: {
            parent: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
              },
            },
            subtasks: {
              where: {
                isDeleted: false,
                OR: [
                  { taskStageId: null }, // Tasks without a stage
                  {
                    taskStage: {
                      isDeleted: false,
                    },
                  },
                ],
              },
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                createdAt: true,
              },
            },
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            assignees: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            taskStage: {
              select: {
                id: true,
                name: true,
                description: true,
                order: true,
                color: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        assignees: {
          select: {
            id: true,
            name: true,
            email: true,
            // role field removed - now using userRoles relation
          },
        },
        taskStage: {
          select: {
            id: true,
            name: true,
            description: true,
            order: true,
            color: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task as TaskWithFullSubtasks;
  }

  /**
   * Get all subtasks of a parent task
   */
  async getSubtasks(parentId: string): Promise<Task[]> {
    // Verify parent task exists
    const parentTask = await this.tenantPrisma.client.task.findFirst({
      where: {
        id: parentId,
        isDeleted: false,
      },
    });

    if (!parentTask) {
      throw new NotFoundException(`Parent task with ID ${parentId} not found`);
    }

    const subtasks = await this.tenantPrisma.client.task.findMany({
      where: {
        parentId,
        isDeleted: false,
        OR: [
          { taskStageId: null }, // Tasks without a stage
          {
            taskStage: {
              isDeleted: false,
            },
          },
        ],
      },
      include: {
        parent: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        subtasks: {
          where: { isDeleted: false },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignees: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        taskStage: {
          select: {
            id: true,
            name: true,
            description: true,
            order: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return subtasks as Task[];
  }

  /**
   * Create a subtask for a parent task
   */
  async createSubtask(
    parentId: string,
    createTaskDto: Omit<CreateTaskDto, 'parentId'>,
    userId?: string,
  ): Promise<Task> {
    // Verify parent task exists and get its project
    const parentTask = await this.tenantPrisma.client.task.findFirst({
      where: {
        id: parentId,
        isDeleted: false,
      },
      select: {
        id: true,
        projectId: true,
        taskStageId: true,
      },
    });

    if (!parentTask) {
      throw new NotFoundException(`Parent task with ID ${parentId} not found`);
    }

    // Create subtask with parent's project and stage by default
    const subtaskDto: CreateTaskDto = {
      ...createTaskDto,
      parentId,
      projectId: parentTask.projectId,
      taskStageId: createTaskDto.taskStageId || parentTask.taskStageId,
    };

    return this.create(subtaskDto, userId);
  }

  /**
   * Convert a subtask to a main task (remove parent relationship)
   */
  async promoteSubtask(subtaskId: string): Promise<Task> {
    const subtask = await this.findOneInternal(subtaskId);

    if (!subtask.parentId) {
      throw new BadRequestException('Task is not a subtask');
    }

    return this.update(subtaskId, { parentId: null });
  }

  /**
   * Move a task to become a subtask of another task
   */
  async convertToSubtask(taskId: string, newParentId: string): Promise<Task> {
    // Verify target parent exists and is in same project
    const parentTask = await this.tenantPrisma.client.task.findFirst({
      where: {
        id: newParentId,
        isDeleted: false,
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!parentTask) {
      throw new NotFoundException(
        `Parent task with ID ${newParentId} not found`,
      );
    }

    const task = await this.findOneInternal(taskId);

    if (task.projectId !== parentTask.projectId) {
      throw new BadRequestException(
        'Task and parent must be in the same project',
      );
    }

    // Check for circular dependencies
    if (await this.wouldCreateCircularDependency(taskId, newParentId)) {
      throw new BadRequestException(
        'Cannot convert task: would create circular dependency',
      );
    }

    return this.update(taskId, { parentId: newParentId });
  }

  /**
   * Get only main tasks (tasks without parent) for a project
   */
  async getMainTasks(projectId: string, userId?: string): Promise<Task[]> {
    const whereClause: any = {
      projectId,
      parentId: null,
      isDeleted: false,
    };

    // Build additional conditions
    const additionalConditions: any[] = [];

    // Exclude tasks with deleted stages
    additionalConditions.push({
      OR: [
        { taskStageId: null }, // Tasks without a stage
        {
          taskStage: {
            isDeleted: false,
          },
        },
      ],
    });

    // Add project membership filtering for non-admin users
    if (userId) {
      // Check if user has admin:all permission
      const hasAdminAccess =
        await this.permissionsService.userHasResourcePermission(
          userId,
          'admin',
          'all',
        );

      if (!hasAdminAccess) {
        // Non-admin users can only see tasks from projects they are members of OR tasks assigned to them
        const accessConditions = {
          OR: [
            // Tasks from projects where user is owner or contributor
            {
              project: {
                OR: [
                  { ownerId: userId },
                  {
                    contributors: {
                      some: {
                        id: userId,
                      },
                    },
                  },
                ],
              },
            },
            // Tasks assigned to the user
            {
              assignees: {
                some: {
                  id: userId,
                },
              },
            },
          ],
        };

        additionalConditions.push(accessConditions);
      }
    }

    // Combine conditions
    if (additionalConditions.length > 0) {
      whereClause.AND = additionalConditions;
    }

    const tasks = await this.tenantPrisma.client.task.findMany({
      where: whereClause,
      include: {
        parent: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        subtasks: {
          where: { isDeleted: false },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignees: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        taskStage: {
          select: {
            id: true,
            name: true,
            description: true,
            order: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tasks as Task[];
  }
}
