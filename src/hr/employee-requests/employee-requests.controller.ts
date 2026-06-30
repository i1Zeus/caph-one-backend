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
import {
  CreateEmployeeRequestDto,
  GetEmployeeRequestsDto,
  ReviewRequestDto,
  UpdateEmployeeRequestDto,
} from './dto';
import { EmployeeRequestsService } from './employee-requests.service';

@Controller('hr/employee-requests')
@Auth()
export class EmployeeRequestsController {
  constructor(private readonly requestsService: EmployeeRequestsService) {}

  @Post()
  async create(@Body() createDto: CreateEmployeeRequestDto) {
    return this.requestsService.create(createDto);
  }

  @Get()
  async findAll(@Query() dto: GetEmployeeRequestsDto) {
    return this.requestsService.findAll(dto);
  }

  @Get('stats')
  async getStats(@Query('employeeId') employeeId?: string) {
    return this.requestsService.getStats(employeeId);
  }

  @Get('pending')
  async getPendingRequests() {
    return this.requestsService.getPendingRequests();
  }

  @Get('urgent')
  async getUrgentRequests() {
    return this.requestsService.getUrgentRequests();
  }

  @Get('employee/:employeeId')
  async findByEmployee(@Param('employeeId') employeeId: string) {
    return this.requestsService.findByEmployee(employeeId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.requestsService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEmployeeRequestDto,
  ) {
    return this.requestsService.update(id, updateDto);
  }

  @Put(':id/review')
  async review(
    @Param('id') id: string,
    @Body() reviewDto: ReviewRequestDto,
    @Request() req,
  ) {
    return this.requestsService.review(id, reviewDto, req.user.userId);
  }

  @Put(':id/cancel')
  async cancel(@Param('id') id: string, @Request() req) {
    return this.requestsService.cancel(id, req.user.userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.requestsService.remove(id);
  }
}
