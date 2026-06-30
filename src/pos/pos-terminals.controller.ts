import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreatePosTerminalDto,
  SessionQueryDto,
  UpdatePosTerminalDto,
} from './dto';
import { PosTerminalsService } from './pos-terminals.service';

@Controller('pos/terminals')
export class PosTerminalsController {
  constructor(private readonly posTerminalsService: PosTerminalsService) {}

  @Get()
  async getAllTerminals() {
    return this.posTerminalsService.getAllTerminals();
  }

  @Get(':id/sessions')
  async getTerminalSessions(
    @Param('id', ParseIntPipe) id: number,
    @Query() filters: SessionQueryDto,
  ) {
    return this.posTerminalsService.getTerminalSessions(id, filters);
  }

  @Get(':id')
  async getTerminal(@Param('id', ParseIntPipe) id: number) {
    return this.posTerminalsService.getTerminal(id);
  }

  @Post()
  async createTerminal(@Body() dto: CreatePosTerminalDto) {
    return this.posTerminalsService.createTerminal(dto);
  }

  @Patch(':id')
  async updateTerminal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePosTerminalDto,
  ) {
    return this.posTerminalsService.updateTerminal(id, dto);
  }

  @Delete(':id')
  async deleteTerminal(@Param('id', ParseIntPipe) id: number) {
    return this.posTerminalsService.deleteTerminal(id);
  }
}
