import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WhatsAppService } from '../notifications/whatsapp/whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLeadDto,
  CreateLeadStageDto,
  UpdateLeadDto,
  UpdateLeadStageDto,
} from './dto';
import { Lead, LeadStage } from './entities';

@Injectable()
export class CrmService {
  constructor(
    private prisma: PrismaService,
    private whatsAppService: WhatsAppService,
  ) {}

  // ============ LEADS ============

  async createLead(createLeadDto: CreateLeadDto): Promise<Lead> {
    const {
      workspaceId,
      stageId,
      salesManId,
      dateOfBirth,
      sendWelcomeMessage,
      ...leadData
    } = createLeadDto;

    // Ensure workspaceId is provided
    if (!workspaceId) {
      throw new BadRequestException('Workspace ID is required');
    }

    // Verify workspace exists
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, isDeleted: false },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Verify stage exists if provided, otherwise set to null (unstaged)
    let validatedStageId = stageId;
    if (stageId) {
      const stage = await this.prisma.leadStage.findFirst({
        where: { id: stageId, workspaceId, isDeleted: false },
      });
      if (!stage) {
        console.warn(
          `Lead stage ${stageId} not found, creating lead as unstaged`,
        );
        validatedStageId = null;
      }
    }

    // Verify salesMan exists and belongs to workspace if provided
    if (salesManId) {
      const salesMan = await this.prisma.user.findFirst({
        where: {
          id: salesManId,
          isDeleted: false,
          workspaces: {
            some: {
              workspaceId: workspaceId,
            },
          },
        },
      });
      if (!salesMan) {
        throw new NotFoundException(
          'Sales manager not found or not a member of this workspace',
        );
      }
    }

    const lead = await this.prisma.lead.create({
      data: {
        ...leadData,
        workspaceId,
        stageId: validatedStageId,
        salesManId,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      },
      include: {
        stage: true,
        salesMan: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send welcome WhatsApp message if phone is provided and sendWelcomeMessage is not explicitly disabled
    if (lead.phone && sendWelcomeMessage !== false) {
      this.sendWelcomeMessageAsync(lead.phone, lead.name, lead.companyName);
    }

    return lead;
  }

  private async sendWelcomeMessageAsync(
    phone: string,
    name: string,
    companyName?: string,
  ) {
    try {
      await this.whatsAppService.sendLeadWelcomeMessage(
        phone,
        name,
        companyName,
      );
    } catch (error) {
      console.error(
        'Failed to send WhatsApp welcome message asynchronously to lead:',
        error,
      );
    }
  }

  async findAllLeads(workspaceId?: string, stageId?: string): Promise<Lead[]> {
    const where: any = { isDeleted: false };

    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    if (stageId) {
      where.stageId = stageId;
    }

    return this.prisma.lead.findMany({
      where,
      include: {
        stage: true,
        salesMan: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findLeadById(id: string): Promise<Lead> {
    const lead = await this.prisma.lead.findFirst({
      where: { id, isDeleted: false },
      include: {
        stage: true,
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
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async updateLead(id: string, updateLeadDto: UpdateLeadDto): Promise<Lead> {
    const existingLead = await this.findLeadById(id);

    const { stageId, workspaceId, salesManId, dateOfBirth, ...updateData } =
      updateLeadDto;

    // Verify stage exists if provided, otherwise set to null (unstaged)
    let validatedStageId = stageId;
    if (stageId !== undefined) {
      if (stageId) {
        const stage = await this.prisma.leadStage.findFirst({
          where: {
            id: stageId,
            workspaceId: workspaceId || existingLead.workspaceId,
            isDeleted: false,
          },
        });
        if (!stage) {
          console.warn(
            `Lead stage ${stageId} not found, setting lead as unstaged`,
          );
          validatedStageId = null;
        }
      } else {
        validatedStageId = null; // Explicitly setting to unstaged
      }
    }

    // Verify salesMan exists and belongs to workspace if provided
    if (salesManId) {
      const salesMan = await this.prisma.user.findFirst({
        where: {
          id: salesManId,
          isDeleted: false,
          workspaces: {
            some: {
              workspaceId: workspaceId || existingLead.workspaceId,
            },
          },
        },
      });
      if (!salesMan) {
        throw new NotFoundException(
          'Sales manager not found or not a member of this workspace',
        );
      }
    }

    return this.prisma.lead.update({
      where: { id },
      data: {
        ...updateData,
        ...(validatedStageId !== undefined && { stageId: validatedStageId }),
        salesManId,
        ...(dateOfBirth !== undefined && {
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        }),
      },
      include: {
        stage: true,
        salesMan: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async deleteLead(id: string): Promise<void> {
    await this.findLeadById(id);

    await this.prisma.lead.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async moveLeadToStage(leadId: string, stageId: string | null): Promise<Lead> {
    const lead = await this.findLeadById(leadId);

    // Verify stage exists if provided, otherwise move to unstaged
    let validatedStageId = stageId;
    if (stageId) {
      const stage = await this.prisma.leadStage.findFirst({
        where: { id: stageId, workspaceId: lead.workspaceId, isDeleted: false },
      });
      if (!stage) {
        console.warn(
          `Lead stage ${stageId} not found, moving lead to unstaged`,
        );
        validatedStageId = null;
      }
    }

    return this.prisma.lead.update({
      where: { id: leadId },
      data: { stageId: validatedStageId },
      include: {
        stage: true,
        salesMan: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  // ============ LEAD STAGES ============

  async createLeadStage(
    createLeadStageDto: CreateLeadStageDto,
  ): Promise<LeadStage> {
    const { workspaceId, order, ...stageData } = createLeadStageDto;

    // Verify workspace exists
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, isDeleted: false },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // If order is not provided, set it to the next available order
    let stageOrder = order;
    if (stageOrder === undefined) {
      const lastStage = await this.prisma.leadStage.findFirst({
        where: { workspaceId, isDeleted: false },
        orderBy: { order: 'asc' },
      });
      stageOrder = (lastStage?.order || 0) + 1;
    }

    // Check if order already exists in this workspace
    if (stageOrder !== undefined) {
      const existingStage = await this.prisma.leadStage.findFirst({
        where: { workspaceId, order: stageOrder, isDeleted: false },
      });
      if (existingStage) {
        throw new ConflictException(
          'A stage with this order already exists in the workspace',
        );
      }
    }

    return this.prisma.leadStage.create({
      data: {
        ...stageData,
        workspaceId,
        order: stageOrder,
      },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });
  }

  async findAllLeadStages(workspaceId: string): Promise<LeadStage[]> {
    return this.prisma.leadStage.findMany({
      where: { workspaceId, isDeleted: false },
      include: {
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async findLeadStageById(id: string): Promise<LeadStage> {
    const stage = await this.prisma.leadStage.findFirst({
      where: { id, isDeleted: false },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });

    if (!stage) {
      throw new NotFoundException('Lead stage not found');
    }

    return stage;
  }

  async updateLeadStage(
    id: string,
    updateLeadStageDto: UpdateLeadStageDto,
  ): Promise<LeadStage> {
    const existingStage = await this.findLeadStageById(id);

    const { order, ...updateData } = updateLeadStageDto;

    // Check if order already exists in this workspace (excluding current stage)
    if (order !== undefined && order !== existingStage.order) {
      const conflictingStage = await this.prisma.leadStage.findFirst({
        where: {
          workspaceId: existingStage.workspaceId,
          order,
          isDeleted: false,
          id: { not: id },
        },
      });
      if (conflictingStage) {
        throw new ConflictException(
          'A stage with this order already exists in the workspace',
        );
      }
    }

    return this.prisma.leadStage.update({
      where: { id },
      data: {
        ...updateData,
        order,
      },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });
  }

  async deleteLeadStage(id: string): Promise<void> {
    // const existingStage = await this.findLeadStageById(id);

    await this.prisma.leadStage.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async getWorkspaceKanban(workspaceId: string): Promise<any> {
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

  async reorderLeads(
    workspaceId: string,
    leadMoves: { id: string; stageId: string | null; order?: number }[],
  ): Promise<any> {
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
      // Update all leads with new stage assignments and order
      await Promise.all(
        leadMoves.map(async ({ id, stageId, order }) => {
          let validatedStageId = stageId;

          // Verify stage exists if provided, otherwise set to unstaged
          if (stageId) {
            const stage = await this.prisma.leadStage.findFirst({
              where: { id: stageId, workspaceId, isDeleted: false },
            });
            if (!stage) {
              console.warn(
                `Lead stage ${stageId} not found, moving lead ${id} to unstaged`,
              );
              validatedStageId = null;
            }
          }

          const updateData: any = { stageId: validatedStageId };
          if (order !== undefined) {
            updateData.order = order;
          }

          return this.prisma.lead.update({
            where: { id },
            data: updateData,
          });
        }),
      );

      // Return updated kanban view
      return this.getWorkspaceKanban(workspaceId);
    } catch {
      throw new BadRequestException('Failed to reorder leads');
    }
  }
}
