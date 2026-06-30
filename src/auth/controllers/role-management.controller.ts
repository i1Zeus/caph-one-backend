import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Auth } from '../decorators/universal-auth.decorator';
import { DatabaseModelsService } from '../services/database-models.service';
import {
  CreateRoleDto,
  DynamicPermissionsService,
} from '../services/dynamic-permissions.service';

export interface CreateRoleWithPermissionsDto {
  role: CreateRoleDto;
  permissions: string[]; // Array of permission names like ['users:read', 'projects:create']
}

export interface UpdateRolePermissionsDto {
  permissions: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  color?: string;
  permissions?: string[];
}

@Controller('role-management')
export class RoleManagementController {
  constructor(
    private readonly permissionsService: DynamicPermissionsService,
    private readonly databaseModelsService: DatabaseModelsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get all database models with their permissions for the UI
   */
  @Get('models')
  @Auth('read', 'roles')
  async getModelsWithPermissions() {
    try {
      const models = await this.databaseModelsService.getAllModels();
      const permissionsByModel =
        await this.databaseModelsService.getPermissionsByModel();
      const actions = this.databaseModelsService.getAvailableActions();

      return {
        success: true,
        data: {
          models,
          permissionsByModel,
          actions,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get all roles with their permissions for the UI
   */
  @Get('roles')
  @Auth('read', 'roles')
  async getRolesWithPermissions() {
    try {
      const roles = await this.permissionsService.getAllRoles();

      // Format roles with permissions for UI
      const formattedRoles = roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        color: role.color,
        isSystem: role.isSystem,
        userCount: role._count.userRoles,
        permissions: role.rolePermissions.map((rp) => rp.permission.name),
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      }));

      return {
        success: true,
        data: formattedRoles,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Create a new role with permissions
   */
  @Post('roles')
  @Auth('create', 'roles')
  async createRoleWithPermissions(
    @Body() createRoleWithPermissionsDto: CreateRoleWithPermissionsDto,
  ) {
    try {
      console.log(
        '🔄 Creating role with permissions:',
        createRoleWithPermissionsDto,
      );

      // Create the role
      const role = await this.permissionsService.createRole(
        createRoleWithPermissionsDto.role,
      );
      console.log('✅ Role created:', role);

      // Ensure permissions exist first (create them if they don't exist)
      const permissionPromises = createRoleWithPermissionsDto.permissions.map(
        async (permissionName) => {
          const [resource, action] = permissionName.split(':');

          const existingPermission = await this.prisma.permission.findFirst({
            where: { name: permissionName, isDeleted: false },
          });

          if (existingPermission) {
            return existingPermission;
          }

          // Create the permission if it doesn't exist
          console.log(`📝 Creating missing permission: ${permissionName}`);
          return this.prisma.permission.create({
            data: {
              name: permissionName,
              resource,
              action,
              description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`,
            },
          });
        },
      );

      const permissions = await Promise.all(permissionPromises);
      console.log(
        '🔐 Permissions ready:',
        permissions.map((p) => p.name),
      );

      const permissionIds = permissions.map((p) => p.id);

      // Assign permissions to role
      if (permissionIds.length > 0) {
        await this.permissionsService.assignPermissionsToRole(
          role.id,
          permissionIds,
        );
        console.log('✅ Permissions assigned to role');
      }

      return {
        success: true,
        data: role,
        message: 'Role created successfully with permissions',
      };
    } catch (error) {
      console.error('❌ Error creating role:', error);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Update role (name, description, color, and optionally permissions)
   */
  @Put('roles/:id')
  @Auth('update', 'roles')
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    try {
      console.log('🔄 Updating role:', { roleId: id, updates: updateRoleDto });

      // Validate role ID
      if (!id) {
        throw new BadRequestException('Role ID is required');
      }

      // Check if role exists
      const existingRole = await this.permissionsService.getRoleById(id);
      if (!existingRole) {
        throw new BadRequestException('Role not found');
      }

      // Update basic role information
      if (
        updateRoleDto.name ||
        updateRoleDto.description ||
        updateRoleDto.color
      ) {
        const roleUpdates: Partial<CreateRoleDto> = {};
        if (updateRoleDto.name) roleUpdates.name = updateRoleDto.name;
        if (updateRoleDto.description)
          roleUpdates.description = updateRoleDto.description;
        if (updateRoleDto.color) roleUpdates.color = updateRoleDto.color;

        await this.permissionsService.updateRole(id, roleUpdates);
        console.log('✅ Role basic info updated');
      }

      // Update permissions if provided
      if (updateRoleDto.permissions !== undefined) {
        console.log(
          `🔄 Updating permissions for role ${id}:`,
          updateRoleDto.permissions,
        );

        // Ensure permissions exist first (create them if they don't exist)
        const permissionPromises = updateRoleDto.permissions.map(
          async (permissionName) => {
            const [resource, action] = permissionName.split(':');

            if (!resource || !action) {
              throw new Error(
                `Invalid permission format: ${permissionName}. Expected format: resource:action`,
              );
            }

            const existingPermission = await this.prisma.permission.findFirst({
              where: { name: permissionName, isDeleted: false },
            });

            if (existingPermission) {
              return existingPermission;
            }

            // Create the permission if it doesn't exist
            console.log(`📝 Creating missing permission: ${permissionName}`);
            return this.prisma.permission.create({
              data: {
                name: permissionName,
                resource,
                action,
                description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`,
              },
            });
          },
        );

        const permissions = await Promise.all(permissionPromises);
        const permissionIds = permissions.map((p) => p.id);

        console.log(
          `🔐 Assigning ${permissionIds.length} permissions to role ${id}`,
        );

        // Update role permissions
        const updatedRole =
          await this.permissionsService.assignPermissionsToRole(
            id,
            permissionIds,
          );
        console.log('✅ Role permissions updated successfully');

        if (updatedRole) {
          console.log(
            `🎯 Role now has ${updatedRole.rolePermissions.length} permissions`,
          );
        }
      }

      return {
        success: true,
        message: 'Role updated successfully',
      };
    } catch (error) {
      console.error('❌ Error updating role:', error);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Update role permissions only
   */
  @Put('roles/:id/permissions')
  @Auth('update', 'roles')
  async updateRolePermissions(
    @Param('id') id: string,
    @Body() updateRolePermissionsDto: UpdateRolePermissionsDto,
  ) {
    try {
      console.log('🔄 Updating role permissions:', {
        roleId: id,
        permissions: updateRolePermissionsDto.permissions,
      });

      // Ensure permissions exist first (create them if they don't exist)
      const permissionPromises = updateRolePermissionsDto.permissions.map(
        async (permissionName) => {
          const [resource, action] = permissionName.split(':');

          const existingPermission = await this.prisma.permission.findFirst({
            where: { name: permissionName, isDeleted: false },
          });

          if (existingPermission) {
            return existingPermission;
          }

          // Create the permission if it doesn't exist
          console.log(`📝 Creating missing permission: ${permissionName}`);
          return this.prisma.permission.create({
            data: {
              name: permissionName,
              resource,
              action,
              description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`,
            },
          });
        },
      );

      const permissions = await Promise.all(permissionPromises);
      const permissionIds = permissions.map((p) => p.id);

      // Update role permissions
      await this.permissionsService.assignPermissionsToRole(id, permissionIds);

      return {
        success: true,
        message: 'Role permissions updated successfully',
      };
    } catch (error) {
      console.error('❌ Error updating role permissions:', error);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get all users for role assignment
   */
  @Get('users')
  @Auth('read', 'users')
  async getUsersForRoleAssignment() {
    try {
      const users = await this.prisma.user.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          userRoles: {
            where: { isDeleted: false },
            include: {
              role: true,
            },
          },
        },
      });

      const formattedUsers = users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        roles: user.userRoles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          color: ur.role.color,
        })),
      }));

      return {
        success: true,
        data: formattedUsers,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Assign roles to user
   */
  @Post('users/:userId/roles')
  @Auth('update', 'users')
  async assignRolesToUser(
    @Param('userId') userId: string,
    @Body() { roleIds }: { roleIds: string[] },
  ) {
    try {
      await this.permissionsService.assignRolesToUser(userId, roleIds);

      return {
        success: true,
        message: 'Roles assigned to user successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get role details with permissions
   */
  @Get('roles/:id')
  @Auth('read', 'roles')
  async getRoleDetails(@Param('id') id: string) {
    try {
      const role = await this.permissionsService.getRoleById(id);

      if (!role) {
        throw new BadRequestException('Role not found');
      }

      const formattedRole = {
        id: role.id,
        name: role.name,
        description: role.description,
        color: role.color,
        isSystem: role.isSystem,
        permissions: role.rolePermissions.map((rp) => rp.permission.name),
        users: role.userRoles.map((ur) => ({
          id: ur.user.id,
          name: ur.user.name,
          email: ur.user.email,
        })),
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      };

      return {
        success: true,
        data: formattedRole,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get role usage statistics before deletion
   */
  @Get('roles/:id/usage-stats')
  @Auth('read', 'roles')
  async getRoleUsageStats(@Param('id') id: string) {
    try {
      const role = await this.permissionsService.getRoleById(id);

      if (!role) {
        throw new BadRequestException('Role not found');
      }

      return {
        success: true,
        data: {
          role: {
            id: role.id,
            name: role.name,
            description: role.description,
            isSystem: role.isSystem,
          },
          usage: {
            userCount: role.userRoles.length,
            permissionCount: role.rolePermissions.length,
            users: role.userRoles.map((ur) => ({
              id: ur.user.id,
              name: ur.user.name,
              email: ur.user.email,
            })),
            permissions: role.rolePermissions.map((rp) => ({
              id: rp.permission.id,
              name: rp.permission.name,
              description: rp.permission.description,
            })),
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Delete a role and all its related records
   */
  @Delete('roles/:id')
  @Auth('delete', 'roles')
  async deleteRole(@Param('id') id: string) {
    try {
      console.log('🔄 Deleting role and related records:', { roleId: id });

      // Validate role ID
      if (!id) {
        throw new BadRequestException('Role ID is required');
      }

      // Check if role exists and get details
      const existingRole = await this.permissionsService.getRoleById(id);
      if (!existingRole) {
        throw new BadRequestException('Role not found');
      }

      // Additional validation: Check if role is system role
      if (existingRole.isSystem) {
        throw new BadRequestException('Cannot delete system role');
      }

      // Get count of users assigned to this role before deletion
      const userCount = existingRole.userRoles.length;
      const permissionCount = existingRole.rolePermissions.length;

      console.log(
        `📊 Role "${existingRole.name}" has ${userCount} users and ${permissionCount} permissions`,
      );

      // Warn if role has many users assigned
      if (userCount > 10) {
        console.log(
          `⚠️ Warning: Role "${existingRole.name}" has ${userCount} users assigned. This deletion will affect all of them.`,
        );
      }

      // Delete the role and all related records
      const deletedRole = await this.permissionsService.deleteRole(id);
      console.log('✅ Role and all related records deleted successfully');

      return {
        success: true,
        message: `Role "${deletedRole.name}" and all related records deleted successfully`,
        data: {
          deletedRole: {
            id: deletedRole.id,
            name: deletedRole.name,
            description: deletedRole.description,
          },
          affectedRecords: {
            userAssignments: userCount,
            permissionAssignments: permissionCount,
          },
        },
      };
    } catch (error) {
      console.error('❌ Error deleting role:', error);
      throw new BadRequestException(error.message);
    }
  }
}
