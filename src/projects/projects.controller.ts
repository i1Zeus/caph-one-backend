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
  Query,
  Request,
} from '@nestjs/common';
import { AutoAudit } from '../audit/interceptors/audit.interceptor';
import { Auth } from '../auth/decorators/universal-auth.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import {
  AddContributorsDto,
  RemoveContributorsDto,
} from './dto/manage-contributors.dto';
import { ReorderProjectsDto } from './dto/reorder-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@AutoAudit('PROJECT')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Auth() // Auto-detects: projects:create (POST method)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProjectDto: CreateProjectDto, @Request() req) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @Auth() // Auto-detects: projects:read (GET method + findAll method name)
  findAll(
    @Query('ownerId') ownerId?: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('ownerIds') ownerIds?: string | string[],
    @Query('collaboratorIds') collaboratorIds?: string | string[],
    @Query('createdByIds') createdByIds?: string | string[],
    @Request() req?: any,
  ) {
    // Get user information from the request
    const user = req?.user;
    const userId = user?.userId;

    // If no user information is available, return empty array for security
    if (!userId) {
      return [];
    }

    if (ownerId) {
      return this.projectsService.findByOwner(ownerId);
    }

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

    // If pagination params are provided, use paginated query
    if (
      page ||
      limit ||
      search ||
      startDate ||
      endDate ||
      ownerIdsArray ||
      collaboratorIdsArray ||
      createdByIdsArray
    ) {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;
      return this.projectsService.findPaginated(
        userId,
        workspaceId,
        pageNum,
        limitNum,
        search,
        startDate,
        endDate,
        ownerIdsArray,
        collaboratorIdsArray,
        createdByIdsArray,
      );
    }

    // Otherwise, return all projects (backward compatibility)
    return this.projectsService.findAll(userId, workspaceId);
  }

  @Get(':id')
  @Auth() // Auto-detects: projects:read (GET method + findOne method name)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req?: any) {
    const user = req?.user;
    const userId = user?.userId;

    return this.projectsService.findOne(id, userId);
  }

  @Get(':id/stats')
  @Auth() // Auto-detects: projects:read (GET method)
  getStats(@Param('id', ParseUUIDPipe) id: string, @Request() req?: any) {
    const user = req?.user;
    const userId = user?.userId;

    return this.projectsService.getProjectStats(id, userId);
  }

  @Post(':id/contributors')
  @Auth('update') // Explicit: projects:update (managing contributors is updating project)
  @HttpCode(HttpStatus.OK)
  addContributors(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addContributorsDto: AddContributorsDto,
  ) {
    return this.projectsService.addContributors(id, addContributorsDto);
  }

  @Delete(':id/contributors')
  @Auth('update') // Explicit: projects:update (managing contributors is updating project)
  @HttpCode(HttpStatus.OK)
  removeContributors(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() removeContributorsDto: RemoveContributorsDto,
  ) {
    return this.projectsService.removeContributors(id, removeContributorsDto);
  }

  @Patch(':id')
  @Auth() // Auto-detects: projects:update (PATCH method + update method name)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Post('reorder')
  @Auth('update') // Explicit: projects:update (reordering is updating)
  @HttpCode(HttpStatus.OK)
  reorder(@Body() reorderProjectsDto: ReorderProjectsDto) {
    return this.projectsService.reorderProjects(reorderProjectsDto);
  }

  @Post(':id/duplicate')
  @Auth('create') // Explicit: projects:create (duplicating creates a new project)
  @HttpCode(HttpStatus.CREATED)
  duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('deep') deep?: string,
  ) {
    const isDeep = deep === 'true';
    return this.projectsService.duplicate(id, workspaceId, isDeep);
  }

  @Delete(':id')
  @Auth() // Auto-detects: projects:delete (DELETE method + remove method name)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.remove(id);
  }
}
