import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeAttendance, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BulkDeviceAttendanceDto,
  CreateAttendanceDto,
  DeviceAttendanceRecordDto,
  UpdateAttendanceDto,
} from './dto';

@Injectable()
export class AttendancesService {
  constructor(private prisma: PrismaService, private tenantPrisma: TenantPrismaService) {}

  async create(
    createAttendanceDto: CreateAttendanceDto,
  ): Promise<EmployeeAttendance> {
    try {
      // Check if attendance already exists for this employee on this date
      const existingAttendance = await this.tenantPrisma.client.employeeAttendance.findFirst(
        {
          where: {
            employeeId: createAttendanceDto.employeeId,
            date: new Date(createAttendanceDto.date),
            isDeleted: false,
          },
        },
      );

      if (existingAttendance) {
        throw new BadRequestException(
          'Attendance already exists for this date',
        );
      }

      return await this.tenantPrisma.client.employeeAttendance.create({
        data: {
          ...createAttendanceDto,
          date: new Date(createAttendanceDto.date),
          timeIn: createAttendanceDto.timeIn
            ? new Date(createAttendanceDto.timeIn)
            : undefined,
          timeOut: createAttendanceDto.timeOut
            ? new Date(createAttendanceDto.timeOut)
            : undefined,
          notes: createAttendanceDto.notes,
        },
        include: {
          employee: {
            include: {
              job: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create attendance');
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    employeeId?: string,
    startDate?: string,
    endDate?: string,
    status?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeAttendanceWhereInput = {
      isDeleted: false,
      sn: null, // Only show main attendance records, not tracking records
      ...(employeeId && { employeeId }),
      ...(status && { status: status as any }),
      ...(startDate &&
        endDate && {
          date: {
            gte: new Date(startDate + 'T00:00:00.000Z'),
            lte: new Date(endDate + 'T23:59:59.999Z'),
          },
        }),
    };

    const [attendances, total] = await Promise.all([
      this.tenantPrisma.client.employeeAttendance.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: {
            include: {
              job: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      this.tenantPrisma.client.employeeAttendance.count({ where }),
    ]);

    return {
      attendances,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<EmployeeAttendance> {
    const attendance = await this.tenantPrisma.client.employeeAttendance.findUnique({
      where: { id, isDeleted: false },
      include: {
        employee: {
          include: {
            job: true,
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    return attendance;
  }

  async update(
    id: string,
    updateAttendanceDto: UpdateAttendanceDto,
  ): Promise<EmployeeAttendance> {
    await this.findOne(id);

    try {
      return await this.tenantPrisma.client.employeeAttendance.update({
        where: { id },
        data: {
          ...updateAttendanceDto,
          date: updateAttendanceDto.date
            ? new Date(updateAttendanceDto.date)
            : undefined,
          timeIn: updateAttendanceDto.timeIn
            ? new Date(updateAttendanceDto.timeIn)
            : undefined,
          timeOut: updateAttendanceDto.timeOut
            ? new Date(updateAttendanceDto.timeOut)
            : undefined,
          notes: updateAttendanceDto.notes,
        },
        include: {
          employee: {
            include: {
              job: true,
            },
          },
        },
      });
    } catch {
      throw new BadRequestException('Failed to update attendance');
    }
  }

  async remove(id: string): Promise<EmployeeAttendance> {
    await this.findOne(id);

    return await this.tenantPrisma.client.employeeAttendance.update({
      where: { id },
      data: { isDeleted: true },
      include: {
        employee: true,
      },
    });
  }

  async getAttendanceStats(startDate?: string, endDate?: string) {
    const dateFilter =
      startDate && endDate
        ? {
            date: {
              gte: new Date(startDate + 'T00:00:00.000Z'),
              lte: new Date(endDate + 'T23:59:59.999Z'),
            },
          }
        : {};

    const [present, remote] = await Promise.all([
      this.tenantPrisma.client.employeeAttendance.count({
        where: {
          isDeleted: false,
          sn: null, // Only count main records
          status: 'PRESENT',
          ...dateFilter,
        },
      }),
      this.tenantPrisma.client.employeeAttendance.count({
        where: {
          isDeleted: false,
          sn: null, // Only count main records
          status: 'REMOTE',
          ...dateFilter,
        },
      }),
    ]);

    return {
      present,
      remote,
    };
  }

  async clockIn(employeeId: string): Promise<EmployeeAttendance> {
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );

    // Check if already clocked in today
    const existingAttendance = await this.tenantPrisma.client.employeeAttendance.findFirst({
      where: {
        employeeId,
        date: today,
        sn: null, // Only check main records
        isDeleted: false,
      },
    });

    if (existingAttendance) {
      if (existingAttendance.timeIn) {
        throw new BadRequestException('Already clocked in today');
      }
      // Update existing record with clock in time
      return await this.tenantPrisma.client.employeeAttendance.update({
        where: { id: existingAttendance.id },
        data: {
          timeIn: new Date(),
          status: 'PRESENT',
        },
        include: {
          employee: true,
        },
      });
    }

    // Create new attendance record
    return await this.tenantPrisma.client.employeeAttendance.create({
      data: {
        employeeId,
        date: today,
        timeIn: new Date(),
        status: 'PRESENT',
      },
      include: {
        employee: true,
      },
    });
  }

  async clockOut(employeeId: string): Promise<EmployeeAttendance> {
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );

    const attendance = await this.tenantPrisma.client.employeeAttendance.findFirst({
      where: {
        employeeId,
        date: today,
        sn: null, // Only check main records
        isDeleted: false,
      },
    });

    if (!attendance) {
      throw new BadRequestException('No clock-in record found for today');
    }

    if (attendance.timeOut) {
      throw new BadRequestException('Already clocked out today');
    }

    return await this.tenantPrisma.client.employeeAttendance.update({
      where: { id: attendance.id },
      data: {
        timeOut: new Date(),
      },
      include: {
        employee: true,
      },
    });
  }

  async createFromDeviceRecord(
    deviceRecord: DeviceAttendanceRecordDto,
  ): Promise<EmployeeAttendance> {
    try {
      // Find employee by fingerprint ID
      const employee = await this.tenantPrisma.client.employee.findUnique({
        where: {
          fingerPrintId: deviceRecord.user_id,
          isDeleted: false,
        },
      });

      if (!employee) {
        throw new NotFoundException(
          `Employee with fingerprint ID ${deviceRecord.user_id} not found`,
        );
      }

      // Parse the record time
      const recordTime = new Date(deviceRecord.record_time);
      // Create date at UTC midnight to avoid timezone issues
      const date = new Date(
        Date.UTC(
          recordTime.getFullYear(),
          recordTime.getMonth(),
          recordTime.getDate(),
        ),
      );

      // Find existing attendance record for this employee on this date
      const existingAttendance = await this.tenantPrisma.client.employeeAttendance.findFirst(
        {
          where: {
            employeeId: employee.id,
            date: date,
            isDeleted: false,
          },
        },
      );

      if (existingAttendance) {
        // Update existing record with proper timeIn/timeOut logic
        const allPunchTimes = [
          ...(existingAttendance.timeIn ? [existingAttendance.timeIn] : []),
          ...(existingAttendance.timeOut ? [existingAttendance.timeOut] : []),
          recordTime,
        ].sort((a, b) => a.getTime() - b.getTime());

        const earliestTime = allPunchTimes[0];
        const latestTime = allPunchTimes[allPunchTimes.length - 1];

        const updateData: any = {
          status: 'PRESENT',
          timeIn: earliestTime,
        };

        // Only set timeOut if we have different times
        if (earliestTime.getTime() !== latestTime.getTime()) {
          updateData.timeOut = latestTime;
        }

        return await this.tenantPrisma.client.employeeAttendance.update({
          where: { id: existingAttendance.id },
          data: updateData,
          include: {
            employee: true,
          },
        });
      } else {
        // Create new attendance record - only timeIn, no timeOut
        return await this.tenantPrisma.client.employeeAttendance.create({
          data: {
            employeeId: employee.id,
            date: date,
            timeIn: recordTime,
            status: 'PRESENT',
          },
          include: {
            employee: true,
          },
        });
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create attendance record: ${error.message}`,
      );
    }
  }

  async createBulkFromDeviceRecords(
    bulkDeviceDto: BulkDeviceAttendanceDto,
  ): Promise<{
    created: EmployeeAttendance[];
    errors: Array<{ record: DeviceAttendanceRecordDto; error: string }>;
  }> {
    const created: EmployeeAttendance[] = [];
    const errors: Array<{ record: DeviceAttendanceRecordDto; error: string }> =
      [];

    // Process in chunks to manage memory for large datasets
    const CHUNK_SIZE = 100;
    const totalRecords = bulkDeviceDto.records.length;

    console.log(
      `Processing ${totalRecords} attendance records in chunks of ${CHUNK_SIZE}`,
    );

    try {
      // Get all unique fingerprint IDs and fetch employees in batch
      const uniqueFingerPrintIds = [
        ...new Set(bulkDeviceDto.records.map((r) => r.user_id)),
      ];
      const employees = await this.tenantPrisma.client.employee.findMany({
        where: {
          fingerPrintId: {
            in: uniqueFingerPrintIds,
          },
          isDeleted: false,
        },
        select: {
          id: true,
          fingerPrintId: true,
        },
      });

      const employeeMap = new Map(
        employees.map((emp) => [emp.fingerPrintId, emp.id]),
      );
      console.log(
        `Found ${employees.length} employees out of ${uniqueFingerPrintIds.length} unique fingerprint IDs`,
      );

      // Filter out records with invalid employee IDs and group valid records
      const groupedRecords = new Map<
        string,
        (DeviceAttendanceRecordDto & { employeeId: string; date: Date })[]
      >();

      for (const record of bulkDeviceDto.records) {
        const employeeId = employeeMap.get(record.user_id) as string;

        if (!employeeId) {
          errors.push({
            record,
            error: `Employee with fingerprint ID ${record.user_id} not found`,
          });
          continue;
        }

        const recordTime = new Date(record.record_time);
        const date = new Date(
          Date.UTC(
            recordTime.getFullYear(),
            recordTime.getMonth(),
            recordTime.getDate(),
          ),
        );
        const key = `${employeeId}-${date.toISOString().split('T')[0]}`;

        if (!groupedRecords.has(key)) {
          groupedRecords.set(key, []);
        }

        groupedRecords.get(key)!.push({
          ...record,
          employeeId,
          date,
        });
      }

      console.log(
        `Grouped records into ${groupedRecords.size} employee-date combinations`,
      );

      // Process groups in chunks with transactions
      const groupEntries = Array.from(groupedRecords.entries());

      for (let i = 0; i < groupEntries.length; i += CHUNK_SIZE) {
        const chunk = groupEntries.slice(i, i + CHUNK_SIZE);
        console.log(
          `Processing chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(groupEntries.length / CHUNK_SIZE)}`,
        );

        // Use transaction for each chunk to ensure data consistency
        await this.tenantPrisma.client.$transaction(
          async (prisma) => {
            // Process each employee-date group
            for (const [, records] of chunk) {
              try {
                // Sort records by time (earliest first)
                records.sort(
                  (a, b) =>
                    new Date(a.record_time).getTime() -
                    new Date(b.record_time).getTime(),
                );

                const { employeeId, date } = records[0];

                // Get the first and last punch times for this employee-date
                const firstPunchTime = new Date(records[0].record_time);
                const lastPunchTime = new Date(
                  records[records.length - 1].record_time,
                );

                // Check if employee already has attendance record for this date
                const existingRecord =
                  await prisma.employeeAttendance.findFirst({
                    where: {
                      employeeId,
                      date,
                      isDeleted: false,
                    },
                  });

                if (existingRecord) {
                  // Employee has existing record - update with all punch times
                  const allPunchTimes = [
                    ...(existingRecord.timeIn ? [existingRecord.timeIn] : []),
                    ...(existingRecord.timeOut ? [existingRecord.timeOut] : []),
                    ...records.map((r) => new Date(r.record_time)),
                  ].sort((a, b) => a.getTime() - b.getTime());

                  const earliestTime = allPunchTimes[0];
                  const latestTime = allPunchTimes[allPunchTimes.length - 1];

                  const updateData: any = {
                    status: 'PRESENT',
                    timeIn: earliestTime,
                  };

                  // Only set timeOut if we have different times
                  if (earliestTime.getTime() !== latestTime.getTime()) {
                    updateData.timeOut = latestTime;
                  }

                  const updatedRecord = await prisma.employeeAttendance.update({
                    where: { id: existingRecord.id },
                    data: updateData,
                    include: { employee: true },
                  });
                  created.push(updatedRecord);
                } else {
                  // No existing record - create new attendance record
                  const attendanceData: any = {
                    employeeId,
                    date,
                    timeIn: firstPunchTime,
                    status: 'PRESENT',
                  };

                  // Only set timeOut if we have multiple different times
                  if (
                    records.length > 1 &&
                    firstPunchTime.getTime() !== lastPunchTime.getTime()
                  ) {
                    attendanceData.timeOut = lastPunchTime;
                  }

                  const newRecord = await prisma.employeeAttendance.create({
                    data: attendanceData,
                    include: { employee: true },
                  });
                  created.push(newRecord);
                }
              } catch (error) {
                // Add error for all records in this group
                for (const record of records) {
                  errors.push({
                    record,
                    error: `Failed to process group: ${error.message}`,
                  });
                }
              }
            }
          },
          {
            timeout: 300000, // 5 minutes timeout for large chunks
          },
        );

        console.log(`Chunk ${Math.floor(i / CHUNK_SIZE) + 1} completed`);
      }
    } catch (error) {
      console.error('Bulk processing failed:', error);
      // If there's a general error, add it for remaining unprocessed records
      const processedSns = new Set([...errors.map((e) => e.record.sn)]);

      for (const record of bulkDeviceDto.records) {
        if (!processedSns.has(record.sn)) {
          errors.push({
            record,
            error: `Bulk processing failed: ${error.message}`,
          });
        }
      }
    }

    console.log(
      `Bulk processing completed: ${created.length} records processed successfully, ${errors.length} errors`,
    );
    return { created, errors };
  }
}
