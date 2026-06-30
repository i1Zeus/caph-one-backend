import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
} from '@nestjs/common';
import { Auth } from '../../auth';
import { DisciplinaryActionsService } from './disciplinary-actions.service';
import {
  CreateDisciplinaryActionDto,
  GetDisciplinaryActionsDto,
  ResolveActionDto,
  UpdateDisciplinaryActionDto,
} from './dto';

@Controller('hr/disciplinary-actions')
@Auth()
export class DisciplinaryActionsController {
  constructor(private readonly actionsService: DisciplinaryActionsService) {}

  @Post()
  async create(@Body() createDto: CreateDisciplinaryActionDto, @Request() req) {
    return this.actionsService.create(createDto, req.user.userId);
  }

  @Get()
  async findAll(@Query() dto: GetDisciplinaryActionsDto) {
    return this.actionsService.findAll(dto);
  }

  @Get('stats')
  async getStats() {
    return this.actionsService.getStats();
  }

  @Get('critical')
  async getCriticalActions() {
    return this.actionsService.getCriticalActions();
  }

  @Get('multiple-warnings')
  async getEmployeesWithMultipleWarnings(
    @Query('minWarnings') minWarnings?: string,
  ) {
    const min = minWarnings ? parseInt(minWarnings, 10) : 3;
    return this.actionsService.getEmployeesWithMultipleWarnings(min);
  }

  @Get('employee/:employeeId')
  async findByEmployee(@Param('employeeId') employeeId: string) {
    return this.actionsService.findByEmployee(employeeId);
  }

  @Get('employee/:employeeId/history')
  async getEmployeeActionHistory(@Param('employeeId') employeeId: string) {
    return this.actionsService.getEmployeeActionHistory(employeeId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.actionsService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDisciplinaryActionDto,
  ) {
    return this.actionsService.update(id, updateDto);
  }

  @Put(':id/resolve')
  async resolve(@Param('id') id: string, @Body() resolveDto: ResolveActionDto) {
    return this.actionsService.resolve(id, resolveDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.actionsService.remove(id);
  }
}
