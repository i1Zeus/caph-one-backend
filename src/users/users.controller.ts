import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AutoAudit } from '../audit/interceptors/audit.interceptor';
import { Auth } from '../auth';
import { DynamicPermissionsService } from '../auth/services/dynamic-permissions.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginatedUsersResponse } from './dto/paginated-users-response.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

interface UsersQueryDto {
  page?: string;
  limit?: string;
  search?: string;
  role?: string; // Changed from UserRole to string
  status?: 'active' | 'inactive' | 'all';
  sortBy?: 'name' | 'email' | 'createdAt'; // Removed 'role' from sortBy options
  sortOrder?: 'asc' | 'desc';
  workspaceId?: string; // Add workspace filtering
}

@Controller('users')
@AutoAudit('USER')
@Auth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly permissionsService: DynamicPermissionsService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // Settings endpoints
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getCurrentUser(@Req() req: any) {
    const base = await this.usersService.findOne(req.user.userId);
    const permissions = await this.permissionsService.getUserPermissions(
      req.user.userId,
    );
    const roles = await this.permissionsService.getUserRoles(req.user.userId);
    return {
      ...base,
      permissions,
      roles: roles.map((r) => ({
        id: r.role.id,
        name: r.role.name,
        description: r.role.description,
        color: r.role.color,
      })),
    };
  }

  // Alias for settings - cleaner endpoint name
  @UseGuards(AuthGuard('jwt'))
  @Get('settings/me')
  async getCurrentUserSettings(@Req() req: any) {
    const base = await this.usersService.findOne(req.user.userId);
    const permissions = await this.permissionsService.getUserPermissions(
      req.user.userId,
    );
    const roles = await this.permissionsService.getUserRoles(req.user.userId);
    return {
      ...base,
      permissions,
      roles: roles.map((r) => ({
        id: r.role.id,
        name: r.role.name,
        description: r.role.description,
        color: r.role.color,
      })),
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/settings')
  async updateCurrentUserSettings(
    @Req() req: any,
    @Body() updateUserSettingsDto: UpdateUserSettingsDto,
  ) {
    return this.usersService.updateSettings(
      req.user.userId,
      updateUserSettingsDto,
    );
  }

  // Alias for settings update - cleaner endpoint name
  @UseGuards(AuthGuard('jwt'))
  @Patch('settings/me')
  async updateCurrentUserSettingsAlias(
    @Req() req: any,
    @Body() updateUserSettingsDto: UpdateUserSettingsDto,
  ) {
    return this.usersService.updateSettings(
      req.user.userId,
      updateUserSettingsDto,
    );
  }

  @Get()
  async findAll(
    @Query() query: UsersQueryDto,
  ): Promise<PaginatedUsersResponse> {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 50); // Limit max to 50 users
    const search = query.search || '';
    const role = query.role;
    const status = query.status || 'all';
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const workspaceId = query.workspaceId; // Extract workspaceId

    return this.usersService.findAll({
      page,
      limit,
      search,
      role,
      status,
      sortBy,
      sortOrder,
      workspaceId, // Pass workspaceId to service
    });
  }

  @Get('email/:email')
  async findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Get('phone/:phone')
  async findByPhone(@Param('phone') phone: string) {
    return this.usersService.findByPhone(phone);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
