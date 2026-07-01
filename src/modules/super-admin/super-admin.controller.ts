import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from './decorators/roles.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { SuperAdminService } from './super-admin.service';

@Controller('api/super-admin')
@UseGuards(AuthGuard('jwt'), SuperAdminGuard)
@Roles('super_admin')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  // =========================================================================
  // ORGANIZATION MANAGEMENT
  // =========================================================================

  @Get('organizations')
  findAllOrganizations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('sortBy') sortBy?: 'name' | 'createdAt' | 'isActive',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    const activeBool =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.service.findAllOrganizations(
      pageNum,
      limitNum,
      search || '',
      activeBool,
      sortBy || 'createdAt',
      sortOrder || 'desc',
    );
  }

  @Post('organizations')
  createOrganization(@Body() dto: CreateOrganizationDto) {
    return this.service.createOrganization(dto);
  }

  @Put('organizations/:id')
  updateOrganization(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.service.updateOrganization(id, dto);
  }

  @Delete('organizations/:id')
  deleteOrganization(@Param('id') id: string) {
    return this.service.deleteOrganization(id);
  }

  // =========================================================================
  // USER MANAGEMENT
  // =========================================================================

  @Get('organizations/:orgId/users')
  findOrgUsers(
    @Param('orgId') orgId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    return this.service.findOrgUsers(orgId, pageNum, limitNum);
  }

  @Post('organizations/:orgId/users/invite')
  inviteUser(@Param('orgId') orgId: string, @Body() dto: InviteUserDto) {
    return this.service.inviteUser(orgId, dto);
  }

  @Put('users/:userId')
  updateUser(@Param('userId') userId: string, @Body() dto: UpdateUserDto) {
    return this.service.updateUser(userId, dto);
  }

  @Delete('users/:userId')
  deleteUser(@Param('userId') userId: string) {
    return this.service.deleteUser(userId);
  }

  // =========================================================================
  // DASHBOARD STATS
  // =========================================================================

  @Get('dashboard/stats')
  getDashboardStats() {
    return this.service.getDashboardStats();
  }
}
