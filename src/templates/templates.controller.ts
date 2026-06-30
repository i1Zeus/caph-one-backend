import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Auth } from '../auth';
import { TemplatesService } from './templates.service';

@Controller('templates')
@Auth()
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get('task-stages')
  getTaskStageTemplates(@Query('category') category?: string) {
    if (category) {
      return this.templatesService.getTemplatesByCategory(category).taskStages;
    }
    return this.templatesService.getTaskStageTemplates();
  }

  @Get('project-stages')
  getProjectStageTemplates(@Query('category') category?: string) {
    if (category) {
      return this.templatesService.getTemplatesByCategory(category)
        .projectStages;
    }
    return this.templatesService.getProjectStageTemplates();
  }

  @Get('categories')
  getCategories() {
    return [
      {
        id: 'general',
        name: 'General',
        description: 'Basic templates for general use',
      },
      {
        id: 'development',
        name: 'Development',
        description: 'Software development workflows',
      },
      {
        id: 'marketing',
        name: 'Marketing',
        description: 'Marketing campaign workflows',
      },
      {
        id: 'design',
        name: 'Design',
        description: 'Design and creative workflows',
      },
      {
        id: 'agile',
        name: 'Agile',
        description: 'Agile and Scrum methodologies',
      },
      {
        id: 'waterfall',
        name: 'Waterfall',
        description: 'Traditional project management',
      },
      {
        id: 'sales',
        name: 'Sales',
        description: 'Sales pipeline and lead management',
      },
      {
        id: 'crm',
        name: 'CRM',
        description: 'Customer relationship management workflows',
      },
    ];
  }

  @Post('task-stages/apply/:projectId')
  applyTaskStageTemplate(
    @Param('projectId') projectId: string,
    @Body('templateId') templateId: string,
  ) {
    return this.templatesService.applyTaskStageTemplate(projectId, templateId);
  }

  @Post('project-stages/apply/:workspaceId')
  applyProjectStageTemplate(
    @Param('workspaceId') workspaceId: string,
    @Body('templateId') templateId: string,
  ) {
    return this.templatesService.applyProjectStageTemplate(
      workspaceId,
      templateId,
    );
  }

  @Get('task-stages/suggested/:projectId')
  getSuggestedTaskStageTemplate(@Param('projectId') projectId: string) {
    return this.templatesService.getSuggestedTaskStageTemplate(projectId);
  }

  @Get('project-stages/suggested/:workspaceId')
  getSuggestedProjectStageTemplate(@Param('workspaceId') workspaceId: string) {
    return this.templatesService.getSuggestedProjectStageTemplate(workspaceId);
  }

  // ============ CRM LEAD STAGE TEMPLATES ============

  @Get('lead-stages')
  getLeadStageTemplates(@Query('category') category?: string) {
    if (category) {
      return this.templatesService.getLeadStageTemplatesByCategory(category);
    }
    return this.templatesService.getLeadStageTemplates();
  }

  @Post('lead-stages/apply/:workspaceId')
  applyLeadStageTemplate(
    @Param('workspaceId') workspaceId: string,
    @Body('templateId') templateId: string,
  ) {
    return this.templatesService.applyLeadStageTemplate(
      workspaceId,
      templateId,
    );
  }

  @Get('lead-stages/suggested/:workspaceId')
  getSuggestedLeadStageTemplate(@Param('workspaceId') workspaceId: string) {
    return this.templatesService.getSuggestedLeadStageTemplate(workspaceId);
  }
}
