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
} from '@nestjs/common';
import { AutoAudit } from '../audit/interceptors/audit.interceptor';
import { Auth } from '../auth';
import { WhatsAppService } from '../notifications/whatsapp/whatsapp.service';
import { CrmService } from './crm.service';
import {
  CreateLeadDto,
  CreateLeadStageDto,
  UpdateLeadDto,
  UpdateLeadStageDto,
} from './dto';

@Controller('crm')
@AutoAudit('CRM')
export class CrmController {
  constructor(
    private readonly crmService: CrmService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  // ============ LEADS ENDPOINTS ============

  @Post('leads')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async createLead(@Body() createLeadDto: CreateLeadDto) {
    // Note: workspaceId is optional in DTO validation but required for business logic
    return this.crmService.createLead(createLeadDto);
  }

  @Get('leads')
  @Auth()
  async findAllLeads(
    @Query('workspaceId') workspaceId?: string,
    @Query('stageId') stageId?: string,
  ) {
    return this.crmService.findAllLeads(workspaceId, stageId);
  }

  @Get('leads/:id')
  @Auth()
  async findLeadById(@Param('id', ParseUUIDPipe) id: string) {
    return this.crmService.findLeadById(id);
  }

  @Patch('leads/:id')
  @Auth()
  async updateLead(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLeadDto: UpdateLeadDto,
  ) {
    return this.crmService.updateLead(id, updateLeadDto);
  }

  @Delete('leads/:id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLead(@Param('id', ParseUUIDPipe) id: string) {
    return this.crmService.deleteLead(id);
  }

  @Post('leads/:leadId/move-to-stage')
  @Auth()
  async moveLeadToStage(
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body('stageId') stageId: string | null,
  ) {
    return this.crmService.moveLeadToStage(leadId, stageId);
  }

  // ============ LEAD STAGES ENDPOINTS ============

  @Post('lead-stages')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async createLeadStage(@Body() createLeadStageDto: CreateLeadStageDto) {
    return this.crmService.createLeadStage(createLeadStageDto);
  }

  @Get('lead-stages')
  @Auth()
  async findAllLeadStages(@Query('workspaceId') workspaceId: string) {
    return this.crmService.findAllLeadStages(workspaceId);
  }

  @Get('lead-stages/:id')
  @Auth()
  async findLeadStageById(@Param('id', ParseUUIDPipe) id: string) {
    return this.crmService.findLeadStageById(id);
  }

  @Patch('lead-stages/:id')
  @Auth()
  async updateLeadStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLeadStageDto: UpdateLeadStageDto,
  ) {
    return this.crmService.updateLeadStage(id, updateLeadStageDto);
  }

  @Delete('lead-stages/:id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLeadStage(@Param('id', ParseUUIDPipe) id: string) {
    return this.crmService.deleteLeadStage(id);
  }

  // ============ KANBAN ENDPOINTS ============

  @Get('workspace/:workspaceId/kanban')
  @Auth()
  async getWorkspaceKanban(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ) {
    return this.crmService.getWorkspaceKanban(workspaceId);
  }

  @Post('workspace/:workspaceId/reorder-leads')
  @Auth()
  async reorderLeads(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() leadMoves: { id: string; stageId: string | null }[],
  ) {
    return this.crmService.reorderLeads(workspaceId, leadMoves);
  }

  // ============ WHATSAPP MESSAGING ============
  @Post('leads/:id/whatsapp')
  @Auth()
  async sendWhatsAppToLead(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { message: string; template?: string },
  ) {
    const lead = await this.crmService.findLeadById(id);
    if (!lead.phone) {
      return { success: false, error: 'Lead has no phone number' };
    }

    let message = body.message;

    // Use template if provided
    if (body.template) {
      const templates: Record<string, string> = {
        greeting: `مرحباً ${lead.name}! 👋\n\nنحن سعداء بالتواصل معك. كيف يمكننا مساعدتك؟`,
        follow_up: `مرحباً ${lead.name}! 👋\n\nنتابع معك بخصوص استفسارك السابق. هل تحتاج مساعدة إضافية؟`,
        payment_reminder: `مرحباً ${lead.name}! 👋\n\nنود تذكيرك بالدفعة المستحقة. يرجى التواصل معنا للمزيد من التفاصيل.`,
      };
      message = templates[body.template] || message;
    }

    const success = await this.whatsAppService.sendTextMessage(
      lead.phone,
      message,
    );
    return { success, leadId: id, sentTo: lead.phone };
  }
}
