import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { AdminOrganizationsService } from './admin-organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), SuperAdminGuard)
export class AdminOrganizationsController {
  constructor(private readonly service: AdminOrganizationsService) {}

  @Post('organizations')
  create(@Body() dto: CreateOrganizationDto) {
    return this.service.create(dto);
  }

  @Get('organizations')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    return this.service.findAll(pageNum, limitNum, search || '');
  }

  @Get('organizations/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put('organizations/:id')
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.service.update(id, dto);
  }

  @Delete('organizations/:id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Patch('organizations/:id/restore')
  restore(@Param('id') id: string) {
    return this.service.restore(id);
  }

  @Get('organizations/:id/users')
  getOrgUsers(@Param('id') id: string) {
    return this.service.getOrgUsers(id);
  }

  @Get('users')
  getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    return this.service.getAllUsers(pageNum, limitNum, search || '');
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.service.deleteUser(id);
  }
}
