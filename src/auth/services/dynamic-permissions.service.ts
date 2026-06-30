import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResourceNormalizer } from '../utils/resource-normalizer.util';
import { DatabaseModelsService } from './database-models.service';

export interface CreateRoleDto {
  name: string;
  description?: string;
  color?: string;
  isSystem?: boolean;
}

export interface AssignPermissionsDto {
  roleId: string;
  permissionIds: string[];
}

export interface AssignRoleToUserDto {
  userId: string;
  roleIds: string[];
}

/**
 * Dynamic Permissions Service
 *
 * This service now supports FLEXIBLE permission checking that works with both:
 * - Singular forms: 'user:read', 'project:create', 'employee:update'
 * - Plural forms: 'users:read', 'projects:create', 'employees:update'
 *
 * No more hardcoding! The system automatically:
 * 1. Checks both singular and plural permission variations
 * 2. Falls back to admin:all for super admin access
 * 3. Auto-creates missing permissions when roles are assigned
 *
 * Examples of what works now:
 * ✅ User has 'users:read' permission → can access both UsersController and UserController
 * ✅ User has 'user:read' permission → can access both UsersController and UserController
 * ✅ User has 'projects:create' permission → can create in both ProjectsController and ProjectController
 * ✅ User has 'admin:all' permission → can access EVERYTHING
 */
@Injectable()
export class DynamicPermissionsService {
  constructor(
    private prisma: PrismaService,
    private databaseModelsService: DatabaseModelsService,
  ) {}

  // ===== USER PERMISSION CHECKS =====

  /**
   * Check if a user has specific permissions
   * Now supports flexible matching (plural/singular)
   */
  async userHasPermissions(
    userId: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    if (requiredPermissions.length === 0) {
      return true;
    }

    // Get all user permissions through their roles
    const userPermissions = await this.getUserPermissions(userId);

    // Check admin:all first
    if (userPermissions.includes('admin:all')) {
      return true;
    }

    // Check if all required permissions are present (with flexible matching)
    return requiredPermissions.every((requiredPermission) => {
      // Direct match first
      if (userPermissions.includes(requiredPermission)) {
        return true;
      }

      // Try plural/singular variations
      const [resource, action] = requiredPermission.split(':');
      if (resource && action) {
        const variations = ResourceNormalizer.generatePermissionVariations(
          resource,
          action,
        );
        return variations.some((variation) =>
          userPermissions.includes(variation),
        );
      }

      return false;
    });
  }

  /**
   * Check if a user has a specific permission
   */
  async userHasPermission(
    userId: string,
    permission: string,
  ): Promise<boolean> {
    return this.userHasPermissions(userId, [permission]);
  }

  /**
   * Check if user has permission for a specific resource and action
   * Now supports both plural and singular forms (e.g., 'users:read' or 'user:read')
   */
  async userHasResourcePermission(
    userId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    // Generate all possible permission variations (plural and singular)
    const permissionVariations =
      ResourceNormalizer.generatePermissionVariations(resource, action);

    console.log(
      `🔍 Checking permissions for user ${userId}: ${permissionVariations.join(' OR ')}`,
    );

    // Check if user has ANY of the permission variations
    for (const permission of permissionVariations) {
      const hasPermission = await this.userHasPermission(userId, permission);
      if (hasPermission) {
        console.log(`✅ Found matching permission: ${permission}`);
        return true;
      }
    }

    // Also check for admin:all permission
    const hasAdminAll = await this.userHasPermission(userId, 'admin:all');
    if (hasAdminAll) {
      console.log(`✅ User has admin:all permission`);
      return true;
    }

    console.log(
      `❌ No matching permissions found for: ${permissionVariations.join(' OR ')}`,
    );
    return false;
  }

  /**
   * Get all permissions for a user (through their roles)
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        isDeleted: false,
        role: {
          isDeleted: false,
        },
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              where: {
                isDeleted: false,
                permission: {
                  isDeleted: false,
                },
              },
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const permissions = new Set<string>();

    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        permissions.add(rolePermission.permission.name);
      }
    }

    return Array.from(permissions);
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId: string) {
    return this.prisma.userRole.findMany({
      where: {
        userId,
        isDeleted: false,
        role: {
          isDeleted: false,
        },
      },
      include: {
        role: true,
      },
    });
  }

  // ===== ROLE MANAGEMENT =====

  /**
   * Create a new role
   */
  async createRole(data: CreateRoleDto) {
    return this.prisma.role.create({
      data,
    });
  }

  /**
   * Update a role
   */
  async updateRole(roleId: string, data: Partial<CreateRoleDto>) {
    return this.prisma.role.update({
      where: { id: roleId },
      data,
    });
  }

  /**
   * Delete a role (soft delete) and all related records
   */
  async deleteRole(roleId: string) {
    // Check if it's a system role
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (role?.isSystem) {
      throw new Error('Cannot delete system role');
    }

    // Use a transaction to ensure all related records are properly handled
    return this.prisma.$transaction(async (tx) => {
      console.log(`🔄 Starting role deletion process for role: ${roleId}`);

      // 1. Soft delete all user-role assignments for this role
      const userRoleDeletions = await tx.userRole.updateMany({
        where: {
          roleId,
          isDeleted: false,
        },
        data: { isDeleted: true },
      });
      console.log(
        `🗑️ Soft deleted ${userRoleDeletions.count} user-role assignments`,
      );

      // 2. Soft delete all role-permission assignments for this role
      const rolePermissionDeletions = await tx.rolePermission.updateMany({
        where: {
          roleId,
          isDeleted: false,
        },
        data: { isDeleted: true },
      });
      console.log(
        `🗑️ Soft deleted ${rolePermissionDeletions.count} role-permission assignments`,
      );

      // 3. Finally, soft delete the role itself
      const deletedRole = await tx.role.update({
        where: { id: roleId },
        data: { isDeleted: true },
      });
      console.log(`✅ Successfully deleted role: ${deletedRole.name}`);

      return deletedRole;
    });
  }

  /**
   * Get all roles
   */
  async getAllRoles() {
    return this.prisma.role.findMany({
      where: { isDeleted: false },
      include: {
        rolePermissions: {
          where: { isDeleted: false },
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: {
              where: { isDeleted: false },
            },
          },
        },
      },
    });
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: string) {
    return this.prisma.role.findUnique({
      where: { id: roleId, isDeleted: false },
      include: {
        rolePermissions: {
          where: { isDeleted: false },
          include: {
            permission: true,
          },
        },
        userRoles: {
          where: { isDeleted: false },
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
      },
    });
  }

  // ===== PERMISSION MANAGEMENT =====

  /**
   * Assign permissions to a role (SMART UPDATE - only changes what's needed)
   */
  async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    // Use a transaction to ensure data consistency
    return this.prisma.$transaction(async (prisma) => {
      // Get current permissions for this role
      const currentRolePermissions = await prisma.rolePermission.findMany({
        where: {
          roleId,
          isDeleted: false,
        },
        include: {
          permission: true,
        },
      });

      const currentPermissionIds = currentRolePermissions.map(
        (rp) => rp.permissionId,
      );

      console.log(
        `🔍 Current permissions for role ${roleId}:`,
        currentPermissionIds,
      );
      console.log(`🎯 Target permissions for role ${roleId}:`, permissionIds);

      // Find permissions to add (in target but not in current)
      const permissionsToAdd = permissionIds.filter(
        (id) => !currentPermissionIds.includes(id),
      );

      // Find permissions to remove (in current but not in target)
      const permissionsToRemove = currentPermissionIds.filter(
        (id) => !permissionIds.includes(id),
      );

      console.log(`➕ Permissions to add:`, permissionsToAdd);
      console.log(`➖ Permissions to remove:`, permissionsToRemove);

      // Remove permissions that are no longer needed
      if (permissionsToRemove.length > 0) {
        await prisma.rolePermission.updateMany({
          where: {
            roleId,
            permissionId: { in: permissionsToRemove },
            isDeleted: false,
          },
          data: { isDeleted: true },
        });
        console.log(`🗑️ Removed ${permissionsToRemove.length} permissions`);
      }

      // Add new permissions
      if (permissionsToAdd.length > 0) {
        // First, check if any of these role-permission combinations exist but are marked as deleted
        const existingDeletedRolePermissions =
          await prisma.rolePermission.findMany({
            where: {
              roleId,
              permissionId: { in: permissionsToAdd },
              isDeleted: true,
            },
          });

        const existingDeletedPermissionIds = existingDeletedRolePermissions.map(
          (rp) => rp.permissionId,
        );
        const trulyNewPermissionIds = permissionsToAdd.filter(
          (id) => !existingDeletedPermissionIds.includes(id),
        );

        // Reactivate existing deleted role-permissions
        if (existingDeletedPermissionIds.length > 0) {
          await prisma.rolePermission.updateMany({
            where: {
              roleId,
              permissionId: { in: existingDeletedPermissionIds },
              isDeleted: true,
            },
            data: { isDeleted: false },
          });
          console.log(
            `🔄 Reactivated ${existingDeletedPermissionIds.length} existing role-permissions`,
          );
        }

        // Create truly new role-permissions
        if (trulyNewPermissionIds.length > 0) {
          const newRolePermissions = trulyNewPermissionIds.map(
            (permissionId) => ({
              roleId,
              permissionId,
              isDeleted: false,
            }),
          );

          await prisma.rolePermission.createMany({
            data: newRolePermissions,
            skipDuplicates: true,
          });
          console.log(
            `📝 Created ${trulyNewPermissionIds.length} new role-permissions`,
          );
        }
      }

      console.log(
        `✅ Smart update completed for role ${roleId}: +${permissionsToAdd.length} -${permissionsToRemove.length}`,
      );

      // Return the updated role with permissions
      return prisma.role.findUnique({
        where: { id: roleId },
        include: {
          rolePermissions: {
            where: { isDeleted: false },
            include: {
              permission: true,
            },
          },
        },
      });
    });
  }

  /**
   * Add specific permissions to a role (without removing existing ones)
   */
  async addPermissionsToRole(roleId: string, permissionIds: string[]) {
    const rolePermissions = permissionIds.map((permissionId) => ({
      roleId,
      permissionId,
    }));

    return this.prisma.rolePermission.createMany({
      data: rolePermissions,
      skipDuplicates: true,
    });
  }

  /**
   * Remove specific permissions from a role
   */
  async removePermissionsFromRole(roleId: string, permissionIds: string[]) {
    return this.prisma.rolePermission.updateMany({
      where: {
        roleId,
        permissionId: { in: permissionIds },
      },
      data: { isDeleted: true },
    });
  }

  /**
   * Get all permissions for a role
   */
  async getRolePermissions(roleId: string): Promise<string[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        roleId,
        isDeleted: false,
        permission: {
          isDeleted: false,
        },
      },
      include: {
        permission: true,
      },
    });

    return rolePermissions.map((rp) => rp.permission.name);
  }

  // ===== USER-ROLE ASSIGNMENT =====

  /**
   * Assign roles to a user (replaces all existing roles)
   */
  async assignRolesToUser(userId: string, roleIds: string[]) {
    console.log(`🔄 Assigning roles to user ${userId}:`, roleIds);

    // Get current user roles
    const currentRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      select: { roleId: true },
    });

    const currentRoleIds = currentRoles.map((ur) => ur.roleId);
    console.log(`📋 Current roles:`, currentRoleIds);
    console.log(`🎯 New roles:`, roleIds);

    // Determine which roles to remove and which to add
    const rolesToRemove = currentRoleIds.filter(
      (roleId) => !roleIds.includes(roleId),
    );
    const rolesToAdd = roleIds.filter(
      (roleId) => !currentRoleIds.includes(roleId),
    );

    console.log(`❌ Roles to remove:`, rolesToRemove);
    console.log(`➕ Roles to add:`, rolesToAdd);

    // Start a transaction to ensure consistency
    return await this.prisma.$transaction(async (tx) => {
      // Remove roles that are no longer assigned
      if (rolesToRemove.length > 0) {
        await tx.userRole.updateMany({
          where: {
            userId,
            roleId: { in: rolesToRemove },
            isDeleted: false,
          },
          data: { isDeleted: true },
        });
        console.log(`✅ Removed ${rolesToRemove.length} roles`);
      }

      // Add new roles
      if (rolesToAdd.length > 0) {
        // First, check if any of these roles were previously assigned but marked as deleted
        const existingDeletedRoles = await tx.userRole.findMany({
          where: {
            userId,
            roleId: { in: rolesToAdd },
            isDeleted: true,
          },
        });

        // Reactivate previously deleted roles
        if (existingDeletedRoles.length > 0) {
          const roleIdsToReactivate = existingDeletedRoles.map(
            (ur) => ur.roleId,
          );
          await tx.userRole.updateMany({
            where: {
              userId,
              roleId: { in: roleIdsToReactivate },
              isDeleted: true,
            },
            data: { isDeleted: false },
          });
          console.log(
            `🔄 Reactivated ${roleIdsToReactivate.length} previously deleted roles`,
          );
        }

        // Create completely new role assignments
        const newRoleIds = rolesToAdd.filter(
          (roleId) => !existingDeletedRoles.some((ur) => ur.roleId === roleId),
        );

        if (newRoleIds.length > 0) {
          const newUserRoles = newRoleIds.map((roleId) => ({
            userId,
            roleId,
          }));

          await tx.userRole.createMany({
            data: newUserRoles,
            skipDuplicates: true,
          });
          console.log(`✅ Created ${newRoleIds.length} new role assignments`);
        }
      }

      // Return updated user roles for verification
      const updatedRoles = await tx.userRole.findMany({
        where: {
          userId,
          isDeleted: false,
        },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });

      console.log(
        `🎯 Final roles for user ${userId}:`,
        updatedRoles.map((ur) => ur.role.name),
      );
      return updatedRoles;
    });
  }

  /**
   * Add specific roles to a user (without removing existing ones)
   */
  async addRolesToUser(userId: string, roleIds: string[]) {
    const userRoles = roleIds.map((roleId) => ({
      userId,
      roleId,
    }));

    return this.prisma.userRole.createMany({
      data: userRoles,
      skipDuplicates: true,
    });
  }

  /**
   * Remove specific roles from a user
   */
  async removeRolesFromUser(userId: string, roleIds: string[]) {
    return this.prisma.userRole.updateMany({
      where: {
        userId,
        roleId: { in: roleIds },
      },
      data: { isDeleted: true },
    });
  }

  // ===== PERMISSION CREATION =====

  /**
   * Create a new permission
   */
  async createPermission(name: string, description?: string) {
    const [resource, action] = name.split(':');

    return this.prisma.permission.create({
      data: {
        name,
        description,
        resource,
        action,
      },
    });
  }

  /**
   * Get all available permissions
   */
  async getAllPermissions() {
    return this.prisma.permission.findMany({
      where: { isDeleted: false },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  /**
   * Get permissions grouped by resource
   */
  async getPermissionsByResource(): Promise<Record<string, any[]>> {
    const permissions = await this.getAllPermissions();

    return permissions.reduce(
      (acc, permission) => {
        if (!acc[permission.resource]) {
          acc[permission.resource] = [];
        }
        acc[permission.resource].push({
          id: permission.id,
          name: permission.name,
          action: permission.action,
          description: permission.description,
        });
        return acc;
      },
      {} as Record<string, any[]>,
    );
  }

  /**
   * Seed default permissions for all database models (now completely dynamic!)
   */
  async seedDefaultPermissions(): Promise<void> {
    await this.databaseModelsService.seedAllModelPermissions();
  }

  /**
   * Seed default system roles
   */
  async seedDefaultRoles(): Promise<void> {
    const defaultRoles = [
      {
        name: 'Super Admin',
        description: 'Full system access',
        color: '#f44336',
        isSystem: true,
      },
      {
        name: 'Admin',
        description: 'Administrative access',
        color: '#ff9800',
        isSystem: true,
      },
      {
        name: 'Manager',
        description: 'Management access',
        color: '#2196f3',
        isSystem: false,
      },
      {
        name: 'Employee',
        description: 'Basic employee access',
        color: '#4caf50',
        isSystem: false,
      },
      {
        name: 'Designer',
        description:
          'Design-focused role with task viewing and collaboration access',
        color: '#EC4899',
        isSystem: false,
      },
    ];

    for (const roleData of defaultRoles) {
      await this.prisma.role.upsert({
        where: { name: roleData.name },
        update: {},
        create: roleData,
      });
    }
  }
}
