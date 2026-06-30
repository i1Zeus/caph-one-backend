import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DynamicPermissionsService } from '../../auth/services/dynamic-permissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectStageDto } from '../dto/create-project-stage.dto';
import { UpdateProjectStageDto } from '../dto/update-project-stage.dto';
import { ProjectStage } from '../entities/project-stage.entity';

@Injectable()
export class ProjectStagesService {
  constructor(
    private prisma: PrismaService,
    private dynamicPermissionsService: DynamicPermissionsService,
  ) {}

  async create(
    createProjectStageDto: CreateProjectStageDto,
  ): Promise<ProjectStage> {
    try {
      // Verify workspace exists
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: createProjectStageDto.workspaceId },
      });

      if (!workspace) {
        throw new BadRequestException('Workspace not found');
      }

      // Determine order if not provided (within the workspace)
      let order = createProjectStageDto.order;
      if (order === undefined) {
        const maxOrderStage = await this.prisma.projectStage.findFirst({
          where: {
            workspaceId: createProjectStageDto.workspaceId,
            isDeleted: false,
          },
          orderBy: { order: 'desc' },
          select: { order: true },
        });
        order = (maxOrderStage?.order ?? -1) + 1;
      }

      const projectStage = await this.prisma.projectStage.create({
        data: {
          name: createProjectStageDto.name,
          description: createProjectStageDto.description,
          color: createProjectStageDto.color,
          order: order,
          workspaceId: createProjectStageDto.workspaceId,
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              projects: true,
            },
          },
        },
      });

      return projectStage;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create project stage');
    }
  }

  async findAll(workspaceId?: string): Promise<ProjectStage[]> {
    const whereClause: any = { isDeleted: false };

    if (workspaceId) {
      whereClause.workspaceId = workspaceId;
    }

    const projectStages = await this.prisma.projectStage.findMany({
      where: whereClause,
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            projects: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    return projectStages;
  }

  async findOne(id: string): Promise<ProjectStage> {
    const projectStage = await this.prisma.projectStage.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        projects: {
          where: {
            isDeleted: false,
          },
          select: {
            id: true,
            name: true,
            description: true,
            ownerId: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            projects: true,
          },
        },
      },
    });

    if (!projectStage) {
      throw new NotFoundException(`Project stage with ID ${id} not found`);
    }

    return projectStage;
  }

  async update(
    id: string,
    updateProjectStageDto: UpdateProjectStageDto,
  ): Promise<ProjectStage> {
    // Check if project stage exists
    const existingProjectStage = await this.prisma.projectStage.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingProjectStage) {
      throw new NotFoundException(`Project stage with ID ${id} not found`);
    }

    try {
      const projectStage = await this.prisma.projectStage.update({
        where: { id },
        data: updateProjectStageDto,
      });

      return projectStage;
    } catch (error) {
      throw new BadRequestException('Failed to update project stage');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if project stage exists
    const existingProjectStage = await this.prisma.projectStage.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingProjectStage) {
      throw new NotFoundException(`Project stage with ID ${id} not found`);
    }

    // Check if any projects are using this stage
    const projectsUsingStage = await this.prisma.project.findFirst({
      where: {
        projectStageId: id,
        isDeleted: false,
      },
    });

    if (projectsUsingStage) {
      throw new BadRequestException(
        'Cannot delete project stage that is being used by projects',
      );
    }

    try {
      // Soft delete the project stage
      await this.prisma.projectStage.update({
        where: { id },
        data: {
          isDeleted: true,
        },
      });

      return { message: `Project stage with ID ${id} has been deleted` };
    } catch (error) {
      throw new BadRequestException('Failed to delete project stage');
    }
  }

  async getStageWithProjectCounts(id: string): Promise<any> {
    const projectStage = await this.prisma.projectStage.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            projects: {
              where: {
                isDeleted: false,
              },
            },
          },
        },
      },
    });

    if (!projectStage) {
      throw new NotFoundException(`Project stage with ID ${id} not found`);
    }

    return projectStage;
  }

  async getKanbanData(
    userId?: string,
    userRole?: string,
    workspaceId?: string,
    search?: string,
    startDate?: string,
    endDate?: string,
    ownerIds?: string[],
    collaboratorIds?: string[],
    createdByIds?: string[],
  ): Promise<any> {
    console.log('🔍 getKanbanData called with:', {
      userId,
      userRole,
      workspaceId,
      search,
      startDate,
      endDate,
      ownerIds,
      collaboratorIds,
      createdByIds,
    });

    if (!workspaceId) {
      console.log('❌ No workspace ID provided');
      throw new BadRequestException('Workspace ID is required');
    }

    // Check if user has admin or projectstages:read permission
    let hasProjectsAccess = false;
    if (userId) {
      console.log('🔍 Checking permissions for user:', userId);

      const hasAdminAll =
        await this.dynamicPermissionsService.userHasResourcePermission(
          userId,
          'admin',
          'all',
        );
      const hasProjectStagesRead =
        await this.dynamicPermissionsService.userHasResourcePermission(
          userId,
          'projectstages',
          'read',
        );

      hasProjectsAccess = hasAdminAll || hasProjectStagesRead;

      console.log('🔍 Permission check results:', {
        hasAdminAll,
        hasProjectStagesRead,
        hasProjectsAccess,
      });
    } else {
      console.log('❌ No user ID provided');
    }

    const projectWhereClause: any = {
      workspaceId: workspaceId,
      isDeleted: false,
    };

    // Add search filter
    if (search) {
      projectWhereClause.OR = projectWhereClause.OR || [];
      projectWhereClause.OR.push(
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      );
    }

    // Add date filter
    if (startDate && endDate) {
      projectWhereClause.createdAt = {
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

    if (combinedOwnerIds.length > 0) {
      projectWhereClause.ownerId = { in: combinedOwnerIds };
    }

    // Add collaborator filter
    if (collaboratorIds && collaboratorIds.length > 0) {
      projectWhereClause.contributors = {
        some: {
          id: { in: collaboratorIds },
        },
      };
    }

    // For users without admin/projectstages:read permission, only show projects they own or contribute to
    if (!hasProjectsAccess && userId) {
      // If OR already exists (from search), wrap it with AND
      if (projectWhereClause.OR) {
        const searchOR = projectWhereClause.OR;
        delete projectWhereClause.OR;
        projectWhereClause.AND = [
          { OR: searchOR },
          {
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
        ];
      } else {
        projectWhereClause.OR = [
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
    }

    // Get stages with their projects
    const stages = await this.prisma.projectStage.findMany({
      where: {
        workspaceId: workspaceId,
        isDeleted: false,
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        projects: {
          where: projectWhereClause,
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
              where: { isDeleted: false },
              select: {
                status: true,
              },
            },
            _count: {
              select: {
                tasks: {
                  where: { isDeleted: false },
                },
              },
            },
          },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        },
        _count: {
          select: {
            projects: {
              where: projectWhereClause,
            },
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    // Get unstaged projects (projects without a stage in this workspace)
    const unstagedProjects = await this.prisma.project.findMany({
      where: {
        ...projectWhereClause,
        projectStageId: null,
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
        tasks: {
          where: { isDeleted: false },
          select: {
            status: true,
          },
        },
        _count: {
          select: {
            tasks: {
              where: { isDeleted: false },
            },
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    // Transform project data to include task status counts
    const transformProject = (project: any) => {
      const taskStats = project.tasks.reduce(
        (acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        ...project,
        taskStats: {
          total: project._count.tasks,
          completed: taskStats.COMPLETED || 0,
          inProgress: taskStats.IN_PROGRESS || 0,
          pending: taskStats.PENDING || 0,
          onHold: taskStats.ON_HOLD || 0,
          canceled: taskStats.CANCELED || 0,
        },
        // Remove the tasks array to keep response clean
        tasks: undefined,
      };
    };

    // Transform stages data
    const transformedStages = stages.map((stage) => ({
      ...stage,
      projects: stage.projects.map(transformProject),
    }));

    // Add unstaged projects as a special stage if there are any
    if (unstagedProjects.length > 0) {
      transformedStages.unshift({
        id: 'unstaged',
        name: 'Unstaged',
        description: 'Projects without a specific stage',
        color: '#6B7280',
        order: -1,
        workspaceId: workspaceId,
        workspace: stages[0]?.workspace || null,
        projects: unstagedProjects.map(transformProject),
        _count: {
          projects: unstagedProjects.length,
        },
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log('✅ Returning transformed stages:', {
      stagesCount: transformedStages.length,
      stagesWithProjects: transformedStages.map((s) => ({
        id: s.id,
        name: s.name,
        projectCount: s.projects?.length || 0,
      })),
    });

    return transformedStages;
  }

  async reorderStages(
    stages: { id: string; order: number }[],
  ): Promise<{ message: string }> {
    try {
      if (stages.length === 0) {
        return { message: 'No stages to reorder' };
      }

      // Get the workspace ID from the first stage to find all stages in that workspace
      const firstStage = await this.prisma.projectStage.findUnique({
        where: { id: stages[0].id },
        select: { workspaceId: true },
      });

      if (!firstStage) {
        throw new BadRequestException('Stage not found');
      }

      // Get all stages in the workspace (including deleted) to handle unique constraint properly
      const allStagesInWorkspace = await this.prisma.projectStage.findMany({
        where: { workspaceId: firstStage.workspaceId },
        select: { id: true, order: true, isDeleted: true },
      });

      // Use a four-step transaction to avoid unique constraint conflicts
      await this.prisma.$transaction(async (prisma) => {
        // Step 1: Set ALL stages in the workspace to negative temporary order values
        const baseOffset = -1000000;
        for (let i = 0; i < allStagesInWorkspace.length; i++) {
          await prisma.projectStage.update({
            where: { id: allStagesInWorkspace[i].id },
            data: { order: baseOffset - i },
          });
        }

        // Step 2: Set the final order values for the stages being reordered
        for (const stage of stages) {
          await prisma.projectStage.update({
            where: { id: stage.id },
            data: { order: stage.order },
          });
        }

        // Step 3: For any non-deleted stages not included in the reorder request,
        // set them to orders after the reordered ones
        const reorderedIds = new Set(stages.map((s) => s.id));
        const maxReorderedOrder = Math.max(...stages.map((s) => s.order));
        let nextOrder = maxReorderedOrder + 1;

        for (const existingStage of allStagesInWorkspace) {
          if (!reorderedIds.has(existingStage.id) && !existingStage.isDeleted) {
            await prisma.projectStage.update({
              where: { id: existingStage.id },
              data: { order: nextOrder++ },
            });
          }
        }

        // Step 4: Set deleted stages to very high order values to avoid future conflicts
        let deletedOrder = 900000;
        for (const existingStage of allStagesInWorkspace) {
          if (existingStage.isDeleted) {
            await prisma.projectStage.update({
              where: { id: existingStage.id },
              data: { order: deletedOrder++ },
            });
          }
        }
      });

      return { message: 'Project stages reordered successfully' };
    } catch (error) {
      console.error('Error reordering stages:', error);
      throw new BadRequestException('Failed to reorder project stages');
    }
  }
}
