import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  CanCreate,
  CanDelete,
  CanRead,
  CanUpdate,
  RequirePermissions,
} from '../decorators/dynamic-auth.decorator';
import {
  CreateRoleDto,
  DynamicPermissionsService,
} from '../services/dynamic-permissions.service';

export interface AssignPermissionsToRoleDto {
  permissionIds: string[];
}

export interface AssignRolesToUserDto {
  roleIds: string[];
}

@Controller('roles')
export class RolesController {
  constructor(private readonly permissionsService: DynamicPermissionsService) {}

  // ===== ROLE MANAGEMENT =====

  @Get()
  @CanRead('roles')
  async getAllRoles() {
    try {
      const roles = await this.permissionsService.getAllRoles();
      return {
        success: true,
        data: roles,
        message: 'Roles retrieved successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get(':id')
  @CanRead('roles')
  async getRoleById(@Param('id') id: string) {
    try {
      const role = await this.permissionsService.getRoleById(id);
      if (!role) {
        throw new NotFoundException('Role not found');
      }
      return {
        success: true,
        data: role,
        message: 'Role retrieved successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post()
  @CanCreate('roles')
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    try {
      const role = await this.permissionsService.createRole(createRoleDto);
      return {
        success: true,
        data: role,
        message: 'Role created successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Put(':id')
  @CanUpdate('roles')
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: Partial<CreateRoleDto>,
  ) {
    try {
      const role = await this.permissionsService.updateRole(id, updateRoleDto);
      return {
        success: true,
        data: role,
        message: 'Role updated successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id')
  @CanDelete('roles')
  async deleteRole(@Param('id') id: string) {
    try {
      await this.permissionsService.deleteRole(id);
      return {
        success: true,
        message: 'Role deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // ===== ROLE PERMISSIONS MANAGEMENT =====

  @Get(':id/permissions')
  @CanRead('roles')
  async getRolePermissions(@Param('id') id: string) {
    try {
      const permissions = await this.permissionsService.getRolePermissions(id);
      return {
        success: true,
        data: permissions,
        message: 'Role permissions retrieved successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post(':id/permissions')
  @RequirePermissions('roles:update', 'permissions:read')
  async assignPermissionsToRole(
    @Param('id') id: string,
    @Body() assignPermissionsDto: AssignPermissionsToRoleDto,
  ) {
    try {
      await this.permissionsService.assignPermissionsToRole(
        id,
        assignPermissionsDto.permissionIds,
      );
      return {
        success: true,
        message: 'Permissions assigned to role successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post(':id/permissions/add')
  @RequirePermissions('roles:update', 'permissions:read')
  async addPermissionsToRole(
    @Param('id') id: string,
    @Body() assignPermissionsDto: AssignPermissionsToRoleDto,
  ) {
    try {
      await this.permissionsService.addPermissionsToRole(
        id,
        assignPermissionsDto.permissionIds,
      );
      return {
        success: true,
        message: 'Permissions added to role successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id/permissions')
  @RequirePermissions('roles:update', 'permissions:read')
  async removePermissionsFromRole(
    @Param('id') id: string,
    @Body() removePermissionsDto: AssignPermissionsToRoleDto,
  ) {
    try {
      await this.permissionsService.removePermissionsFromRole(
        id,
        removePermissionsDto.permissionIds,
      );
      return {
        success: true,
        message: 'Permissions removed from role successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // ===== USER ROLE ASSIGNMENT =====

  @Post('assign-to-user/:userId')
  @RequirePermissions('users:update', 'roles:read')
  async assignRolesToUser(
    @Param('userId') userId: string,
    @Body() assignRolesDto: AssignRolesToUserDto,
  ) {
    try {
      await this.permissionsService.assignRolesToUser(
        userId,
        assignRolesDto.roleIds,
      );
      return {
        success: true,
        message: 'Roles assigned to user successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('add-to-user/:userId')
  @RequirePermissions('users:update', 'roles:read')
  async addRolesToUser(
    @Param('userId') userId: string,
    @Body() assignRolesDto: AssignRolesToUserDto,
  ) {
    try {
      await this.permissionsService.addRolesToUser(
        userId,
        assignRolesDto.roleIds,
      );
      return {
        success: true,
        message: 'Roles added to user successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete('remove-from-user/:userId')
  @RequirePermissions('users:update', 'roles:read')
  async removeRolesFromUser(
    @Param('userId') userId: string,
    @Body() removeRolesDto: AssignRolesToUserDto,
  ) {
    try {
      await this.permissionsService.removeRolesFromUser(
        userId,
        removeRolesDto.roleIds,
      );
      return {
        success: true,
        message: 'Roles removed from user successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('user/:userId')
  @RequirePermissions('users:read', 'roles:read')
  async getUserRoles(@Param('userId') userId: string) {
    try {
      const userRoles = await this.permissionsService.getUserRoles(userId);
      return {
        success: true,
        data: userRoles,
        message: 'User roles retrieved successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('user/:userId/permissions')
  @RequirePermissions('users:read', 'permissions:read')
  async getUserPermissions(@Param('userId') userId: string) {
    try {
      const permissions =
        await this.permissionsService.getUserPermissions(userId);
      return {
        success: true,
        data: permissions,
        message: 'User permissions retrieved successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
