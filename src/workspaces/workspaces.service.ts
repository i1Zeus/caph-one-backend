import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { DynamicPermissionsService } from '../auth/services/dynamic-permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import {
  AddWorkspaceMembersDto,
  RemoveWorkspaceMembersDto,
  UpdateMemberRoleDto,
} from './dto/manage-workspace-members.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { Workspace } from './entities/workspace.entity';

import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(
    private prisma: PrismaService,
    private tenantPrisma: TenantPrismaService,
    private permissionsService: DynamicPermissionsService,
  ) {}

  async create(
    createWorkspaceDto: CreateWorkspaceDto,
    ownerId: string,
  ): Promise<Workspace> {
    // 1. Fetch user's organization and check workspace quota
    const user = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { organizationId: true, isSuperAdmin: true },
    });

    if (user && !user.isSuperAdmin && user.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { maxWorkspaces: true },
      });

      if (org) {
        const workspaceCount = await this.prisma.workspace.count({
          where: {
            organizationId: user.organizationId,
            isDeleted: false,
          },
        });

        if (workspaceCount >= org.maxWorkspaces) {
          throw new ForbiddenException(
            `Workspace limit reached for your organization (max ${org.maxWorkspaces}). Contact administrator.`,
          );
        }
      }
    }

    try {
      // Check if slug already exists
      const existingWorkspace =
        await this.tenantPrisma.client.workspace.findUnique({
          where: { slug: createWorkspaceDto.slug },
        });

      if (existingWorkspace) {
        throw new BadRequestException('Workspace slug already exists');
      }

      // Create workspace and add creator as owner
      const workspace = await this.prisma.workspace.create({
        data: {
          name: createWorkspaceDto.name,
          description: createWorkspaceDto.description,
          slug: createWorkspaceDto.slug,
          members: {
            create: {
              userId: ownerId,
              role: WorkspaceRole.OWNER,
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          projects: {
            where: { isDeleted: false },
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              members: true,
              projects: true,
            },
          },
        },
      });

      return workspace;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create workspace');
    }
  }

  async findAll(userId: string): Promise<Workspace[]> {
    const isAdmin = await this.isUserAdmin(userId);

    const workspaces = await this.prisma.workspace.findMany({
      where: {
        isDeleted: false,
        ...(isAdmin
          ? {}
          : {
              members: {
                some: {
                  userId: userId,
                },
              },
            }),
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        projects: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return workspaces;
  }

  async findOne(id: string, userId: string): Promise<Workspace> {
    const isAdmin = await this.isUserAdmin(userId);

    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id,
        isDeleted: false,
        ...(isAdmin
          ? {}
          : {
              members: {
                some: {
                  userId: userId,
                },
              },
            }),
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                img: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        projects: {
          where: { isDeleted: false },
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                tasks: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException(
        `Workspace with ID ${id} not found or access denied`,
      );
    }

    return workspace;
  }

  async findBySlug(slug: string, userId: string): Promise<Workspace> {
    const isAdmin = await this.isUserAdmin(userId);

    const workspace = await this.prisma.workspace.findFirst({
      where: {
        slug,
        isDeleted: false,
        ...(isAdmin
          ? {}
          : {
              members: {
                some: {
                  userId: userId,
                },
              },
            }),
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                img: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        projects: {
          where: { isDeleted: false },
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                tasks: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException(
        `Workspace with slug ${slug} not found or access denied`,
      );
    }

    return workspace;
  }

  async update(
    id: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
    userId: string,
  ): Promise<Workspace> {
    // Check if user has permission to update workspace
    await this.checkWorkspacePermission(id, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    // If updating slug, check if it already exists
    if (updateWorkspaceDto.slug) {
      const existingWorkspace = await this.prisma.workspace.findFirst({
        where: {
          slug: updateWorkspaceDto.slug,
          NOT: { id },
        },
      });

      if (existingWorkspace) {
        throw new BadRequestException('Workspace slug already exists');
      }
    }

    try {
      const workspace = await this.prisma.workspace.update({
        where: { id },
        data: updateWorkspaceDto,
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          projects: {
            where: { isDeleted: false },
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              members: true,
              projects: true,
            },
          },
        },
      });

      return workspace;
    } catch (error) {
      throw new BadRequestException(error, 'Failed to update workspace');
    }
  }

  async addMembers(
    workspaceId: string,
    addMembersDto: AddWorkspaceMembersDto,
    userId: string,
  ): Promise<{ message: string }> {
    // Check if user has permission to manage members
    await this.checkWorkspacePermission(workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    try {
      // Verify all users exist
      const userIds = addMembersDto.members.map((m) => m.userId);
      const existingUsers = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true },
      });

      if (existingUsers.length !== userIds.length) {
        throw new BadRequestException('One or more users not found');
      }

      // Check for existing memberships
      const existingMemberships = await this.prisma.workspaceUser.findMany({
        where: {
          workspaceId,
          userId: { in: userIds },
        },
      });

      const existingUserIds = existingMemberships.map((m) => m.userId);
      const newMembers = addMembersDto.members.filter(
        (m) => !existingUserIds.includes(m.userId),
      );

      if (newMembers.length === 0) {
        throw new BadRequestException(
          'All specified users are already members of this workspace',
        );
      }

      // Add new members
      await this.prisma.workspaceUser.createMany({
        data: newMembers.map((member) => ({
          workspaceId,
          userId: member.userId,
          role: member.role,
        })),
      });

      return { message: `${newMembers.length} member(s) added successfully` };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to add members');
    }
  }

  async removeMembers(
    workspaceId: string,
    removeMembersDto: RemoveWorkspaceMembersDto,
    userId: string,
  ): Promise<{ message: string }> {
    // Check if user has permission to manage members
    await this.checkWorkspacePermission(workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    // Prevent removing the last owner
    const owners = await this.prisma.workspaceUser.findMany({
      where: {
        workspaceId,
        role: WorkspaceRole.OWNER,
      },
    });

    const ownersToRemove = removeMembersDto.userIds.filter((id) =>
      owners.some((owner) => owner.userId === id),
    );

    if (ownersToRemove.length === owners.length) {
      throw new BadRequestException('Cannot remove all workspace owners');
    }

    try {
      await this.prisma.workspaceUser.deleteMany({
        where: {
          workspaceId,
          userId: { in: removeMembersDto.userIds },
        },
      });

      return {
        message: `${removeMembersDto.userIds.length} member(s) removed successfully`,
      };
    } catch (error) {
      throw new BadRequestException(error, 'Failed to remove members');
    }
  }

  async updateMemberRole(
    workspaceId: string,
    updateRoleDto: UpdateMemberRoleDto,
    userId: string,
  ): Promise<{ message: string }> {
    // Check if user has permission to manage roles
    await this.checkWorkspacePermission(workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    // Prevent changing the last owner's role
    if (updateRoleDto.role !== WorkspaceRole.OWNER) {
      const owners = await this.prisma.workspaceUser.findMany({
        where: {
          workspaceId,
          role: WorkspaceRole.OWNER,
        },
      });

      if (owners.length === 1 && owners[0].userId === updateRoleDto.userId) {
        throw new BadRequestException(
          'Cannot change the role of the last workspace owner',
        );
      }
    }

    try {
      await this.prisma.workspaceUser.update({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: updateRoleDto.userId,
          },
        },
        data: {
          role: updateRoleDto.role,
        },
      });

      return { message: 'Member role updated successfully' };
    } catch (error) {
      throw new BadRequestException(error, 'Failed to update member role');
    }
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    // Only workspace owners can delete workspaces
    await this.checkWorkspacePermission(id, userId, [WorkspaceRole.OWNER]);

    try {
      // Soft delete the workspace
      await this.prisma.workspace.update({
        where: { id },
        data: {
          isDeleted: true,
        },
      });

      return { message: `Workspace has been deleted` };
    } catch (error) {
      throw new BadRequestException(error, 'Failed to delete workspace');
    }
  }

  async getUserRole(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceRole | null> {
    const membership = await this.prisma.workspaceUser.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: {
        role: true,
      },
    });

    return membership?.role || null;
  }

  private async checkWorkspacePermission(
    workspaceId: string,
    userId: string,
    allowedRoles: WorkspaceRole[],
  ): Promise<void> {
    const membership = await this.prisma.workspaceUser.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }
  }

  private async isUserAdmin(userId: string): Promise<boolean> {
    try {
      // Check if user has admin:all permission or workspaces:read permission
      const hasAdminAccess =
        await this.permissionsService.userHasResourcePermission(
          userId,
          'admin',
          'all',
        );

      const hasWorkspaceAccess =
        await this.permissionsService.userHasResourcePermission(
          userId,
          'workspaces',
          'read',
        );

      return hasAdminAccess || hasWorkspaceAccess;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }
}
