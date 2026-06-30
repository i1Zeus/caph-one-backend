import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Auth } from '../../auth';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Auth()
@Controller('lead-activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  create(@Body() createActivityDto: CreateActivityDto) {
    return this.activitiesService.create(createActivityDto);
  }

  @Get('lead/:leadId')
  findAllForLead(@Param('leadId') leadId: string) {
    return this.activitiesService.findAllForLead(leadId);
  }

  @Get('lead/:leadId/stats')
  getLeadActivityStats(@Param('leadId') leadId: string) {
    return this.activitiesService.getLeadActivityStats(leadId);
  }

  @Get('workspace/:workspaceId/upcoming')
  getWorkspaceUpcomingActivities(
    @Param('workspaceId') workspaceId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.activitiesService.getWorkspaceUpcomingActivities(
      workspaceId,
      limit,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.activitiesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateActivityDto: UpdateActivityDto,
  ) {
    return this.activitiesService.update(id, updateActivityDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.activitiesService.remove(id);
  }

  @Patch(':id/toggle-done')
  toggleDone(@Param('id') id: string) {
    return this.activitiesService.toggleDone(id);
  }
}
