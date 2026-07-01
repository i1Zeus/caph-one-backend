import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskStageDto } from '../dto/create-task-stage.dto';
import { UpdateTaskStageDto } from '../dto/update-task-stage.dto';
import { TaskStage } from '../entities/task-stage.entity';

@Injectable()
export class TaskStagesService {
  constructor(private prisma: PrismaService) {}

  async create(createTaskStageDto: CreateTaskStageDto): Promise<TaskStage> {
    return await this.prisma.$transaction(async (prisma) => {
      try {
        // Verify that the project exists
        const project = await prisma.project.findFirst({
          where: {
            id: createTaskStageDto.projectId,
            isDeleted: false,
          },
        });

        if (!project) {
          throw new BadRequestException('Project not found');
        }

        // Get ALL task stages for this project (including deleted ones) to check for order conflicts
        // This is necessary because the unique constraint at DB level doesn't consider isDeleted
        const allStages = await prisma.taskStage.findMany({
          where: {
            projectId: createTaskStageDto.projectId,
          },
          select: {
            id: true,
            order: true,
            isDeleted: true,
          },
          orderBy: {
            order: 'asc',
          },
        });

        // Create a set of ALL existing orders (including deleted) for database constraint checking
        const allUsedOrders = new Set(allStages.map((stage) => stage.order));

        // Get active stages only for logical order calculation
        const activeStages = allStages.filter((stage) => !stage.isDeleted);
        const activeOrders = new Set(activeStages.map((stage) => stage.order));

        // Find the next available order that doesn't conflict with ANY existing record
        let finalOrder = createTaskStageDto.order;

        console.log(`Creating task stage with requested order: ${finalOrder}`);
        console.log(
          `Active orders for project ${createTaskStageDto.projectId}:`,
          Array.from(activeOrders),
        );
        console.log(
          `All used orders (including deleted):`,
          Array.from(allUsedOrders),
        );

        if (finalOrder !== undefined) {
          // Check if the order conflicts with ANY existing record (active or deleted)
          if (allUsedOrders.has(finalOrder)) {
            console.log(
              `Order ${finalOrder} conflicts with existing records, finding next available order`,
            );
            // Find the next available order that doesn't conflict with any record
            let nextOrder =
              Math.max(...(Array.from(allUsedOrders) as number[]), 0) + 1;
            while (allUsedOrders.has(nextOrder)) {
              nextOrder++;
            }
            finalOrder = nextOrder;
            console.log(`Assigned new order: ${finalOrder}`);
          }
        } else {
          // If no order specified, assign the next available order
          if (allUsedOrders.size === 0) {
            finalOrder = 0; // Start with 0 if no stages exist
          } else {
            let nextOrder =
              Math.max(...(Array.from(allUsedOrders) as number[])) + 1;
            while (allUsedOrders.has(nextOrder)) {
              nextOrder++;
            }
            finalOrder = nextOrder;
          }
          console.log(`No order specified, assigned: ${finalOrder}`);
        }

        // If this is set as default, unset all other defaults for this project
        if (createTaskStageDto.isDefault) {
          await prisma.taskStage.updateMany({
            where: {
              projectId: createTaskStageDto.projectId,
              isDefault: true,
              isDeleted: false,
            },
            data: { isDefault: false },
          });
        }

        console.log(`Creating task stage with final order: ${finalOrder}`);

        // Try to create the task stage with retry logic for constraint violations
        let attempts = 0;
        const maxAttempts = 3;
        let taskStage: any;

        while (attempts < maxAttempts) {
          try {
            taskStage = await prisma.taskStage.create({
              data: {
                ...createTaskStageDto,
                order: finalOrder,
              },
            });
            break; // Success, exit the retry loop
          } catch (createError: any) {
            attempts++;
            console.log(`Attempt ${attempts} failed:`, createError.message);

            if (
              createError.code === 'P2002' &&
              createError.meta?.target?.includes('order')
            ) {
              // Unique constraint violation on order, try next available order
              if (attempts < maxAttempts) {
                finalOrder =
                  Math.max(
                    ...(Array.from(allUsedOrders) as number[]),
                    finalOrder,
                  ) + 1;
                allUsedOrders.add(finalOrder); // Add to the set to avoid reusing
                console.log(`Retrying with order: ${finalOrder}`);
              } else {
                throw new BadRequestException(
                  'Unable to assign a unique order after multiple attempts',
                );
              }
            } else {
              // Different error, don't retry
              throw createError;
            }
          }
        }

        console.log(
          `Successfully created task stage with ID: ${taskStage.id} and order: ${taskStage.order}`,
        );
        return taskStage;
      } catch (error) {
        console.error('Error creating task stage:', error);
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException('Failed to create task stage');
      }
    });
  }

  async findAll(): Promise<TaskStage[]> {
    const taskStages = await this.prisma.taskStage.findMany({
      where: { isDeleted: false },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: [{ projectId: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
    });

    return taskStages;
  }

  async findByProject(projectId: string): Promise<TaskStage[]> {
    // Check if project exists and is not deleted
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        isDeleted: false,
      },
    });

    // If project is deleted or doesn't exist, return empty array instead of throwing error
    if (!project) {
      return [];
    }

    const taskStages = await this.prisma.taskStage.findMany({
      where: {
        projectId,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    return taskStages;
  }

  async findOne(id: string): Promise<TaskStage> {
    const taskStage = await this.prisma.taskStage.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        tasks: {
          where: {
            isDeleted: false,
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    if (!taskStage) {
      throw new NotFoundException(`Task stage with ID ${id} not found`);
    }

    return taskStage;
  }

  async update(
    id: string,
    updateTaskStageDto: UpdateTaskStageDto,
  ): Promise<TaskStage> {
    // Check if task stage exists
    const existingTaskStage = await this.prisma.taskStage.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingTaskStage) {
      throw new NotFoundException(`Task stage with ID ${id} not found`);
    }

    try {
      // If updating projectId, verify the new project exists
      if (updateTaskStageDto.projectId) {
        const project = await this.prisma.project.findFirst({
          where: {
            id: updateTaskStageDto.projectId,
            isDeleted: false,
          },
        });

        if (!project) {
          throw new BadRequestException('Project not found');
        }
      }

      // If this is set as default, unset all other defaults for this project
      if (updateTaskStageDto.isDefault) {
        const projectId =
          updateTaskStageDto.projectId || existingTaskStage.projectId;
        await this.prisma.taskStage.updateMany({
          where: {
            id: { not: id },
            projectId: projectId,
            isDefault: true,
            isDeleted: false,
          },
          data: { isDefault: false },
        });
      }

      const taskStage = await this.prisma.taskStage.update({
        where: { id },
        data: updateTaskStageDto,
      });

      return taskStage;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update task stage');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if task stage exists
    const existingTaskStage = await this.prisma.taskStage.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingTaskStage) {
      throw new NotFoundException(`Task stage with ID ${id} not found`);
    }

    // Check if any tasks are using this stage
    const tasksUsingStage = await this.prisma.task.findFirst({
      where: {
        taskStageId: id,
        isDeleted: false,
      },
    });

    if (tasksUsingStage) {
      throw new BadRequestException(
        'Cannot delete task stage that is being used by tasks',
      );
    }

    try {
      // Soft delete the task stage
      await this.prisma.taskStage.update({
        where: { id },
        data: {
          isDeleted: true,
        },
      });

      return { message: `Task stage with ID ${id} has been deleted` };
    } catch (error) {
      throw new BadRequestException(error, 'Failed to delete task stage');
    }
  }

  async getDefaultByProject(projectId: string): Promise<TaskStage | null> {
    // Check if project exists and is not deleted
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        isDeleted: false,
      },
    });

    // If project is deleted or doesn't exist, return null instead of throwing error
    if (!project) {
      return null;
    }

    const defaultStage = await this.prisma.taskStage.findFirst({
      where: {
        projectId,
        isDefault: true,
        isDeleted: false,
      },
    });

    return defaultStage;
  }

  async reorderStages(
    projectId: string,
    stageOrders: { id: string; order: number }[],
  ): Promise<TaskStage[]> {
    // Check if project exists and is not deleted
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        isDeleted: false,
      },
    });

    // If project is deleted or doesn't exist, return empty array instead of throwing error
    if (!project) {
      return [];
    }

    if (stageOrders.length === 0) {
      return this.findByProject(projectId);
    }

    try {
      // Get ALL stages in the project (including deleted) to handle unique constraint properly
      // The unique constraint applies to all rows, not just non-deleted ones
      const allStagesInProject = await this.prisma.taskStage.findMany({
        where: { projectId }, // Include deleted stages!
        select: { id: true, order: true, isDeleted: true },
      });

      // Use a three-step transaction to avoid unique constraint conflicts
      await this.prisma.$transaction(async (prisma) => {
        // Step 1: Set ALL stages in the project (including deleted) to large negative temporary order values
        const baseOffset = -1000000;
        for (let i = 0; i < allStagesInProject.length; i++) {
          await prisma.taskStage.update({
            where: { id: allStagesInProject[i].id },
            data: { order: baseOffset - i },
          });
        }

        // Step 2: Set the final order values for the stages being reordered
        for (const { id, order } of stageOrders) {
          await prisma.taskStage.update({
            where: { id },
            data: { order },
          });
        }

        // Step 3: For any non-deleted stages not included in the reorder request,
        // set them to orders after the reordered ones
        const reorderedIds = new Set(stageOrders.map((s) => s.id));
        const maxReorderedOrder = Math.max(...stageOrders.map((s) => s.order));
        let nextOrder = maxReorderedOrder + 1;

        for (const existingStage of allStagesInProject) {
          if (!reorderedIds.has(existingStage.id) && !existingStage.isDeleted) {
            await prisma.taskStage.update({
              where: { id: existingStage.id },
              data: { order: nextOrder++ },
            });
          }
        }

        // Step 4: Set deleted stages to very high order values to avoid future conflicts
        let deletedOrder = 900000;
        for (const existingStage of allStagesInProject) {
          if (existingStage.isDeleted) {
            await prisma.taskStage.update({
              where: { id: existingStage.id },
              data: { order: deletedOrder++ },
            });
          }
        }
      });

      // Return all stages for this project in new order
      return this.findByProject(projectId);
    } catch (error) {
      console.error('Error reordering task stages:', error);
      throw new BadRequestException('Failed to reorder task stages');
    }
  }

  async getStagesWithTaskCounts(projectId: string): Promise<any[]> {
    // Check if project exists and is not deleted
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        isDeleted: false,
      },
    });

    // If project is deleted or doesn't exist, return empty array instead of throwing error
    if (!project) {
      return [];
    }

    const stages = await this.prisma.taskStage.findMany({
      where: {
        projectId,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            tasks: {
              where: { isDeleted: false },
            },
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    return stages;
  }

  async getProjectKanban(
    projectId: string,
    userId?: string,
    userRole?: string,
  ): Promise<any[]> {
    // Build project access filter
    const projectWhereClause: any = {
      id: projectId,
      isDeleted: false,
    };

    // Add project membership filtering for non-admin users
    if (userId && userRole) {
      const adminRoles = [
        'ADMIN',
        'SUPER_ADMIN',
        'MANAGER',
        'DIRECTOR',
        'MARKETING_MANAGER',
      ];
      const isAdmin = adminRoles.includes(userRole);

      if (!isAdmin) {
        // Non-admin users can only see projects they are members of
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

    // Verify project exists and user has access
    const project = await this.prisma.project.findFirst({
      where: projectWhereClause,
    });

    // If project is deleted or doesn't exist, return empty array instead of throwing error
    if (!project) {
      return [];
    }

    const stages = await this.prisma.taskStage.findMany({
      where: {
        projectId,
        isDeleted: false,
      },
      include: {
        tasks: {
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
            timeStamps: {
              where: { isDeleted: false },
              select: {
                startDate: true,
                endDate: true,
              },
              orderBy: {
                startDate: 'asc',
              },
            },
            comments: {
              where: { isDeleted: false },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
            _count: {
              select: {
                comments: {
                  where: { isDeleted: false },
                },
              },
            },
          },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        },
        _count: {
          select: {
            tasks: {
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
            },
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    return stages;
  }
}
