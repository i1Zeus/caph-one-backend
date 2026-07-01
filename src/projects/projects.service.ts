import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DynamicPermissionsService } from '../auth/services/dynamic-permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import {
  AddContributorsDto,
  RemoveContributorsDto,
} from './dto/manage-contributors.dto';
import { ReorderProjectsDto } from './dto/reorder-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService, private tenantPrisma: TenantPrismaService,
    private permissionsService: DynamicPermissionsService,
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    try {
      // Verify that the owner exists
      const owner = await this.tenantPrisma.client.user.findUnique({
        where: { id: createProjectDto.ownerId },
      });

      if (!owner) {
        throw new BadRequestException('Owner not found');
      }

      // Determine order if not provided
      let order = createProjectDto.order;
      if (order === undefined && createProjectDto.projectStageId) {
        const maxOrderProject = await this.tenantPrisma.client.project.findFirst({
          where: {
            projectStageId: createProjectDto.projectStageId,
            isDeleted: false,
          },
          orderBy: { order: 'desc' },
          select: { order: true },
        });
        order = (maxOrderProject?.order ?? -1) + 1;
      }

      // Verify workspace exists
      const workspace = await this.tenantPrisma.client.workspace.findUnique({
        where: { id: createProjectDto.workspaceId },
      });

      if (!workspace) {
        throw new BadRequestException('Workspace not found');
      }

      const project = await this.tenantPrisma.client.project.create({
        data: {
          name: createProjectDto.name,
          description: createProjectDto.description,
          workspaceId: createProjectDto.workspaceId,
          ownerId: createProjectDto.ownerId,
          projectStageId: createProjectDto.projectStageId,
          order: order ?? 0,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          contributors: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          projectStage: {
            select: {
              id: true,
              name: true,
              description: true,
              color: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              taskStages: true,
            },
          },
        },
      });

      return project;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create project');
    }
  }

  async findAll(userId?: string, workspaceId?: string): Promise<Project[]> {
    // Build workspace filter
    const workspaceFilter = workspaceId ? { workspaceId } : {};

    // Check if user has admin access (can see all projects)
    let hasAdminAccess = false;
    if (userId) {
      hasAdminAccess =
        (await this.permissionsService.userHasResourcePermission(
          userId,
          'admin',
          'all',
        )) ||
        (await this.permissionsService.userHasResourcePermission(
          userId,
          'projects',
          'read',
        ));
    }

    // If user has admin access, return all projects (optionally filtered by workspace)
    if (hasAdminAccess) {
      const projects = await this.tenantPrisma.client.project.findMany({
        where: {
          isDeleted: false,
          ...workspaceFilter,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          contributors: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          projectStage: {
            select: {
              id: true,
              name: true,
              description: true,
              color: true,
            },
          },
          files: {
            where: {
              isDeleted: false,
            },
            select: {
              id: true,
              originalName: true,
              filename: true,
              mimetype: true,
              size: true,
              url: true,
              uploadedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          _count: {
            select: {
              tasks: true,
              taskStages: true,
            },
          },
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      });

      return projects;
    }

    // For non-admin users, only return projects they contribute to or own (optionally filtered by workspace)
    const projects = await this.tenantPrisma.client.project.findMany({
      where: {
        isDeleted: false,
        ...workspaceFilter,
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
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contributors: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        projectStage: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
          },
        },
        files: {
          where: {
            isDeleted: false,
          },
          select: {
            id: true,
            originalName: true,
            filename: true,
            mimetype: true,
            size: true,
            url: true,
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            tasks: true,
            taskStages: true,
            files: {
              where: {
                isDeleted: false,
              },
            },
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    return projects;
  }

  async findPaginated(
    userId?: string,
    workspaceId?: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    startDate?: string,
    endDate?: string,
    ownerIds?: string[],
    collaboratorIds?: string[],
    createdByIds?: string[],
  ): Promise<{
    data: Project[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Build workspace filter
    const workspaceFilter = workspaceId ? { workspaceId } : {};

    // Build search filter
    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Build date filter
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)), // End of day
      };
    }

    // Build owner filter - Combine ownerIds and createdByIds since they represent the same thing
    // (Project model doesn't have a separate createdById field, ownerId represents who created it)
    const combinedOwnerIds = [
      ...(ownerIds || []),
      ...(createdByIds || []),
    ].filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates

    const ownerFilter =
      combinedOwnerIds.length > 0 ? { ownerId: { in: combinedOwnerIds } } : {};

    // Build collaborator filter
    const collaboratorFilter =
      collaboratorIds && collaboratorIds.length > 0
        ? {
            contributors: {
              some: {
                id: { in: collaboratorIds },
              },
            },
          }
        : {};

    // Check if user has admin access (can see all projects)
    let hasAdminAccess = false;
    if (userId) {
      hasAdminAccess =
        (await this.permissionsService.userHasResourcePermission(
          userId,
          'admin',
          'all',
        )) ||
        (await this.permissionsService.userHasResourcePermission(
          userId,
          'projects',
          'read',
        ));
    }

    // Build where clause based on permissions
    const whereClause: any = {
      isDeleted: false,
      ...workspaceFilter,
      ...searchFilter,
      ...dateFilter,
      ...ownerFilter,
      ...collaboratorFilter,
    };

    // For non-admin users, add membership filtering
    if (userId && !hasAdminAccess) {
      whereClause.OR = [
        { ownerId: userId },
        {
          contributors: {
            some: {
              id: userId,
            },
          },
        },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [projects, total] = await Promise.all([
      this.tenantPrisma.client.project.findMany({
        where: whereClause,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          contributors: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          projectStage: {
            select: {
              id: true,
              name: true,
              description: true,
              color: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              taskStages: true,
            },
          },
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.tenantPrisma.client.project.count({
        where: whereClause,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: projects,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: string, userId?: string): Promise<Project> {
    // Build base query conditions
    const whereClause: any = {
      id,
      isDeleted: false,
    };

    // Check if user has admin access
    let hasAdminAccess = false;
    if (userId) {
      hasAdminAccess =
        (await this.permissionsService.userHasResourcePermission(
          userId,
          'admin',
          'all',
        )) ||
        (await this.permissionsService.userHasResourcePermission(
          userId,
          'projects',
          'read',
        ));
    }

    // For non-admin users, add project membership filtering
    if (userId && !hasAdminAccess) {
      whereClause.OR = [
        { ownerId: userId },
        {
          contributors: {
            some: {
              id: userId,
            },
          },
        },
      ];
    }

    const project = await this.tenantPrisma.client.project.findFirst({
      where: whereClause,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contributors: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tasks: {
          where: {
            isDeleted: false,
          },
          include: {
            assignees: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        projectStage: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
          },
        },
        taskStages: {
          where: {
            isDeleted: false,
          },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            tasks: true,
            taskStages: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    // Check if project exists
    const existingProject = await this.tenantPrisma.client.project.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingProject) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    try {
      // If updating ownerId, verify the new owner exists
      if (updateProjectDto.ownerId) {
        const owner = await this.tenantPrisma.client.user.findUnique({
          where: { id: updateProjectDto.ownerId },
        });

        if (!owner) {
          throw new BadRequestException('Owner not found');
        }
      }

      const project = await this.tenantPrisma.client.project.update({
        where: { id },
        data: updateProjectDto,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          contributors: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          projectStage: {
            select: {
              id: true,
              name: true,
              description: true,
              color: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              taskStages: true,
            },
          },
        },
      });

      return project;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update project');
    }
  }

  async addContributors(
    projectId: string,
    addContributorsDto: AddContributorsDto,
  ): Promise<Project> {
    // Check if project exists
    const existingProject = await this.tenantPrisma.client.project.findFirst({
      where: {
        id: projectId,
        isDeleted: false,
      },
      include: {
        contributors: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingProject) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Verify all users exist
    const users = await this.tenantPrisma.client.user.findMany({
      where: {
        id: { in: addContributorsDto.userIds },
        isDeleted: false,
      },
    });

    if (users.length !== addContributorsDto.userIds.length) {
      throw new BadRequestException('One or more users not found');
    }

    // Filter out users who are already contributors
    const existingContributorIds = existingProject.contributors.map(
      (c) => c.id,
    );
    const newContributorIds = addContributorsDto.userIds.filter(
      (userId) => !existingContributorIds.includes(userId),
    );

    if (newContributorIds.length === 0) {
      throw new BadRequestException(
        'All specified users are already contributors',
      );
    }

    try {
      const project = await this.tenantPrisma.client.project.update({
        where: { id: projectId },
        data: {
          contributors: {
            connect: newContributorIds.map((id) => ({ id })),
          },
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          contributors: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              taskStages: true,
            },
          },
        },
      });

      return project;
    } catch (error) {
      throw new BadRequestException('Failed to add contributors');
    }
  }

  async removeContributors(
    projectId: string,
    removeContributorsDto: RemoveContributorsDto,
  ): Promise<Project> {
    // Check if project exists
    const existingProject = await this.tenantPrisma.client.project.findFirst({
      where: {
        id: projectId,
        isDeleted: false,
      },
      include: {
        contributors: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingProject) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Check if users are actually contributors
    const existingContributorIds = existingProject.contributors.map(
      (c) => c.id,
    );
    const validUserIds = removeContributorsDto.userIds.filter((userId) =>
      existingContributorIds.includes(userId),
    );

    if (validUserIds.length === 0) {
      throw new BadRequestException(
        'None of the specified users are contributors',
      );
    }

    try {
      const project = await this.tenantPrisma.client.project.update({
        where: { id: projectId },
        data: {
          contributors: {
            disconnect: validUserIds.map((id) => ({ id })),
          },
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          contributors: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              taskStages: true,
            },
          },
        },
      });

      return project;
    } catch (error) {
      throw new BadRequestException('Failed to remove contributors');
    }
  }

  async reorderProjects(
    reorderProjectsDto: ReorderProjectsDto,
  ): Promise<{ message: string }> {
    try {
      // Validate all projects exist and get their current data
      const projectIds = reorderProjectsDto.projects.map((p) => p.id);
      const existingProjects = await this.tenantPrisma.client.project.findMany({
        where: {
          id: { in: projectIds },
          isDeleted: false,
        },
        select: {
          id: true,
          projectStageId: true,
        },
      });

      if (existingProjects.length !== projectIds.length) {
        throw new BadRequestException('One or more projects not found');
      }

      // Update each project's order and stage
      const updatePromises = reorderProjectsDto.projects.map((projectOrder) =>
        this.tenantPrisma.client.project.update({
          where: { id: projectOrder.id },
          data: {
            order: projectOrder.order,
            projectStageId: projectOrder.projectStageId,
          },
        }),
      );

      await Promise.all(updatePromises);

      return { message: 'Projects reordered successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to reorder projects');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if project exists
    const existingProject = await this.tenantPrisma.client.project.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingProject) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    try {
      // Soft delete the project
      await this.tenantPrisma.client.project.update({
        where: { id },
        data: {
          isDeleted: true,
        },
      });

      return { message: `Project with ID ${id} has been deleted` };
    } catch (error) {
      throw new BadRequestException('Failed to delete project');
    }
  }

  async findByOwner(ownerId: string): Promise<Project[]> {
    const projects = await this.tenantPrisma.client.project.findMany({
      where: {
        ownerId,
        isDeleted: false,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contributors: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            taskStages: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    return projects;
  }

  async getProjectStats(id: string, userId?: string) {
    const project = await this.findOne(id, userId);

    const stats = await this.tenantPrisma.client.project.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            tasks: {
              where: { isDeleted: false },
            },
            taskStages: {
              where: { isDeleted: false },
            },
          },
        },
        tasks: {
          where: { isDeleted: false },
          select: {
            status: true,
            priority: true,
          },
        },
      },
    });

    const tasksByStatus =
      stats?.tasks.reduce(
        (acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ) || {};

    const tasksByPriority =
      stats?.tasks.reduce(
        (acc, task) => {
          acc[task.priority] = (acc[task.priority] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ) || {};

    return {
      totalTasks: stats?._count.tasks || 0,
      totalTaskStages: stats?._count.taskStages || 0,
      tasksByStatus,
      tasksByPriority,
    };
  }

  async duplicate(
    projectId: string,
    workspaceId: string,
    deep: boolean = false,
  ): Promise<Project> {
    try {
      // Get the original project with all necessary data
      const originalProject = await this.tenantPrisma.client.project.findUnique({
        where: { id: projectId, isDeleted: false },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          contributors: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          projectStage: {
            select: {
              id: true,
              name: true,
              description: true,
              color: true,
            },
          },
          taskStages: deep
            ? {
                where: { isDeleted: false },
                select: {
                  id: true,
                  name: true,
                  description: true,
                  color: true,
                  order: true,
                  isDefault: true,
                },
                orderBy: { order: 'asc' },
              }
            : false,
          _count: {
            select: {
              tasks: true,
              taskStages: true,
            },
          },
        },
      });

      if (!originalProject) {
        throw new NotFoundException('Project not found');
      }

      // Verify workspace exists
      const workspace = await this.tenantPrisma.client.workspace.findUnique({
        where: { id: workspaceId },
      });

      if (!workspace) {
        throw new BadRequestException('Workspace not found');
      }

      // Determine order for the new project
      let order = 0;
      if (originalProject.projectStageId) {
        const maxOrderProject = await this.tenantPrisma.client.project.findFirst({
          where: {
            projectStageId: originalProject.projectStageId,
            isDeleted: false,
          },
          orderBy: { order: 'desc' },
          select: { order: true },
        });
        order = (maxOrderProject?.order ?? -1) + 1;
      }

      // Create the duplicated project
      const duplicatedProject = await this.tenantPrisma.client.project.create({
        data: {
          name: `${originalProject.name} (Copy)`,
          description: originalProject.description,
          startDate: originalProject.startDate,
          endDate: originalProject.endDate,
          workspaceId: workspaceId,
          ownerId: originalProject.ownerId,
          projectStageId: originalProject.projectStageId,
          order: order,
          contributors: {
            connect: originalProject.contributors.map((contributor) => ({
              id: contributor.id,
            })),
          },
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          contributors: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          projectStage: {
            select: {
              id: true,
              name: true,
              description: true,
              color: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              taskStages: true,
            },
          },
        },
      });

      // If deep duplication is requested, also duplicate task stages
      if (
        deep &&
        originalProject.taskStages &&
        originalProject.taskStages.length > 0
      ) {
        const taskStagePromises = originalProject.taskStages.map(
          (taskStage, index) =>
            this.tenantPrisma.client.taskStage.create({
              data: {
                name: taskStage.name,
                description: taskStage.description,
                color: taskStage.color,
                order: taskStage.order ?? index,
                isDefault: taskStage.isDefault,
                projectId: duplicatedProject.id,
              },
            }),
        );

        await Promise.all(taskStagePromises);
      }

      return duplicatedProject;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to duplicate project');
    }
  }
}
