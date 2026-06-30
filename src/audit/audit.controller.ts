import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
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
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.auditService.getRecentHistory(limit);
  }

  /**
   * Get audit history for a specific entity
   * Auto-detects: audit:read
   */
  @Get('entity/:entityType/:entityId')
  async getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.auditService.getEntityHistory(entityType, entityId, limit);
  }

  /**
   * Get audit statistics
   * Auto-detects: audit:read
   */
  @Get('statistics')
  async getAuditStatistics(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.auditService.getAuditStatistics(days);
  }

  /**
   * Get audit logs by action type
   * Auto-detects: audit:read
   */
  @Get('actions/:actionType')
  async getActionHistory(
    @Param('actionType') actionType: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.auditService.getActionHistory(actionType, limit);
  }

  /**
   * Get audit logs by entity type
   * Auto-detects: audit:read
   */
  @Get('entities/:entityType')
  async getEntityTypeHistory(
    @Param('entityType') entityType: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.auditService.getEntityTypeHistory(entityType, limit);
  }
}
