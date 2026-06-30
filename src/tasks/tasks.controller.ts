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
import { TaskPriority, TaskStatus } from '@prisma/client';
import { AutoAudit } from '../audit/interceptors/audit.interceptor';
import { Auth } from '../auth';
import { CreateTaskDto } from './dto/create-task.dto';
import { PaginatedTasksResponse } from './dto/paginated-tasks-response.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@AutoAudit('TASK')
@Auth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTaskDto: CreateTaskDto, @Request() req: any) {
    return this.tasksService.create(createTaskDto, req.user?.userId);
  }

  @Get()
  findAll(
    @Query('projectId') projectId?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('assigneeIds') assigneeIds?: string, // Changed from assigneeId to assigneeIds
    @Query('createdByIds') createdByIds?: string,
    @Query('kanbanStageId') kanbanStageId?: string,
    @Query('taskStageId') taskStageId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('dueDate') dueDate?: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('showDueTasks') showDueTasks?: string,
    @Request() req?: any,
  ) {
    // Convert comma-separated assigneeIds string to array
    const assigneeIdsArray = assigneeIds
      ? assigneeIds.split(',').filter((id) => id.trim())
      : undefined;

    const filters = {
      projectId,
      status,
      priority,
      assigneeIds: assigneeIdsArray, // Use the array
      createdByIds: createdByIds
        ? createdByIds.split(',').filter((id) => id.trim())
        : undefined,
      kanbanStageId,
      taskStageId,
      search,
      startDate,
      endDate,
      dueDate,
      workspaceId,
      showDueTasks: showDueTasks === 'true',
    };

    // Remove undefined values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined),
    );

    const user = req?.user;
    const userId = user?.userId;
    // userRole removed - now using dynamic permission system

    return this.tasksService.findAll(cleanFilters, userId);
  }

  @Get('paginated')
  findAllPaginated(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('projectId') projectId?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('assigneeIds') assigneeIds?: string, // Changed from assigneeId to assigneeIds
    @Query('createdByIds') createdByIds?: string,
    @Query('kanbanStageId') kanbanStageId?: string,
    @Query('taskStageId') taskStageId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('dueDate') dueDate?: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('showDueTasks') showDueTasks?: string,
    @Query('sortBy')
    sortBy?:
      | 'title'
      | 'priority'
      | 'status'
      | 'dueDate'
      | 'createdAt'
      | 'updatedAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Request() req?: any,
  ): Promise<PaginatedTasksResponse> {
    // Convert comma-separated assigneeIds string to array
    const assigneeIdsArray = assigneeIds
      ? assigneeIds.split(',').filter((id) => id.trim())
      : undefined;

    const params = {
      page: parseInt(page, 10) || 1,
      limit: Math.min(parseInt(limit, 10) || 10, 100), // Max 100 items per page
      projectId,
      status,
      priority,
      assigneeIds: assigneeIdsArray, // Use the array
      createdByIds: createdByIds
        ? createdByIds.split(',').filter((id) => id.trim())
        : undefined,
      taskStageId,
      search,
      startDate,
      endDate,
      dueDate,
      workspaceId,
      showDueTasks: showDueTasks === 'true',
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    };

    // Remove undefined values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined),
    );

    const user = req?.user;
    const userId = user?.userId;
    // userRole removed - now using dynamic permission system

    return this.tasksService.findAllPaginated(cleanParams as any, userId);
  }

  @Get('project/:projectId')
  getTasksByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Request() req?: any,
  ) {
    const user = req?.user;
    const userId = user?.userId;
    // userRole removed - now using dynamic permission system

    return this.tasksService.getTasksByProject(projectId, userId);
  }

  @Get('user/:userId')
  getTasksByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req?: any,
  ) {
    const user = req?.user;
    const requestingUserId = user?.userId;

    return this.tasksService.getTasksByUser(userId, requestingUserId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req?: any) {
    const user = req?.user;
    const userId = user?.userId;
    // userRole removed - now using dynamic permission system

    return this.tasksService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: TaskStatus,
  ) {
    return this.tasksService.updateTaskStatus(id, status);
  }

  @Patch(':id/priority')
  updatePriority(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('priority') priority: TaskPriority,
  ) {
    return this.tasksService.updateTaskPriority(id, priority);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  assignUsers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('userIds') userIds: string[],
  ) {
    return this.tasksService.assignUsers(id, userIds);
  }

  @Post(':id/unassign')
  @HttpCode(HttpStatus.OK)
  unassignUsers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('userIds') userIds: string[],
  ) {
    return this.tasksService.unassignUsers(id, userIds);
  }

  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  reorder(@Body() reorderTasksDto: ReorderTasksDto) {
    return this.tasksService.reorderTasks(reorderTasksDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.remove(id);
  }

  // Subtask endpoints

  @Get(':id/with-subtasks')
  findWithSubtasks(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.findWithSubtasks(id);
  }

  @Get(':id/subtasks')
  getSubtasks(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.getSubtasks(id);
  }

  @Post(':id/subtasks')
  @HttpCode(HttpStatus.CREATED)
  createSubtask(
    @Param('id', ParseUUIDPipe) parentId: string,
    @Body() createTaskDto: Omit<CreateTaskDto, 'parentId'>,
    @Request() req: any,
  ) {
    return this.tasksService.createSubtask(
      parentId,
      createTaskDto,
      req.user?.userId,
    );
  }

  @Post(':id/promote')
  @HttpCode(HttpStatus.OK)
  promoteSubtask(@Param('id', ParseUUIDPipe) subtaskId: string) {
    return this.tasksService.promoteSubtask(subtaskId);
  }

  @Post(':id/convert-to-subtask')
  @HttpCode(HttpStatus.OK)
  convertToSubtask(
    @Param('id', ParseUUIDPipe) taskId: string,
    @Body('parentId') parentId: string,
  ) {
    return this.tasksService.convertToSubtask(taskId, parentId);
  }

  @Get('project/:projectId/main-tasks')
  getMainTasks(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Request() req?: any,
  ) {
    const user = req?.user;
    const userId = user?.userId;
    // userRole removed - now using dynamic permission system

    return this.tasksService.getMainTasks(projectId, userId);
  }
}
