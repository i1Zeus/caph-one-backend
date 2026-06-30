import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
} from '@nestjs/common';
import { CreateTaskStageDto } from '../dto/create-task-stage.dto';
import { UpdateTaskStageDto } from '../dto/update-task-stage.dto';
import { TaskStagesService } from './task-stages.service';

@Controller('task-stages')
export class TaskStagesController {
  constructor(private readonly taskStagesService: TaskStagesService) {}

  @Post()
  create(@Body() createTaskStageDto: CreateTaskStageDto) {
    console.log(createTaskStageDto);
    return this.taskStagesService.create(createTaskStageDto);
  }

  @Get()
  findAll(@Query('projectId') projectId?: string) {
    if (projectId) {
      return this.taskStagesService.findByProject(projectId);
    }
    return this.taskStagesService.findAll();
  }

  @Get('project/:projectId')
  findByProject(@Param('projectId') projectId: string) {
    return this.taskStagesService.findByProject(projectId);
  }

  @Get('project/:projectId/default')
  getDefaultByProject(@Param('projectId') projectId: string) {
    return this.taskStagesService.getDefaultByProject(projectId);
  }

  @Get('project/:projectId/with-counts')
  getStagesWithTaskCounts(@Param('projectId') projectId: string) {
    return this.taskStagesService.getStagesWithTaskCounts(projectId);
  }

  @Get('project/:projectId/kanban')
  getProjectKanban(
    @Param('projectId') projectId: string,
    @Request() req?: any,
  ) {
    const user = req?.user;
    const userId = user?.userId;
    const userRole = user?.role;

    return this.taskStagesService.getProjectKanban(projectId, userId, userRole);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taskStagesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTaskStageDto: UpdateTaskStageDto,
  ) {
    return this.taskStagesService.update(id, updateTaskStageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taskStagesService.remove(id);
  }

  @Put('project/:projectId/reorder')
  reorderStages(
    @Param('projectId') projectId: string,
    @Body() stageOrders: { id: string; order: number }[],
  ) {
    return this.taskStagesService.reorderStages(projectId, stageOrders);
  }
}
