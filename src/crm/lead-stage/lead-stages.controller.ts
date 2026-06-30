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
import { AutoAudit } from 'src/audit/interceptors/audit.interceptor';
import { Auth } from '../../auth';
import { CreateLeadStageDto } from '../dto/create-lead-stage.dto';
import { UpdateLeadStageDto } from '../dto/update-lead-stage.dto';
import { LeadStagesService } from './lead-stages.service';

@Controller('lead-stages')
@AutoAudit('LEAD_STAGE')
@Auth()
export class LeadStagesController {
  constructor(private readonly leadStagesService: LeadStagesService) {}

  @Post()
  create(@Body() createLeadStageDto: CreateLeadStageDto) {
    console.log(createLeadStageDto);
    return this.leadStagesService.create(createLeadStageDto);
  }

  @Get()
  findAll(@Query('workspaceId') workspaceId?: string) {
    if (workspaceId) {
      return this.leadStagesService.findByWorkspace(workspaceId);
    }
    return this.leadStagesService.findAll();
  }

  @Get('workspace/:workspaceId')
  findByWorkspace(@Param('workspaceId') workspaceId: string) {
    return this.leadStagesService.findByWorkspace(workspaceId);
  }

  @Get('workspace/:workspaceId/with-counts')
  getStagesWithLeadCounts(@Param('workspaceId') workspaceId: string) {
    return this.leadStagesService.getStagesWithLeadCounts(workspaceId);
  }

  @Get('workspace/:workspaceId/kanban')
  getWorkspaceKanban(
    @Param('workspaceId') workspaceId: string,
    @Request() req?: any,
  ) {
    const user = req?.user;
    const userId = user?.userId;
    const userRole = user?.role;

    return this.leadStagesService.getWorkspaceKanban(
      workspaceId,
      userId,
      userRole,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadStagesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLeadStageDto: UpdateLeadStageDto,
  ) {
    return this.leadStagesService.update(id, updateLeadStageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leadStagesService.remove(id);
  }

  @Put('workspace/:workspaceId/reorder')
  reorderStages(
    @Param('workspaceId') workspaceId: string,
    @Body() stageOrders: { id: string; order: number }[],
  ) {
    return this.leadStagesService.reorderStages(workspaceId, stageOrders);
  }
}
