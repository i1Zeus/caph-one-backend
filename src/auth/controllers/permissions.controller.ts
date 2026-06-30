import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import {
  AdminOnly,
  CanCreate,
  CanRead,
} from '../decorators/dynamic-auth.decorator';
import { DynamicPermissionsService } from '../services/dynamic-permissions.service';

export interface CreatePermissionDto {
  name: string;
  description?: string;
}

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: DynamicPermissionsService) {}

  @Get()
  @CanRead('permissions')
  async getAllPermissions() {
    try {
      const permissions = await this.permissionsService.getAllPermissions();
      return {
        success: true,
        data: permissions,
        message: 'Permissions retrieved successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('by-resource')
  @CanRead('permissions')
  async getPermissionsByResource() {
    try {
      const permissions =
        await this.permissionsService.getPermissionsByResource();
      return {
        success: true,
        data: permissions,
        message: 'Permissions grouped by resource retrieved successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post()
  @CanCreate('permissions')
  async createPermission(@Body() createPermissionDto: CreatePermissionDto) {
    try {
      const permission = await this.permissionsService.createPermission(
        createPermissionDto.name,
        createPermissionDto.description,
      );
      return {
        success: true,
        data: permission,
        message: 'Permission created successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('seed')
  @AdminOnly()
  async seedPermissions() {
    try {
      await this.permissionsService.seedDefaultPermissions();
      await this.permissionsService.seedDefaultRoles();
      return {
        success: true,
        message: 'Default permissions and roles seeded successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
