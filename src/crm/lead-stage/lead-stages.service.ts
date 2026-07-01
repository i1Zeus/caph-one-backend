import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeadStageDto } from '../dto/create-lead-stage.dto';
import { UpdateLeadStageDto } from '../dto/update-lead-stage.dto';
import { LeadStage } from '../entities/lead-stage.entity';

@Injectable()
export class LeadStagesService {
  constructor(private prisma: PrismaService) {}

  async create(createLeadStageDto: CreateLeadStageDto): Promise<LeadStage> {
    return await this.prisma.$transaction(async (prisma) => {
      try {
        // Verify that the workspace exists
        const workspace = await prisma.workspace.findFirst({
          where: {
            id: createLeadStageDto.workspaceId,
            isDeleted: false,
          },
        });

        if (!workspace) {
          throw new BadRequestException('Workspace not found');
        }

        // Get ALL lead stages for this workspace (including deleted ones) to check for order conflicts
        // This is necessary because the unique constraint at DB level doesn't consider isDeleted
        const allStages = await prisma.leadStage.findMany({
          where: {
            workspaceId: createLeadStageDto.workspaceId,
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
        let finalOrder = createLeadStageDto.order;

        console.log(`Creating lead stage with requested order: ${finalOrder}`);
        console.log(
          `Active orders for workspace ${createLeadStageDto.workspaceId}:`,
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

        console.log(`Creating lead stage with final order: ${finalOrder}`);

        // Try to create the lead stage with retry logic for constraint violations
        let attempts = 0;
        const maxAttempts = 3;
        let leadStage: any;

        while (attempts < maxAttempts) {
          try {
            leadStage = await prisma.leadStage.create({
              data: {
                ...createLeadStageDto,
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
          `Successfully created lead stage with ID: ${leadStage.id} and order: ${leadStage.order}`,
        );
        return leadStage;
      } catch (error) {
        console.error('Error creating lead stage:', error);
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException('Failed to create lead stage');
      }
    });
  }

  async findAll(): Promise<LeadStage[]> {
    const leadStages = await this.prisma.leadStage.findMany({
      where: { isDeleted: false },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            leads: true,
          },
        },
      },
      orderBy: [{ workspaceId: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
    });

    return leadStages;
  }

  async findByWorkspace(workspaceId: string): Promise<LeadStage[]> {
    // Verify workspace exists
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        isDeleted: false,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const leadStages = await this.prisma.leadStage.findMany({
      where: {
        workspaceId,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            leads: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    return leadStages;
  }

  async findOne(id: string): Promise<LeadStage> {
    const leadStage = await this.prisma.leadStage.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        leads: {
          where: {
            isDeleted: false,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            companyName: true,
          },
        },
        _count: {
          select: {
            leads: true,
          },
        },
      },
    });

    if (!leadStage) {
      throw new NotFoundException(`Lead stage with ID ${id} not found`);
    }

    return leadStage;
  }

  async update(
    id: string,
    updateLeadStageDto: UpdateLeadStageDto,
  ): Promise<LeadStage> {
    // Check if lead stage exists
    const existingLeadStage = await this.prisma.leadStage.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingLeadStage) {
      throw new NotFoundException(`Lead stage with ID ${id} not found`);
    }

    try {
      // If updating workspaceId, verify the new workspace exists
      if (updateLeadStageDto.workspaceId) {
        const workspace = await this.prisma.workspace.findFirst({
          where: {
            id: updateLeadStageDto.workspaceId,
            isDeleted: false,
          },
        });

        if (!workspace) {
          throw new BadRequestException('Workspace not found');
        }
      }

      const leadStage = await this.prisma.leadStage.update({
        where: { id },
        data: updateLeadStageDto,
      });

      return leadStage;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update lead stage');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if lead stage exists
    const existingLeadStage = await this.prisma.leadStage.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingLeadStage) {
      throw new NotFoundException(`Lead stage with ID ${id} not found`);
    }

    // Check if any leads are using this stage
    const leadsUsingStage = await this.prisma.lead.findFirst({
      where: {
        stageId: id,
        isDeleted: false,
      },
    });

    if (leadsUsingStage) {
      throw new BadRequestException(
        'Cannot delete lead stage that is being used by leads',
      );
    }

    try {
      // Soft delete the lead stage
      await this.prisma.leadStage.update({
        where: { id },
        data: {
          isDeleted: true,
        },
      });

      return { message: `Lead stage with ID ${id} has been deleted` };
    } catch {
      throw new BadRequestException('Failed to delete lead stage');
    }
  }

  async reorderStages(
    workspaceId: string,
    stageOrders: { id: string; order: number }[],
  ): Promise<LeadStage[]> {
    // Verify workspace exists
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        isDeleted: false,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    try {
      // Use a transaction to ensure data consistency
      return await this.prisma.$transaction(async (prisma) => {
        // First, temporarily set all orders to negative values to avoid conflicts
        const tempOrders = stageOrders.map((_, index) => -(index + 1000));

        // Update stages with temporary orders
        await Promise.all(
          stageOrders.map(({ id }, index) =>
            prisma.leadStage.update({
              where: { id },
              data: { order: tempOrders[index] },
            }),
          ),
        );

        // Now update with the final orders
        await Promise.all(
          stageOrders.map(({ id, order }) =>
            prisma.leadStage.update({
              where: { id },
              data: { order },
            }),
          ),
        );

        // Return all stages for this workspace in new order
        return this.findByWorkspace(workspaceId);
      });
    } catch (error) {
      console.error('Error reordering lead stages:', error);
      throw new BadRequestException('Failed to reorder lead stages');
    }
  }

  async getStagesWithLeadCounts(workspaceId: string): Promise<any[]> {
    // Verify workspace exists
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        isDeleted: false,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const stages = await this.prisma.leadStage.findMany({
      where: {
        workspaceId,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            leads: {
              where: { isDeleted: false },
            },
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    return stages;
  }

  async getWorkspaceKanban(
    workspaceId: string,
    userId?: string,
    userRole?: string,
  ): Promise<any> {
    // Build workspace access filter
    const workspaceWhereClause: any = {
      id: workspaceId,
      isDeleted: false,
    };

    // Add workspace membership filtering for non-admin users
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
        // Non-admin users can only see workspaces they are members of
        workspaceWhereClause.members = {
          some: {
            userId: userId,
          },
        };
      }
    }

    // Verify workspace exists and user has access
    const workspace = await this.prisma.workspace.findFirst({
      where: workspaceWhereClause,
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    // Fetch stages with their leads
    const stages = await this.prisma.leadStage.findMany({
      where: {
        workspaceId,
        isDeleted: false,
      },
      include: {
        leads: {
          where: { isDeleted: false },
          include: {
            salesMan: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            leadActivities: {
              orderBy: { createdAt: 'desc' },
              include: {
                assignedTo: {
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
                leadActivities: true,
              },
            },
          },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
        _count: {
          select: {
            leads: {
              where: { isDeleted: false },
            },
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    // Fetch unstaged leads (leads with no stage or invalid stage)
    const unstagedLeads = await this.prisma.lead.findMany({
      where: {
        workspaceId,
        isDeleted: false,
        OR: [
          { stageId: null },
          {
            stageId: {
              notIn: stages.map((stage) => stage.id),
            },
          },
        ],
      },
      include: {
        salesMan: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        leadActivities: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedTo: {
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
            leadActivities: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      stages,
      unstagedLeads,
    };
  }
}
