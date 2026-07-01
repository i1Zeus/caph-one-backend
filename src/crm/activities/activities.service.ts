import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, LeadActivity } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService, private tenantPrisma: TenantPrismaService) {}

  async create(createActivityDto: CreateActivityDto): Promise<LeadActivity> {
    // Verify lead exists and user has access
    const lead = await this.tenantPrisma.client.lead.findUnique({
      where: { id: createActivityDto.leadId },
      include: { workspace: { include: { members: true } } },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Clean assignedToId - convert empty string to null
    const assignedToId =
      createActivityDto.assignedToId &&
      createActivityDto.assignedToId.trim() !== ''
        ? createActivityDto.assignedToId
        : null;

    // Verify assigned user exists if provided
    if (assignedToId) {
      const assignedUser = await this.tenantPrisma.client.user.findUnique({
        where: { id: assignedToId },
      });

      if (!assignedUser) {
        throw new NotFoundException('Assigned user not found');
      }

      // Check if assigned user is workspace member
      const isWorkspaceMember = lead.workspace.members.some(
        (member) => member.userId === assignedToId,
      );

      if (!isWorkspaceMember) {
        throw new ForbiddenException('Assigned user is not a workspace member');
      }
    }

    return this.tenantPrisma.client.leadActivity.create({
      data: {
        leadId: createActivityDto.leadId,
        activityType: createActivityDto.activityType,
        activityDate: new Date(createActivityDto.activityDate),
        description: createActivityDto.description,
        meetingLink: createActivityDto.meetingLink,
        assignedToId: assignedToId,
        isDone: createActivityDto.isDone || false,
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAllForLead(leadId: string): Promise<LeadActivity[]> {
    // Verify lead exists
    const lead = await this.tenantPrisma.client.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return this.tenantPrisma.client.leadActivity.findMany({
      where: { leadId },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { activityDate: 'desc' },
    });
  }

  async findOne(id: string): Promise<LeadActivity> {
    const activity = await this.tenantPrisma.client.leadActivity.findUnique({
      where: { id },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    return activity;
  }

  async update(
    id: string,
    updateActivityDto: UpdateActivityDto,
  ): Promise<LeadActivity> {
    // const existingActivity = await this.findOne(id);

    // Clean assignedToId - convert empty string to null
    let assignedToId = updateActivityDto.assignedToId;
    if (assignedToId !== undefined) {
      assignedToId =
        assignedToId && assignedToId.trim() !== '' ? assignedToId : null;
    }

    // Verify assigned user exists if provided
    if (assignedToId) {
      const assignedUser = await this.tenantPrisma.client.user.findUnique({
        where: { id: assignedToId },
      });

      if (!assignedUser) {
        throw new NotFoundException('Assigned user not found');
      }
    }

    const updateData: any = {};
    if (updateActivityDto.activityType)
      updateData.activityType = updateActivityDto.activityType;
    if (updateActivityDto.activityDate)
      updateData.activityDate = new Date(updateActivityDto.activityDate);
    if (updateActivityDto.description !== undefined)
      updateData.description = updateActivityDto.description;
    if (updateActivityDto.meetingLink !== undefined)
      updateData.meetingLink = updateActivityDto.meetingLink;
    if (updateActivityDto.assignedToId !== undefined)
      updateData.assignedToId = assignedToId;
    if (updateActivityDto.isDone !== undefined)
      updateData.isDone = updateActivityDto.isDone;

    return this.tenantPrisma.client.leadActivity.update({
      where: { id },
      data: updateData,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string): Promise<void> {
    // const activity = await this.findOne(id);

    await this.tenantPrisma.client.leadActivity.delete({
      where: { id },
    });
  }

  async toggleDone(id: string): Promise<LeadActivity> {
    const activity = await this.findOne(id);

    return this.tenantPrisma.client.leadActivity.update({
      where: { id },
      data: { isDone: !activity.isDone },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  // Get activities statistics for a lead
  async getLeadActivityStats(leadId: string) {
    const lead = await this.tenantPrisma.client.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const [
      totalActivities,
      activityTypes,
      upcomingActivities,
      recentActivities,
    ] = await Promise.all([
      // Total activities count
      this.tenantPrisma.client.leadActivity.count({
        where: { leadId },
      }),

      // Activities by type
      this.tenantPrisma.client.leadActivity.groupBy({
        by: ['activityType'],
        where: { leadId },
        _count: {
          activityType: true,
        },
      }),

      // Upcoming activities (next 7 days)
      this.tenantPrisma.client.leadActivity.count({
        where: {
          leadId,
          activityDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Recent activities (last 30 days)
      this.tenantPrisma.client.leadActivity.count({
        where: {
          leadId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      totalActivities,
      activityTypes: activityTypes.reduce(
        (acc, item) => {
          acc[item.activityType] = item._count.activityType;
          return acc;
        },
        {} as Record<ActivityType, number>,
      ),
      upcomingActivities,
      recentActivities,
    };
  }

  // Get upcoming activities for workspace (dashboard)
  async getWorkspaceUpcomingActivities(workspaceId: string, limit = 10) {
    return this.tenantPrisma.client.leadActivity.findMany({
      where: {
        lead: { workspaceId },
        activityDate: {
          gte: new Date(),
        },
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { activityDate: 'asc' },
      take: limit,
    });
  }
}
