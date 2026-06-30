import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Auth } from '../../auth';
import { ApproveLeaveDto, CreateLeaveDto, UpdateLeaveDto } from './dto';
import { LeavesService } from './leaves.service';

@Controller('hr/leaves')
@Auth()
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Post()
  // Allow all employees to create leave requests
  create(@Body() createLeaveDto: CreateLeaveDto) {
    return this.leavesService.create(createLeaveDto);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('leaveType') leaveType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.leavesService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      employeeId,
      status,
      leaveType,
      startDate,
      endDate,
    );
  }

  @Get('stats')
  getStats() {
    return this.leavesService.getLeaveStats();
  }

  @Get('employee/:employeeId/balance')
  getEmployeeLeaveBalance(@Param('employeeId') employeeId: string) {
    return this.leavesService.getEmployeeLeaveBalance(employeeId);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() approveLeaveDto: ApproveLeaveDto) {
    return this.leavesService.approve(id, approveLeaveDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leavesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLeaveDto: UpdateLeaveDto) {
    return this.leavesService.update(id, updateLeaveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leavesService.remove(id);
  }
}
