import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CloseSessionDto, OpenSessionDto, SessionQueryDto } from './dto';
import { PosSessionsService } from './pos-sessions.service';

@Controller('pos/sessions')
export class PosSessionsController {
  constructor(private readonly posSessionsService: PosSessionsService) {}

  @Post('open')
  async openSession(@Body() dto: OpenSessionDto) {
    return this.posSessionsService.openSession(dto);
  }

  @Post(':id/close')
  async closeSession(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseSessionDto,
  ) {
    return this.posSessionsService.closeSession(id, dto);
  }

  @Get('filters')
  async getSessionFilterOptions() {
    return this.posSessionsService.getSessionFilterOptions();
  }

  @Get('active/:posId')
  async getActiveSession(@Param('posId', ParseIntPipe) posId: number) {
    return this.posSessionsService.getActiveSession(posId);
  }

  @Get()
  async getSessionHistory(@Query() filters: SessionQueryDto) {
    return this.posSessionsService.getSessionHistory(filters);
  }

  @Get(':id/summary')
  async getSessionSummary(@Param('id', ParseIntPipe) id: number) {
    return this.posSessionsService.getSessionSummary(id);
  }

  @Get(':id')
  async getSession(@Param('id', ParseIntPipe) id: number) {
    return this.posSessionsService.getSession(id);
  }

  @Get(':id/invoices')
  async getSessionInvoices(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.posSessionsService.getSessionInvoices(id, pageNum, limitNum);
  }

  @Get(':id/old-sessions/invoices')
  async getOldSessionsInvoices(
    @Param('id', ParseIntPipe) id: number,
    @Query('posId', ParseIntPipe) posId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.posSessionsService.getOldSessionsInvoices(
      posId,
      id,
      pageNum,
      limitNum,
    );
  }
}
