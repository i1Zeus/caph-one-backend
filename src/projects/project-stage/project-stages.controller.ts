import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { Auth } from '../../auth';
import { CreateProjectStageDto } from '../dto/create-project-stage.dto';
import { UpdateProjectStageDto } from '../dto/update-project-stage.dto';
import { ProjectStagesService } from './project-stages.service';

@Controller('project-stages')
@Auth()
export class ProjectStagesController {
  constructor(private readonly projectStagesService: ProjectStagesService) {}

  @Post()
  create(@Body() createProjectStageDto: CreateProjectStageDto) {
    return this.projectStagesService.create(createProjectStageDto);
  }

  @Get()
  findAll(@Query('workspaceId') workspaceId?: string) {
    return this.projectStagesService.findAll(workspaceId);
  }

  @Get('kanban')
  @Auth('read', 'projectstages') // Use projectstages:read permission
  getKanbanData(
    @Request() req?: any,
    @Query('workspaceId') workspaceId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('ownerIds') ownerIds?: string | string[],
    @Query('collaboratorIds') collaboratorIds?: string | string[],
    @Query('createdByIds') createdByIds?: string | string[],
  ) {
    console.log('🔍 Kanban endpoint called with:', {
      workspaceId,
      search,
      startDate,
      endDate,
      ownerIds,
      collaboratorIds,
      createdByIds,
      user: req?.user,
    });

    // Get user information from the request
    const user = req?.user;
    const userId = user?.userId;
    const userRoles = user?.roles || [];

    console.log('🔍 User info extracted:', {
      userId,
      userRoles: userRoles.length,
    });

    // If no user information is available, return empty array for security
    if (!userId) {
      console.log('❌ No user ID available, returning empty array');
      return [];
    }

    // Extract primary role name for backward compatibility (use first role if multiple)
    const primaryRole = userRoles.length > 0 ? userRoles[0].name : 'Guest';

    // Normalize array query parameters
    const ownerIdsArray = ownerIds
      ? Array.isArray(ownerIds)
        ? ownerIds
        : [ownerIds]
      : undefined;
    const collaboratorIdsArray = collaboratorIds
      ? Array.isArray(collaboratorIds)
        ? collaboratorIds
        : [collaboratorIds]
      : undefined;
    const createdByIdsArray = createdByIds
      ? Array.isArray(createdByIds)
        ? createdByIds
        : [createdByIds]
      : undefined;

    console.log('✅ Calling service with:', {
      userId,
      primaryRole,
      workspaceId,
      search,
      startDate,
      endDate,
      ownerIdsArray,
      collaboratorIdsArray,
      createdByIdsArray,
    });

    return this.projectStagesService.getKanbanData(
      userId,
      primaryRole,
      workspaceId,
      search,
      startDate,
      endDate,
      ownerIdsArray,
      collaboratorIdsArray,
      createdByIdsArray,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectStagesService.findOne(id);
  }

  @Get(':id/projects')
  getStageWithProjectCounts(@Param('id') id: string) {
    return this.projectStagesService.getStageWithProjectCounts(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProjectStageDto: UpdateProjectStageDto,
  ) {
    return this.projectStagesService.update(id, updateProjectStageDto);
  }

  @Post('reorder')
  reorderStages(@Body() body: { stages: { id: string; order: number }[] }) {
    return this.projectStagesService.reorderStages(body.stages);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectStagesService.remove(id);
  }
}
