import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceReportData, AttendanceReportDto } from './dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generateAttendanceReport(
    dto: AttendanceReportDto,
  ): Promise<AttendanceReportData[]> {
    const { startDate, endDate, employeeId, jobId } = dto;

    // Build employee filter
    const employeeWhere: any = {
      isDeleted: false,
    };

    if (employeeId) {
      employeeWhere.id = employeeId;
    }

    if (jobId) {
      employeeWhere.jobId = jobId;
    }

    // Get all employees
    const employees = await this.prisma.employee.findMany({
      where: employeeWhere,
      include: {
        job: true,
        attendances: {
          where: {
            date: {
              gte: new Date(startDate + 'T00:00:00.000Z'),
              lte: new Date(endDate + 'T23:59:59.999Z'),
            },
            isDeleted: false,
            sn: null, // Only main records
          },
          orderBy: {
            date: 'asc',
          },
        },
      },
    });

    // Calculate total days in period (all calendar days)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Process each employee
    const reportData: AttendanceReportData[] = [];

    for (const employee of employees) {
      const workingHours = employee.workingHours || 8;
      const startWorkingTime = employee.startWorkingTime;
      const endWorkingTime = employee.endWorkingTime;

      let presentDays = 0;
      let lateDays = 0;
      let totalLateMinutes = 0;
      let totalOvertimeMinutes = 0;
      let totalWorkedHours = 0;

      const records: any[] = [];

      // Group attendance by date to avoid duplicates
      const attendanceByDate = new Map<string, any>();
      for (const attendance of employee.attendances) {
        const dateKey = new Date(attendance.date).toISOString().split('T')[0];

        // Keep only the first record for each date (or merge if needed)
        if (!attendanceByDate.has(dateKey)) {
          attendanceByDate.set(dateKey, attendance);
        }
      }

      // Process each unique attendance record
      for (const attendance of attendanceByDate.values()) {
        let lateMinutes = 0;
        let overtimeMinutes = 0;
        let workedHours = 0;

        if (attendance.timeIn && attendance.timeOut) {
          // Calculate worked hours
          const timeIn = new Date(attendance.timeIn);
          const timeOut = new Date(attendance.timeOut);
          workedHours =
            (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60);
          totalWorkedHours += workedHours;

          // Calculate late minutes
          if (startWorkingTime) {
            const scheduledStartMinutes =
              this.extractTimeInMinutes(startWorkingTime);
            const actualStartMinutes = this.extractTimeInMinutes(timeIn);

            if (actualStartMinutes > scheduledStartMinutes) {
              lateMinutes = actualStartMinutes - scheduledStartMinutes;
              // Safety check: max 12 hours late
              if (lateMinutes <= 720) {
                totalLateMinutes += lateMinutes;
                lateDays++;
              }
            }
          }

          // Calculate overtime minutes
          if (endWorkingTime) {
            const scheduledEndMinutes =
              this.extractTimeInMinutes(endWorkingTime);
            const actualEndMinutes = this.extractTimeInMinutes(timeOut);

            if (actualEndMinutes > scheduledEndMinutes) {
              overtimeMinutes = actualEndMinutes - scheduledEndMinutes;
              // Safety check: max 12 hours overtime
              if (overtimeMinutes <= 720) {
                totalOvertimeMinutes += overtimeMinutes;
              }
            }
          }
        }

        if (attendance.status === 'PRESENT' || attendance.status === 'REMOTE') {
          presentDays++;
        }

        records.push({
          date: attendance.date,
          status: attendance.status,
          timeIn: attendance.timeIn,
          timeOut: attendance.timeOut,
          lateMinutes,
          overtimeMinutes,
          workedHours: parseFloat(workedHours.toFixed(2)),
        });
      }

      // Calculate expected days based on the period
      const daysInPeriod = totalDays;
      const absentDays = Math.max(0, daysInPeriod - presentDays);

      // Expected work hours = present days * working hours per day
      const expectedWorkHours = presentDays * workingHours;

      // Attendance rate = (present days / total days in period) * 100
      const attendanceRate =
        daysInPeriod > 0
          ? Math.min(100, (presentDays / daysInPeriod) * 100)
          : 0;

      reportData.push({
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          job: employee.job ? { name: employee.job.name } : undefined,
          fingerPrintId: employee.fingerPrintId,
        },
        totalDays: totalDays,
        presentDays,
        absentDays,
        lateDays,
        totalLateMinutes,
        averageLateMinutes:
          lateDays > 0
            ? parseFloat((totalLateMinutes / lateDays).toFixed(2))
            : 0,
        totalOvertimeMinutes,
        averageOvertimeMinutes:
          presentDays > 0
            ? parseFloat((totalOvertimeMinutes / presentDays).toFixed(2))
            : 0,
        totalWorkedHours: parseFloat(totalWorkedHours.toFixed(2)),
        expectedWorkHours,
        attendanceRate: parseFloat(attendanceRate.toFixed(2)),
        records,
      });
    }

    return reportData;
  }

  private extractTimeInMinutes(date: Date): number {
    const isoString = date.toISOString();
    const timePart = isoString.split('T')[1];
    const [hoursStr, minutesStr] = timePart.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    return hours * 60 + minutes;
  }

  async generateLateArrivalReport(dto: AttendanceReportDto) {
    const fullReport = await this.generateAttendanceReport(dto);

    // Filter and sort by late arrivals
    return fullReport
      .filter((emp) => emp.lateDays > 0)
      .map((emp) => ({
        employee: emp.employee,
        lateDays: emp.lateDays,
        totalLateMinutes: emp.totalLateMinutes,
        averageLateMinutes: emp.averageLateMinutes,
        lateHours: parseFloat((emp.totalLateMinutes / 60).toFixed(2)),
        lateRecords: emp.records.filter((r) => r.lateMinutes > 0),
      }))
      .sort((a, b) => b.lateDays - a.lateDays);
  }

  async generateAbsenceReport(dto: AttendanceReportDto) {
    const fullReport = await this.generateAttendanceReport(dto);

    return fullReport
      .filter((emp) => emp.absentDays > 0)
      .map((emp) => ({
        employee: emp.employee,
        totalDays: emp.totalDays,
        presentDays: emp.presentDays,
        absentDays: emp.absentDays,
        absenceRate: parseFloat(
          ((emp.absentDays / emp.totalDays) * 100).toFixed(2),
        ),
        attendanceRate: emp.attendanceRate,
      }))
      .sort((a, b) => b.absentDays - a.absentDays);
  }

  async generateOvertimeReport(dto: AttendanceReportDto) {
    const fullReport = await this.generateAttendanceReport(dto);

    return fullReport
      .filter((emp) => emp.totalOvertimeMinutes > 0)
      .map((emp) => ({
        employee: emp.employee,
        totalOvertimeMinutes: emp.totalOvertimeMinutes,
        averageOvertimeMinutes: emp.averageOvertimeMinutes,
        totalOvertimeHours: parseFloat(
          (emp.totalOvertimeMinutes / 60).toFixed(2),
        ),
        overtimeRecords: emp.records.filter((r) => r.overtimeMinutes > 0),
      }))
      .sort((a, b) => b.totalOvertimeMinutes - a.totalOvertimeMinutes);
  }

  async generateSummaryReport(dto: AttendanceReportDto) {
    const fullReport = await this.generateAttendanceReport(dto);

    const summary = {
      period: {
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
      totalEmployees: fullReport.length,
      totalWorkDays: fullReport[0]?.totalDays || 0,

      attendance: {
        totalPresent: fullReport.reduce((sum, emp) => sum + emp.presentDays, 0),
        totalAbsent: fullReport.reduce((sum, emp) => sum + emp.absentDays, 0),
        averageAttendanceRate: parseFloat(
          (
            fullReport.reduce((sum, emp) => sum + emp.attendanceRate, 0) /
            fullReport.length
          ).toFixed(2),
        ),
      },

      late: {
        totalLateDays: fullReport.reduce((sum, emp) => sum + emp.lateDays, 0),
        totalLateMinutes: fullReport.reduce(
          (sum, emp) => sum + emp.totalLateMinutes,
          0,
        ),
        totalLateHours: parseFloat(
          (
            fullReport.reduce((sum, emp) => sum + emp.totalLateMinutes, 0) / 60
          ).toFixed(2),
        ),
        employeesWithLateArrivals: fullReport.filter((emp) => emp.lateDays > 0)
          .length,
      },

      overtime: {
        totalOvertimeMinutes: fullReport.reduce(
          (sum, emp) => sum + emp.totalOvertimeMinutes,
          0,
        ),
        totalOvertimeHours: parseFloat(
          (
            fullReport.reduce((sum, emp) => sum + emp.totalOvertimeMinutes, 0) /
            60
          ).toFixed(2),
        ),
        employeesWithOvertime: fullReport.filter(
          (emp) => emp.totalOvertimeMinutes > 0,
        ).length,
      },

      work: {
        totalWorkedHours: fullReport.reduce(
          (sum, emp) => sum + emp.totalWorkedHours,
          0,
        ),
        totalExpectedHours: fullReport.reduce(
          (sum, emp) => sum + emp.expectedWorkHours,
          0,
        ),
        averageEfficiency: parseFloat(
          (
            fullReport.reduce(
              (sum, emp) =>
                sum + (emp.totalWorkedHours / emp.expectedWorkHours) * 100,
              0,
            ) / fullReport.length
          ).toFixed(2),
        ),
      },

      employeesData: fullReport,
    };

    return summary;
  }
}
