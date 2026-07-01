import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Salary } from '@prisma/client';
import { decrypt, encrypt } from 'utils/help';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSalaryDto,
  GenerateSalarySlipsDto,
  SalaryCalculationResult,
  SalarySlipGenerationResult,
  UpdateSalaryDto,
} from './dto';

@Injectable()
export class SalariesService {
  constructor(private prisma: PrismaService, private tenantPrisma: TenantPrismaService) {}

  async create(createSalaryDto: CreateSalaryDto): Promise<Salary> {
    try {
      // Check if salary already exists for this employee in this month/year
      const existingSalary = await this.tenantPrisma.client.salary.findFirst({
        where: {
          employeeId: createSalaryDto.employeeId,
          currentYear: createSalaryDto.currentYear,
          currentMonth: createSalaryDto.currentMonth,
          isDeleted: false,
        },
      });

      if (existingSalary) {
        throw new BadRequestException(
          'Salary already exists for this employee in this month',
        );
      }

      return await this.tenantPrisma.client.salary.create({
        data: {
          ...createSalaryDto,
          startDate: createSalaryDto.startDate
            ? new Date(createSalaryDto.startDate)
            : undefined,
          endDate: createSalaryDto.endDate
            ? new Date(createSalaryDto.endDate)
            : undefined,
        },
        include: {
          employee: true,
          paidBy: true,
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create salary record');
    }
  }

  async regenerateSalarySlips(
    generateDto: GenerateSalarySlipsDto,
  ): Promise<SalarySlipGenerationResult> {
    const {
      workspaceId,
      year,
      month,
      // paidById,
      // currency = 'IQD',
    } = generateDto;

    // First delete existing salary records for this month/year/workspace (only unpaid ones)
    await this.tenantPrisma.client.salary.deleteMany({
      where: {
        currentYear: year,
        currentMonth: month,
        isSalaryGet: false, // Only delete unpaid salaries
        employee: {
          user: {
            workspaces: {
              some: {
                workspaceId: workspaceId,
              },
            },
          },
        },
      },
    });

    // Now generate new salary slips
    return this.generateSalarySlips(generateDto);
  }

  async generateSalarySlips(
    generateDto: GenerateSalarySlipsDto,
  ): Promise<SalarySlipGenerationResult> {
    const {
      workspaceId,
      year,
      month,
      paidById,
      currency = 'IQD',
      encryptionKey,
    } = generateDto;

    // Get all eligible employees in the workspace (excluding only terminated and suspended)
    const employees = await this.tenantPrisma.client.employee.findMany({
      where: {
        employmentStatus: {
          notIn: ['TERMINATED', 'SUSPENDED'], // Only exclude terminated and suspended employees
        },
        isDeleted: false,
        user: {
          workspaces: {
            some: {
              workspaceId: workspaceId,
            },
          },
        },
      },
      include: {
        user: true,
        attendances: {
          where: {
            date: {
              gte: new Date(year, month - 1, 1),
              lt: new Date(year, month, 1),
            },
            isDeleted: false,
          },
        },
        leaves: {
          where: {
            startDate: {
              gte: new Date(year, month - 1, 1),
              lt: new Date(year, month, 1),
            },
            status: 'APPROVED',
            isDeleted: false,
          },
        },
      },
    });

    const successful: SalaryCalculationResult[] = [];
    const failed: {
      employeeId: string;
      employeeName: string;
      reason: string;
    }[] = [];

    for (const employee of employees) {
      try {
        // Check if salary already exists for this month
        const existingSalary = await this.tenantPrisma.client.salary.findFirst({
          where: {
            employeeId: employee.id,
            currentYear: year,
            currentMonth: month,
            isDeleted: false,
          },
        });

        if (existingSalary) {
          failed.push({
            employeeId: employee.id,
            employeeName:
              `${employee.firstName} ${employee.lastName || ''}`.trim(),
            reason: 'Salary already exists for this month',
          });
          continue;
        }

        const calculation = await this.calculateSalary(
          employee,
          year,
          month,
          encryptionKey,
        );

        // Create salary record with detailed statistics
        await this.tenantPrisma.client.salary.create({
          data: {
            employeeId: employee.id,
            amount: encrypt(calculation.finalAmount.toString(), encryptionKey),
            currency: currency,
            currentYear: year,
            currentMonth: month,
            paidById: paidById,
            isSalaryGet: false,
            startDate: new Date(year, month - 1, 1),
            endDate: new Date(year, month, 0),
            // Store detailed statistics as JSON in a comment field or extend the model
            // For now, we'll return them in the calculation result
          },
        });

        successful.push(calculation);
      } catch (error) {
        failed.push({
          employeeId: employee.id,
          employeeName:
            `${employee.firstName} ${employee.lastName || ''}`.trim(),
          reason: error.message || 'Unknown error',
        });
      }
    }

    return {
      successful,
      failed,
      totalEmployees: employees.length,
      successCount: successful.length,
      failureCount: failed.length,
    };
  }

  private async calculateSalary(
    employee: any,
    year: number,
    month: number,
    encryptionKey: string,
  ): Promise<SalaryCalculationResult> {
    if (!employee.salary) {
      throw new Error('Employee salary not set');
    }

    const baseSalary = parseFloat(decrypt(employee.salary, encryptionKey));
    const workingHours = employee.workingHours || 8;
    const daysToWorkPerMonth = employee.daysToWorkPerMonth || 26;

    // Count approved leave days for specific leave types that reduce working days
    const leaveTypesToReduceWorkingDays = [
      'VACATION',
      'SICK',
      'MATERNITY',
      'LEAVE',
      'HOLIDAY',
    ];
    let totalLeaveDaysThisMonth = 0;

    for (const leave of employee.leaves) {
      if (leaveTypesToReduceWorkingDays.includes(leave.leaveType)) {
        // Calculate the number of days for this leave period
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        const leaveDays =
          Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
          ) + 1;
        totalLeaveDaysThisMonth += leaveDays;
      }
    }

    // Adjust daysToWorkPerMonth by subtracting approved leave days
    // Ensure we don't go below 1 day to avoid division by zero
    const adjustedDaysToWorkPerMonth = Math.max(
      1,
      daysToWorkPerMonth - totalLeaveDaysThisMonth,
    );

    // Calculate required working hours for the month using adjusted days
    const workingHoursRequired = workingHours * adjustedDaysToWorkPerMonth;

    // Calculate salary per hour using adjusted working days
    const salaryPerDay = baseSalary / adjustedDaysToWorkPerMonth;
    const salaryPerHour = salaryPerDay / workingHours;

    // Get working days in the month
    // const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const daysInMonth = monthEnd.getDate();

    let workingHoursActual = 0;
    let presentDays = 0;
    let delayHours = 0; // Renamed from lateHours for clarity
    let extraTimeHours = 0; // Renamed from overtimeHours for clarity
    let absentDays = 0;

    // Helper function to extract time components from DateTime and create a comparable time
    const getTimeOfDay = (dateTime: Date): number => {
      // Extract time from ISO string to avoid timezone conversion issues
      const isoString = dateTime.toISOString(); // Format: "2025-07-26T09:20:00.000Z"
      const timePart = isoString.split('T')[1]; // "09:20:00.000Z"
      const [hoursStr, minutesStr] = timePart.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);

      return hours * 60 + minutes; // Convert to minutes for easy comparison
    };

    // Helper function to convert stored working time to minutes (time-only comparison)
    const getWorkingTimeInMinutes = (
      workingTime: Date | null,
    ): number | null => {
      if (!workingTime) return null;

      // Extract time from ISO string to avoid timezone conversion issues
      const isoString = workingTime.toISOString(); // Format: "2000-01-01T09:00:00.000Z"
      const timePart = isoString.split('T')[1]; // "09:00:00.000Z"
      const [hoursStr, minutesStr] = timePart.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);

      return hours * 60 + minutes;
    };

    // Get employee's working schedule in minutes (time-only, ignore dates)
    const startWorkingTimeMinutes = getWorkingTimeInMinutes(
      employee.startWorkingTime,
    );
    const endWorkingTimeMinutes = getWorkingTimeInMinutes(
      employee.endWorkingTime,
    );

    // Validate that working times are set for accurate calculations
    if (!startWorkingTimeMinutes || !endWorkingTimeMinutes) {
      console.warn(
        `Warning: Working times not set for employee ${employee.firstName} ${employee.lastName || ''}`,
      );
    }

    // Group attendance records by date to avoid counting multiple records for same day
    const attendanceByDate = new Map<string, any[]>();

    for (const attendance of employee.attendances) {
      const dateKey = new Date(attendance.date).toISOString().split('T')[0]; // YYYY-MM-DD format

      if (!attendanceByDate.has(dateKey)) {
        attendanceByDate.set(dateKey, []);
      }
      attendanceByDate.get(dateKey)!.push(attendance);
    }

    // Process each unique date
    for (const [, dailyAttendances] of attendanceByDate) {
      let dailyHoursWorked = 0;
      let hasValidTimeTracking = false;
      let dailyTimeIn: Date | null = null;
      let dailyTimeOut: Date | null = null;

      // Process all attendance records for this date to find earliest timeIn and latest timeOut
      for (const attendance of dailyAttendances) {
        if (attendance.timeIn && attendance.timeOut) {
          const timeIn = new Date(attendance.timeIn);
          const timeOut = new Date(attendance.timeOut);
          const hoursWorked =
            (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60);

          dailyHoursWorked += hoursWorked;
          hasValidTimeTracking = true;

          // Track earliest timeIn and latest timeOut for the day
          if (!dailyTimeIn || timeIn < dailyTimeIn) {
            dailyTimeIn = timeIn;
          }
          if (!dailyTimeOut || timeOut > dailyTimeOut) {
            dailyTimeOut = timeOut;
          }
        } else if (attendance.timeIn && !attendance.timeOut) {
          // Handle cases where employee clocked in but didn't clock out
          const timeIn = new Date(attendance.timeIn);
          if (!dailyTimeIn || timeIn < dailyTimeIn) {
            dailyTimeIn = timeIn;
          }
          // Assume they worked until their scheduled end time or minimum 4 hours
          dailyHoursWorked += Math.max(4, workingHours * 0.5); // At least half day
          hasValidTimeTracking = true;
        } else if (attendance.status === 'PRESENT' && !hasValidTimeTracking) {
          // Only use this if no valid time tracking exists for the day
          dailyHoursWorked = workingHours;
        }
      }

      // Count this as one present day regardless of number of records
      if (
        dailyHoursWorked > 0 ||
        dailyAttendances.some((a) => a.status === 'PRESENT')
      ) {
        presentDays++;
        workingHoursActual += dailyHoursWorked;

        // Calculate delay time (late arrival) using the earliest timeIn
        if (startWorkingTimeMinutes !== null && dailyTimeIn) {
          const actualTimeInMinutes = getTimeOfDay(dailyTimeIn);

          // Only calculate delay if employee arrived after scheduled start time
          if (actualTimeInMinutes > startWorkingTimeMinutes) {
            const delayMinutes = actualTimeInMinutes - startWorkingTimeMinutes;
            // Safety check: delay should never exceed 12 hours per day
            if (delayMinutes <= 720) {
              // 720 minutes = 12 hours
              delayHours += delayMinutes / 60; // Convert back to hours
            } else {
              console.warn(
                `Warning: Skipping unrealistic delay of ${delayMinutes} minutes for employee ${employee.firstName}`,
              );
            }
          }
        }

        // Calculate extra time (overtime) using the latest timeOut
        if (endWorkingTimeMinutes !== null && dailyTimeOut) {
          const actualTimeOutMinutes = getTimeOfDay(dailyTimeOut);

          // Only calculate extra time if employee worked past scheduled end time
          if (actualTimeOutMinutes > endWorkingTimeMinutes) {
            const extraMinutes = actualTimeOutMinutes - endWorkingTimeMinutes;
            // Safety check: overtime should never exceed 12 hours per day
            if (extraMinutes <= 720) {
              // 720 minutes = 12 hours
              extraTimeHours += extraMinutes / 60; // Convert back to hours
            } else {
              console.warn(
                `Warning: Skipping unrealistic overtime of ${extraMinutes} minutes for employee ${employee.firstName}`,
              );
            }
          }
        }
      }
    }

    // Process leaves (ABSENT type deducts full days)
    for (const leave of employee.leaves) {
      if (leave.leaveType === 'ABSENT') {
        const leaveDays =
          Math.ceil(
            (leave.endDate.getTime() - leave.startDate.getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1;
        absentDays += leaveDays;
      }
    }

    // Calculate penalties and bonuses
    const delayPenalty = delayHours * salaryPerHour * 0.5; // 50% penalty for delay hours
    const extraTimeBonus = extraTimeHours * salaryPerHour * 1.5; // 150% bonus for extra time

    // Calculate final amount
    const calculatedAmount = workingHoursActual * salaryPerHour;
    const absentDeduction = absentDays * salaryPerDay;
    const finalAmount = Math.max(
      0,
      calculatedAmount - delayPenalty + extraTimeBonus - absentDeduction,
    );

    // Ensure precision in final calculations
    delayHours = parseFloat(delayHours.toFixed(2));
    extraTimeHours = parseFloat(extraTimeHours.toFixed(2));

    return {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName || ''}`.trim(),
      baseSalary,
      workingHoursRequired,
      workingHoursActual,
      salaryPerHour,
      calculatedAmount,
      latePenalty: delayPenalty, // Keeping the interface name but using correct calculation
      overtimeBonus: extraTimeBonus, // Keeping the interface name but using correct calculation
      finalAmount,
      attendanceDays: daysInMonth,
      presentDays,
      absentDays,
      lateHours: delayHours, // Keeping the interface name but using correct calculation
      overtimeHours: extraTimeHours, // Keeping the interface name but using correct calculation
      currency: employee.currency || 'IQD',
      year,
      month,
    };
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    employeeId?: string,
    year?: number,
    month?: number,
    workspaceId?: string,
    encryptionKey?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.SalaryWhereInput = {
      isDeleted: false,
      ...(employeeId && { employeeId }),
      ...(year && { currentYear: year }),
      ...(month && { currentMonth: month }),
      ...(workspaceId && {
        employee: {
          user: {
            workspaces: {
              some: {
                workspaceId: workspaceId,
              },
            },
          },
        },
      }),
    };

    const [salaries, total] = await Promise.all([
      this.tenantPrisma.client.salary.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: {
            include: {
              user: true,
              attendances: {
                where: {
                  date: {
                    gte: year
                      ? new Date(year, month ? month - 1 : 0, 1)
                      : undefined,
                    lt: year
                      ? new Date(year, month ? month : 12, 1)
                      : undefined,
                  },
                  isDeleted: false,
                },
              },
              leaves: {
                where: {
                  startDate: {
                    gte: year
                      ? new Date(year, month ? month - 1 : 0, 1)
                      : undefined,
                    lt: year
                      ? new Date(year, month ? month : 12, 1)
                      : undefined,
                  },
                  status: 'APPROVED',
                  isDeleted: false,
                },
              },
            },
          },
          paidBy: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.tenantPrisma.client.salary.count({ where }),
    ]);

    // Calculate detailed statistics for each salary record
    // Main calculation loop
    const salariesWithStats = await Promise.all(
      salaries.map(async (salary) => {
        try {
          const stats = await this.calculateSalary(
            salary.employee,
            salary.currentYear,
            salary.currentMonth,
            encryptionKey || '', // Pass empty string if no encryption key
          );

          // Default to 0 if not defined
          let totalDelayHours = 0;
          let totalExtraHours = 0;

          // Assuming salary.employee.startWorkingTime & endWorkingTime are Date objects
          const startWorkingTime = salary.employee.startWorkingTime;
          const endWorkingTime = salary.employee.endWorkingTime;

          // Loop through attendances and calculate total delay/extra hours
          if (
            salary.employee.attendances &&
            Array.isArray(salary.employee.attendances)
          ) {
            for (const attendance of salary.employee.attendances) {
              if (attendance.timeIn && attendance.timeOut) {
                const { delayTimeHours, extraTimeHours } =
                  this.calculateDelayAndExtraTime(
                    startWorkingTime,
                    endWorkingTime,
                    new Date(attendance.timeIn),
                    new Date(attendance.timeOut),
                  );

                totalDelayHours += delayTimeHours;
                totalExtraHours += extraTimeHours;
              }
            }
          }

          // Calculate efficiency percentage
          const efficiency =
            stats.workingHoursRequired > 0
              ? parseFloat(
                  (
                    (stats.workingHoursActual / stats.workingHoursRequired) *
                    100
                  ).toFixed(1),
                )
              : 0;

          // Decrypt amount if encryption key is provided
          let decryptedAmount = salary.amount;
          if (encryptionKey) {
            try {
              decryptedAmount = decrypt(salary.amount, encryptionKey);
            } catch (error) {
              // If decryption fails, keep the original encrypted value
              console.error(
                `Failed to decrypt amount for salary ${salary.id}:`,
                error,
              );
            }
          }

          return {
            ...salary,
            amount: decryptedAmount, // Use decrypted amount if available, otherwise encrypted
            statistics: {
              delayTimeHours: parseFloat(totalDelayHours.toFixed(2)),
              extraTimeHours: parseFloat(totalExtraHours.toFixed(2)),
              realTimeHours: parseFloat(stats.workingHoursActual.toFixed(2)),
              requiredTimeHours: parseFloat(
                stats.workingHoursRequired.toFixed(2),
              ),
              presentDays: stats.presentDays,
              absentDays: stats.absentDays,
              attendanceDays: stats.attendanceDays,
              efficiencyPercentage: efficiency,
            },
          };
        } catch (error) {
          console.error(
            `Error calculating statistics for employee ${salary.employeeId}:`,
            error,
          );

          // Decrypt amount if encryption key is provided even for error cases
          let decryptedAmount = salary.amount;
          if (encryptionKey) {
            try {
              decryptedAmount = decrypt(salary.amount, encryptionKey);
            } catch (decryptError) {
              // If decryption fails, keep the original encrypted value
              console.error(
                `Failed to decrypt amount for salary ${salary.id}:`,
                decryptError,
              );
            }
          }

          return {
            ...salary,
            amount: decryptedAmount, // Use decrypted amount if available, otherwise encrypted
            statistics: {
              delayTimeHours: 0,
              extraTimeHours: 0,
              realTimeHours: 0,
              requiredTimeHours: 0,
              presentDays: 0,
              absentDays: 0,
              attendanceDays: 0,
              efficiencyPercentage: 0,
            },
          };
        }
      }),
    );

    // Calculate summary statistics
    const totalEfficiency =
      salariesWithStats.length > 0
        ? parseFloat(
            (
              salariesWithStats.reduce(
                (sum, s) => sum + s.statistics.efficiencyPercentage,
                0,
              ) / salariesWithStats.length
            ).toFixed(1),
          )
        : 0;

    const summaryStats = {
      totalDelayHours: parseFloat(
        salariesWithStats
          .reduce((sum, s) => sum + s.statistics.delayTimeHours, 0)
          .toFixed(2),
      ),
      totalExtraHours: parseFloat(
        salariesWithStats
          .reduce((sum, s) => sum + s.statistics.extraTimeHours, 0)
          .toFixed(2),
      ),
      totalRealHours: parseFloat(
        salariesWithStats
          .reduce((sum, s) => sum + s.statistics.realTimeHours, 0)
          .toFixed(2),
      ),
      totalRequiredHours: parseFloat(
        salariesWithStats
          .reduce((sum, s) => sum + s.statistics.requiredTimeHours, 0)
          .toFixed(2),
      ),
      averageDelayHours: parseFloat(
        (salariesWithStats.length > 0
          ? salariesWithStats.reduce(
              (sum, s) => sum + s.statistics.delayTimeHours,
              0,
            ) / salariesWithStats.length
          : 0
        ).toFixed(2),
      ),
      averageExtraHours: parseFloat(
        (salariesWithStats.length > 0
          ? salariesWithStats.reduce(
              (sum, s) => sum + s.statistics.extraTimeHours,
              0,
            ) / salariesWithStats.length
          : 0
        ).toFixed(2),
      ),
      totalPresentDays: salariesWithStats.reduce(
        (sum, s) => sum + s.statistics.presentDays,
        0,
      ),
      totalAbsentDays: salariesWithStats.reduce(
        (sum, s) => sum + s.statistics.absentDays,
        0,
      ),
      employeeCount: salariesWithStats.length,
      averageEfficiency: totalEfficiency,
    };

    return {
      salaries: salariesWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summaryStats,
    };
  }

  calculateDelayAndExtraTime(
    startWorkingTime: Date,
    endWorkingTime: Date,
    timeIn: Date,
    timeOut: Date,
  ) {
    const normalize = (date: Date) => {
      const d = new Date(date);
      d.setFullYear(2000, 0, 1);
      return d;
    };

    const start = normalize(startWorkingTime);
    const end = normalize(endWorkingTime);
    const inTime = normalize(timeIn);
    const outTime = normalize(timeOut);

    let delay = 0;
    let extra = 0;

    if (inTime > start) {
      delay = (inTime.getTime() - start.getTime()) / (1000 * 60 * 60);
    }

    if (outTime > end) {
      extra = (outTime.getTime() - end.getTime()) / (1000 * 60 * 60);
    }

    return {
      delayTimeHours: parseFloat(delay.toFixed(2)),
      extraTimeHours: parseFloat(extra.toFixed(2)),
    };
  }

  // Test function to verify time calculations work correctly
  async testTimeCalculations() {
    console.log('\n=== TESTING TIME CALCULATIONS ===');

    // Test scenario: Employee should start at 9 AM and end at 5 PM
    // Actual attendance: arrived at 10 AM (1 hour late), left at 7 PM (2 hours overtime)

    // Simulate employee working times (9 AM and 5 PM)
    const startWorkingTime = new Date('2024-01-01T09:00:00');
    const endWorkingTime = new Date('2024-01-01T17:00:00');

    // Simulate actual attendance times (10 AM and 7 PM)
    const actualTimeIn = new Date('2024-01-15T10:00:00');
    const actualTimeOut = new Date('2024-01-15T19:00:00');

    // Helper functions (same as in calculateSalary)
    const getTimeOfDay = (dateTime: Date): number => {
      return dateTime.getHours() * 60 + dateTime.getMinutes();
    };

    const getWorkingTimeInMinutes = (
      workingTime: Date | null,
    ): number | null => {
      if (!workingTime) return null;
      const timeDate = new Date(workingTime);
      const hours = timeDate.getHours();
      const minutes = timeDate.getMinutes();
      return hours * 60 + minutes;
    };

    const formatTimeFromMinutes = (totalMinutes: number): string => {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };

    // Calculate expected values
    const startWorkingTimeMinutes = getWorkingTimeInMinutes(startWorkingTime); // Should be 540 (9 * 60)
    const endWorkingTimeMinutes = getWorkingTimeInMinutes(endWorkingTime); // Should be 1020 (17 * 60)
    const actualTimeInMinutes = getTimeOfDay(actualTimeIn); // Should be 600 (10 * 60)
    const actualTimeOutMinutes = getTimeOfDay(actualTimeOut); // Should be 1140 (19 * 60)

    // Calculate delay and extra time
    let delayHours = 0;
    let extraTimeHours = 0;

    if (
      startWorkingTimeMinutes !== null &&
      actualTimeInMinutes > startWorkingTimeMinutes
    ) {
      const delayMinutes = actualTimeInMinutes - startWorkingTimeMinutes;
      delayHours = delayMinutes / 60;
    }

    if (
      endWorkingTimeMinutes !== null &&
      actualTimeOutMinutes > endWorkingTimeMinutes
    ) {
      const extraMinutes = actualTimeOutMinutes - endWorkingTimeMinutes;
      extraTimeHours = extraMinutes / 60;
    }

    console.log('Test Results:', {
      scheduledStart: formatTimeFromMinutes(startWorkingTimeMinutes!),
      scheduledEnd: formatTimeFromMinutes(endWorkingTimeMinutes!),
      actualTimeIn: formatTimeFromMinutes(actualTimeInMinutes),
      actualTimeOut: formatTimeFromMinutes(actualTimeOutMinutes),
      delayHours: delayHours,
      extraTimeHours: extraTimeHours,
      expectedDelayHours: 1,
      expectedExtraTimeHours: 2,
      delayCalculationCorrect: delayHours === 1,
      extraTimeCalculationCorrect: extraTimeHours === 2,
    });

    console.log('=== END TIME CALCULATIONS TEST ===\n');

    return {
      delayHours,
      extraTimeHours,
      isCorrect: delayHours === 1 && extraTimeHours === 2,
    };
  }

  async findOne(id: string, encryptionKey?: string): Promise<Salary> {
    const salary = await this.tenantPrisma.client.salary.findUnique({
      where: { id, isDeleted: false },
      include: {
        employee: {
          include: {
            user: true,
            attendances: {
              where: {
                date: {
                  gte: new Date(2024, 0, 1), // This will be dynamic based on salary date
                },
              },
            },
          },
        },
        paidBy: true,
      },
    });

    if (!salary) {
      throw new NotFoundException('Salary record not found');
    }

    // Decrypt amount if encryption key is provided
    if (encryptionKey) {
      try {
        const decryptedAmount = decrypt(salary.amount, encryptionKey);
        return {
          ...salary,
          amount: decryptedAmount,
        };
      } catch (error) {
        console.error(
          `Failed to decrypt amount for salary ${salary.id}:`,
          error,
        );
        // Return salary with encrypted amount if decryption fails
      }
    }

    return salary;
  }

  async update(id: string, updateSalaryDto: UpdateSalaryDto): Promise<Salary> {
    await this.findOne(id, undefined);

    try {
      return await this.tenantPrisma.client.salary.update({
        where: { id },
        data: {
          ...updateSalaryDto,
          startDate: updateSalaryDto.startDate
            ? new Date(updateSalaryDto.startDate)
            : undefined,
          endDate: updateSalaryDto.endDate
            ? new Date(updateSalaryDto.endDate)
            : undefined,
        },
        include: {
          employee: true,
          paidBy: true,
        },
      });
    } catch {
      throw new BadRequestException('Failed to update salary record');
    }
  }

  async markAsPaid(id: string): Promise<Salary> {
    // const salary = await this.findOne(id, undefined);

    return await this.tenantPrisma.client.salary.update({
      where: { id },
      data: { isSalaryGet: true },
      include: {
        employee: true,
        paidBy: true,
      },
    });
  }

  async remove(id: string): Promise<Salary> {
    await this.findOne(id, undefined);

    return await this.tenantPrisma.client.salary.update({
      where: { id },
      data: { isDeleted: true },
      include: {
        employee: true,
        paidBy: true,
      },
    });
  }

  async getSalaryStats(workspaceId?: string, encryptionKey?: string) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const where: Prisma.SalaryWhereInput = {
      isDeleted: false,
      ...(workspaceId && {
        employee: {
          user: {
            workspaces: {
              some: {
                workspaceId: workspaceId,
              },
            },
          },
        },
      }),
    };

    const [totalPaid, totalUnpaid, currentMonthTotal, currentYearTotal] =
      await Promise.all([
        this.tenantPrisma.client.salary.count({
          where: { ...where, isSalaryGet: true },
        }),
        this.tenantPrisma.client.salary.count({
          where: { ...where, isSalaryGet: false },
        }),
        this.tenantPrisma.client.salary.findMany({
          where: { ...where, currentYear, currentMonth },
          select: { amount: true },
        }),
        this.tenantPrisma.client.salary.findMany({
          where: { ...where, currentYear },
          select: { amount: true },
        }),
      ]);

    // Calculate totals manually since amount is encrypted
    const currentMonthSum = encryptionKey
      ? currentMonthTotal.reduce((sum, salary) => {
          try {
            return sum + parseFloat(decrypt(salary.amount, encryptionKey));
          } catch {
            return sum; // Skip invalid encrypted values
          }
        }, 0)
      : 0;

    const currentYearSum = encryptionKey
      ? currentYearTotal.reduce((sum, salary) => {
          try {
            return sum + parseFloat(decrypt(salary.amount, encryptionKey));
          } catch {
            return sum; // Skip invalid encrypted values
          }
        }, 0)
      : 0;

    return {
      totalPaid,
      totalUnpaid,
      currentMonth: {
        total: currentMonthSum,
        count: currentMonthTotal.length,
      },
      currentYear: {
        total: currentYearSum,
        count: currentYearTotal.length,
      },
    };
  }

  // Temporary method to fix incorrect working times for specific employee
  async fixEmployeeWorkingTimes(
    employeeId: string,
    startTime: string = '09:00',
    endTime: string = '17:00',
  ) {
    console.log(`Fixing working times for employee ${employeeId}`);

    // Create proper Date objects for the working times (using year 2000 as base)
    const startWorkingTime = new Date(`2000-01-01T${startTime}:00.000Z`);
    const endWorkingTime = new Date(`2000-01-01T${endTime}:00.000Z`);

    console.log(`Setting startWorkingTime to: ${startWorkingTime}`);
    console.log(`Setting endWorkingTime to: ${endWorkingTime}`);

    const updatedEmployee = await this.tenantPrisma.client.employee.update({
      where: { id: employeeId },
      data: {
        startWorkingTime,
        endWorkingTime,
      },
    });

    console.log('Employee working times updated successfully!');
    return updatedEmployee;
  }

  // Test method to verify time calculations with specific attendance data
  async testSpecificAttendance(employeeId: string, attendanceDate: string) {
    console.log(`\n=== TESTING SPECIFIC ATTENDANCE ===`);
    console.log(`Employee ID: ${employeeId}`);
    console.log(`Date: ${attendanceDate}`);

    // Get employee with their working times
    const employee = await this.tenantPrisma.client.employee.findUnique({
      where: { id: employeeId },
      include: {
        attendances: {
          where: {
            date: {
              gte: new Date(attendanceDate + 'T00:00:00.000Z'),
              lte: new Date(attendanceDate + 'T23:59:59.999Z'),
            },
            isDeleted: false,
          },
        },
      },
    });

    if (!employee) {
      console.log('Employee not found!');
      return { error: 'Employee not found' };
    }

    // Helper functions
    const getTimeOfDay = (dateTime: Date): number => {
      return dateTime.getUTCHours() * 60 + dateTime.getUTCMinutes();
    };

    const getWorkingTimeInMinutes = (
      workingTime: Date | null,
    ): number | null => {
      if (!workingTime) return null;
      const timeDate = new Date(workingTime);
      const hours = timeDate.getUTCHours();
      const minutes = timeDate.getUTCMinutes();
      return hours * 60 + minutes;
    };

    const formatTimeFromMinutes = (totalMinutes: number): string => {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm} (${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')})`;
    };

    const startWorkingTimeMinutes = getWorkingTimeInMinutes(
      employee.startWorkingTime,
    );
    const endWorkingTimeMinutes = getWorkingTimeInMinutes(
      employee.endWorkingTime,
    );

    console.log(
      `Working schedule: ${formatTimeFromMinutes(startWorkingTimeMinutes!)} - ${formatTimeFromMinutes(endWorkingTimeMinutes!)}`,
    );

    const results = [];
    for (const attendance of employee.attendances) {
      if (attendance.timeIn && attendance.timeOut) {
        const actualTimeInMinutes = getTimeOfDay(new Date(attendance.timeIn));
        const actualTimeOutMinutes = getTimeOfDay(new Date(attendance.timeOut));

        let delayMinutes = 0;
        let extraMinutes = 0;

        if (
          startWorkingTimeMinutes &&
          actualTimeInMinutes > startWorkingTimeMinutes
        ) {
          delayMinutes = actualTimeInMinutes - startWorkingTimeMinutes;
        }

        if (
          endWorkingTimeMinutes &&
          actualTimeOutMinutes > endWorkingTimeMinutes
        ) {
          extraMinutes = actualTimeOutMinutes - endWorkingTimeMinutes;
        }

        const result = {
          date: attendance.date,
          timeIn: attendance.timeIn,
          timeOut: attendance.timeOut,
          actualTimeIn: formatTimeFromMinutes(actualTimeInMinutes),
          actualTimeOut: formatTimeFromMinutes(actualTimeOutMinutes),
          delayMinutes,
          delayHours: parseFloat((delayMinutes / 60).toFixed(2)),
          extraMinutes,
          extraHours: parseFloat((extraMinutes / 60).toFixed(2)),
        };

        results.push(result);

        console.log(`\n--- Attendance Record ---`);
        console.log(`Time In: ${result.actualTimeIn}`);
        console.log(`Time Out: ${result.actualTimeOut}`);
        console.log(
          `Delay: ${result.delayMinutes} minutes (${result.delayHours} hours)`,
        );
        console.log(
          `Extra Time: ${result.extraMinutes} minutes (${result.extraHours} hours)`,
        );
      }
    }

    console.log(`=== END TEST ===\n`);
    return {
      employee: {
        id: employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
      },
      results,
    };
  }

  // Simple test method to debug UTC time extraction
  async debugTimeCalculations() {
    console.log('\n=== DEBUGGING TIME CALCULATIONS ===');

    // Test with known working times
    const startWorkingTime = new Date('2000-01-01T09:00:00.000Z'); // Should be 9 AM
    const endWorkingTime = new Date('2000-01-01T17:00:00.000Z'); // Should be 5 PM

    // Test with actual attendance times from your data
    const testTimeIn = new Date('2025-07-26T09:20:00.000Z'); // Should be 9:20 AM
    const testTimeOut = new Date('2025-07-26T16:00:00.000Z'); // Should be 4:00 PM

    console.log('Working Times (stored):');
    console.log(
      `  Start: ${startWorkingTime} -> Local: ${startWorkingTime.getHours()}:${startWorkingTime.getMinutes().toString().padStart(2, '0')}, UTC: ${startWorkingTime.getUTCHours()}:${startWorkingTime.getUTCMinutes().toString().padStart(2, '0')}`,
    );
    console.log(
      `  End: ${endWorkingTime} -> Local: ${endWorkingTime.getHours()}:${endWorkingTime.getMinutes().toString().padStart(2, '0')}, UTC: ${endWorkingTime.getUTCHours()}:${endWorkingTime.getUTCMinutes().toString().padStart(2, '0')}`,
    );

    console.log('\nAttendance Times (actual):');
    console.log(
      `  TimeIn: ${testTimeIn} -> Local: ${testTimeIn.getHours()}:${testTimeIn.getMinutes().toString().padStart(2, '0')}, UTC: ${testTimeIn.getUTCHours()}:${testTimeIn.getUTCMinutes().toString().padStart(2, '0')}`,
    );
    console.log(
      `  TimeOut: ${testTimeOut} -> Local: ${testTimeOut.getHours()}:${testTimeOut.getMinutes().toString().padStart(2, '0')}, UTC: ${testTimeOut.getUTCHours()}:${testTimeOut.getUTCMinutes().toString().padStart(2, '0')}`,
    );

    // Calculate using ISO string extraction (more reliable)
    const extractTimeFromISO = (date: Date): number => {
      const isoString = date.toISOString();
      const timePart = isoString.split('T')[1];
      const [hoursStr, minutesStr] = timePart.split(':');
      return parseInt(hoursStr, 10) * 60 + parseInt(minutesStr, 10);
    };

    const startMinutesISO = extractTimeFromISO(startWorkingTime);
    const endMinutesISO = extractTimeFromISO(endWorkingTime);
    const timeInMinutesISO = extractTimeFromISO(testTimeIn);
    const timeOutMinutesISO = extractTimeFromISO(testTimeOut);

    console.log('\nMinutes calculation (ISO extraction):');
    console.log(
      `  Expected start: ${startMinutesISO} minutes (${Math.floor(startMinutesISO / 60)}:${(startMinutesISO % 60).toString().padStart(2, '0')})`,
    );
    console.log(
      `  Expected end: ${endMinutesISO} minutes (${Math.floor(endMinutesISO / 60)}:${(endMinutesISO % 60).toString().padStart(2, '0')})`,
    );
    console.log(
      `  Actual timeIn: ${timeInMinutesISO} minutes (${Math.floor(timeInMinutesISO / 60)}:${(timeInMinutesISO % 60).toString().padStart(2, '0')})`,
    );
    console.log(
      `  Actual timeOut: ${timeOutMinutesISO} minutes (${Math.floor(timeOutMinutesISO / 60)}:${(timeOutMinutesISO % 60).toString().padStart(2, '0')})`,
    );

    // Calculate delay and overtime
    const delayMinutes = Math.max(0, timeInMinutesISO - startMinutesISO);
    const overtimeMinutes = Math.max(0, timeOutMinutesISO - endMinutesISO);

    console.log('\nCalculated Results:');
    console.log(
      `  Delay: ${delayMinutes} minutes (${(delayMinutes / 60).toFixed(2)} hours)`,
    );
    console.log(
      `  Overtime: ${overtimeMinutes} minutes (${(overtimeMinutes / 60).toFixed(2)} hours)`,
    );
    console.log(
      `  Expected: Delay = 20 minutes (0.33 hours), Overtime = 0 minutes (0 hours)`,
    );

    // Also test with Local methods to see difference
    const startMinutesLocal =
      startWorkingTime.getHours() * 60 + startWorkingTime.getMinutes();
    const endMinutesLocal =
      endWorkingTime.getHours() * 60 + endWorkingTime.getMinutes();
    const timeInMinutesLocal =
      testTimeIn.getHours() * 60 + testTimeIn.getMinutes();
    const timeOutMinutesLocal =
      testTimeOut.getHours() * 60 + testTimeOut.getMinutes();

    const delayMinutesLocal = Math.max(
      0,
      timeInMinutesLocal - startMinutesLocal,
    );
    const overtimeMinutesLocal = Math.max(
      0,
      timeOutMinutesLocal - endMinutesLocal,
    );

    console.log('\nLocal Time Results (for comparison):');
    console.log(
      `  Delay: ${delayMinutesLocal} minutes (${(delayMinutesLocal / 60).toFixed(2)} hours)`,
    );
    console.log(
      `  Overtime: ${overtimeMinutesLocal} minutes (${(overtimeMinutesLocal / 60).toFixed(2)} hours)`,
    );

    console.log('=== END DEBUG ===\n');

    return {
      iso: { delay: delayMinutes / 60, overtime: overtimeMinutes / 60 },
      local: {
        delay: delayMinutesLocal / 60,
        overtime: overtimeMinutesLocal / 60,
      },
      expected: { delay: 0.33, overtime: 0 },
    };
  }
}
