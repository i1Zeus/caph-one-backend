import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import {
  BulkDeviceAttendanceDto,
  CreateAttendanceDto,
  DeviceAttendanceRecordDto,
  UpdateAttendanceDto,
} from './dto';

@Controller('hr/attendances')
export class AttendancesController {
  private readonly logger = new Logger(AttendancesController.name);

  constructor(private readonly attendancesService: AttendancesService) {}

  @Post()
  create(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.attendancesService.create(createAttendanceDto);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    return this.attendancesService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      employeeId,
      startDate,
      endDate,
      status,
    );
  }

  @Get('stats')
  getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendancesService.getAttendanceStats(startDate, endDate);
  }

  @Post('clock-in/:employeeId')
  clockIn(@Param('employeeId') employeeId: string) {
    return this.attendancesService.clockIn(employeeId);
  }

  @Post('clock-out/:employeeId')
  clockOut(@Param('employeeId') employeeId: string) {
    return this.attendancesService.clockOut(employeeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendancesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    return this.attendancesService.update(id, updateAttendanceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attendancesService.remove(id);
  }

  @Post('device-record')
  createFromDeviceRecord(@Body() deviceRecord: DeviceAttendanceRecordDto) {
    return this.attendancesService.createFromDeviceRecord(deviceRecord);
  }

  @Post('device-records/bulk')
  async createBulkFromDeviceRecords(
    @Body() bulkDeviceDto: BulkDeviceAttendanceDto,
  ) {
    // Validate payload size to ensure it's manageable
    const recordCount = bulkDeviceDto.records?.length || 0;
    const maxRecords = 10000; // Maximum records per request (adjust as needed)

    if (recordCount === 0) {
      throw new HttpException('No records provided', HttpStatus.BAD_REQUEST);
    }

    if (recordCount > maxRecords) {
      throw new HttpException(
        `Too many records. Maximum allowed: ${maxRecords}, received: ${recordCount}. Please split your request into smaller batches.`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    this.logger.log(
      `Starting bulk processing of ${recordCount} attendance records`,
    );

    try {
      const startTime = Date.now();
      const result =
        await this.attendancesService.createBulkFromDeviceRecords(
          bulkDeviceDto,
        );
      const processingTime = Date.now() - startTime;

      this.logger.log(
        `Bulk processing completed in ${processingTime}ms: ${result.created.length} successful, ${result.errors.length} errors`,
      );

      // Return summary along with full results for better monitoring
      return {
        ...result,
        summary: {
          totalRecords: recordCount,
          successful: result.created.length,
          failed: result.errors.length,
          processingTimeMs: processingTime,
        },
      };
    } catch (error) {
      this.logger.error(
        `Bulk processing failed for ${recordCount} records: ${error.message}`,
        error.stack,
      );

      if (error.message?.includes('timeout')) {
        throw new HttpException(
          'Request timeout: The dataset is too large. Please split into smaller batches.',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      throw new HttpException(
        'Bulk processing failed. Please check the data format and try again with smaller batches if the issue persists.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
