import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
} from '@nestjs/common';
import { Auth } from '../../auth';
import { CreateEmployeeExitDto, UpdateEmployeeExitDto } from './dto';
import { EmployeeExitService } from './employee-exit.service';

@Controller('hr/employee-exit')
@Auth()
export class EmployeeExitController {
  constructor(private readonly exitService: EmployeeExitService) {}

  @Post()
  async create(@Body() createDto: CreateEmployeeExitDto, @Request() req) {
    return this.exitService.create(createDto, req.user.userId);
  }

  @Get()
  async findAll() {
    return this.exitService.findAll();
  }

  @Get('stats')
  async getStats() {
    return this.exitService.getStats();
  }

  @Get('clearance-pending')
  async getClearancePending() {
    return this.exitService.getClearancePending();
  }

  @Get('settlement-pending')
  async getSettlementPending() {
    return this.exitService.getSettlementPending();
  }

  @Get('employee/:employeeId')
  async findByEmployee(@Param('employeeId') employeeId: string) {
    return this.exitService.findByEmployee(employeeId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.exitService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEmployeeExitDto,
  ) {
    return this.exitService.update(id, updateDto);
  }

  @Put(':id/clearance')
  async updateClearance(
    @Param('id') id: string,
    @Body()
    checklist: {
      assetReturned?: boolean;
      documentsSigned?: boolean;
      accessRevoked?: boolean;
      exitInterviewCompleted?: boolean;
      handoverCompleted?: boolean;
    },
  ) {
    return this.exitService.updateClearanceChecklist(id, checklist);
  }

  @Put(':id/settlement')
  async updateSettlement(
    @Param('id') id: string,
    @Body()
    settlement: {
      finalSettlement?: number;
      settlementPaid?: boolean;
      settlementDate?: string;
      settlementNotes?: string;
    },
  ) {
    return this.exitService.updateFinancialSettlement(id, settlement);
  }

  @Put(':id/interview')
  async recordInterview(
    @Param('id') id: string,
    @Body()
    interview: {
      exitInterviewDone: boolean;
      exitInterviewDate?: string;
      feedback?: string;
      rehireEligible?: boolean;
    },
  ) {
    return this.exitService.recordExitInterview(id, interview);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.exitService.remove(id);
  }
}
