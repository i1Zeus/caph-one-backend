import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { Auth } from '../auth';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import {
  AddWorkspaceMembersDto,
  RemoveWorkspaceMembersDto,
  UpdateMemberRoleDto,
} from './dto/manage-workspace-members.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
@Auth()
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createWorkspaceDto: CreateWorkspaceDto, @Request() req) {
    const userId = req.user?.userId;
    return this.workspacesService.create(createWorkspaceDto, userId);
  }

  @Get()
  @Auth()
  findAll(@Request() req) {
    const userId = req.user?.userId;
    return this.workspacesService.findAll(userId);
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const userId = req.user?.userId;
    return this.workspacesService.findOne(id, userId);
  }

  @Get('slug/:slug')
  @Auth()
  findBySlug(@Param('slug') slug: string, @Request() req) {
    const userId = req.user?.userId;
    return this.workspacesService.findBySlug(slug, userId);
  }

  @Patch(':id')
  @Auth()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @Request() req,
  ) {
    const userId = req.user?.userId;
    return this.workspacesService.update(id, updateWorkspaceDto, userId);
  }

  @Post(':id/members')
  @Auth()
  @HttpCode(HttpStatus.OK)
  addMembers(
    @Param('id', ParseUUIDPipe) workspaceId: string,
    @Body() addMembersDto: AddWorkspaceMembersDto,
    @Request() req,
  ) {
    const userId = req.user?.userId;
    return this.workspacesService.addMembers(
      workspaceId,
      addMembersDto,
      userId,
    );
  }

  @Delete(':id/members')
  @Auth()
  @HttpCode(HttpStatus.OK)
  removeMembers(
    @Param('id', ParseUUIDPipe) workspaceId: string,
    @Body() removeMembersDto: RemoveWorkspaceMembersDto,
    @Request() req,
  ) {
    const userId = req.user?.userId;
    return this.workspacesService.removeMembers(
      workspaceId,
      removeMembersDto,
      userId,
    );
  }

  @Patch(':id/members/role')
  @Auth()
  @HttpCode(HttpStatus.OK)
  updateMemberRole(
    @Param('id', ParseUUIDPipe) workspaceId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
    @Request() req,
  ) {
    const userId = req.user?.userId;
    return this.workspacesService.updateMemberRole(
      workspaceId,
      updateRoleDto,
      userId,
    );
  }

  @Get(':id/role')
  @Auth()
  getUserRole(@Param('id', ParseUUIDPipe) workspaceId: string, @Request() req) {
    const userId = req.user?.userId;
    return this.workspacesService.getUserRole(workspaceId, userId);
  }

  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const userId = req.user?.userId;
    return this.workspacesService.remove(id, userId);
  }
}
