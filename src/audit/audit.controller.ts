import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
} from '@nestjs/common';
import { Auth } from '../auth/decorators/universal-auth.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
@Auth() // 🔥 Controller-level protection! All endpoints require audit:* permissions
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Get recent audit history
   * Auto-detects: audit:read
   */
  @Get('history')
  async getRecentHistory(
    @Req() req: any,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    const user = req.user;
    return this.auditService.getRecentHistory(
      limit,
      user.tenantId,
      user.isSuperAdmin,
    );
  }

  /**
   * Get audit history for a specific entity
   * Auto-detects: audit:read
   */
  @Get('entity/:entityType/:entityId')
  async getEntityHistory(
    @Req() req: any,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    const user = req.user;
    return this.auditService.getEntityHistory(
      entityType,
      entityId,
      limit,
      user.tenantId,
      user.isSuperAdmin,
    );
  }

  /**
   * Get audit statistics
   * Auto-detects: audit:read
   */
  @Get('statistics')
  async getAuditStatistics(
    @Req() req: any,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    const user = req.user;
    return this.auditService.getAuditStatistics(
      days,
      user.tenantId,
      user.isSuperAdmin,
    );
  }

  /**
   * Get audit logs by action type
   * Auto-detects: audit:read
   */
  @Get('actions/:actionType')
  async getActionHistory(
    @Req() req: any,
    @Param('actionType') actionType: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    const user = req.user;
    return this.auditService.getActionHistory(
      actionType,
      limit,
      user.tenantId,
      user.isSuperAdmin,
    );
  }

  /**
   * Get audit logs by entity type
   * Auto-detects: audit:read
   */
  @Get('entities/:entityType')
  async getEntityTypeHistory(
    @Req() req: any,
    @Param('entityType') entityType: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    const user = req.user;
    return this.auditService.getEntityTypeHistory(
      entityType,
      limit,
      user.tenantId,
      user.isSuperAdmin,
    );
  }
}
