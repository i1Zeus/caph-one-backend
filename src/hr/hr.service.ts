import { Injectable } from '@nestjs/common';
import { AttendancesService } from './attendances/attendances.service';
import { EmployeesService } from './employees/employees.service';
import { JobsService } from './jobs/jobs.service';
import { LeavesService } from './leaves/leaves.service';
import { SalariesService } from './salaries/salaries.service';

@Injectable()
export class HrService {
  constructor(
    private employeesService: EmployeesService,
    private attendancesService: AttendancesService,
    private leavesService: LeavesService,
    private jobsService: JobsService,
    private salariesService: SalariesService,
  ) {}

  async getDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const [employeeStats, attendanceStats, leaveStats, jobStats, salaryStats] =
      await Promise.all([
        this.employeesService.getEmployeeStats(),
        this.attendancesService.getAttendanceStats(today, today),
        this.leavesService.getLeaveStats(),
        this.jobsService.getJobStats(),
        this.salariesService.getSalaryStats(),
      ]);

    return {
      employees: employeeStats,
      attendance: attendanceStats,
      leaves: leaveStats,
      jobs: jobStats,
      salaries: salaryStats,
    };
  }

  async getOverview() {
    const stats = await this.getDashboardStats();
    const recentEmployees = await this.employeesService.findAll(1, 5);
    const pendingLeaves = await this.leavesService.findAll(
      1,
      5,
      undefined,
      'PENDING',
    );
    const todayAttendance = await this.attendancesService.findAll(
      1,
      10,
      undefined,
      new Date().toISOString().split('T')[0],
      new Date().toISOString().split('T')[0],
    );

    return {
      stats,
      recentEmployees: recentEmployees.employees,
      pendingLeaves: pendingLeaves.leaves,
      todayAttendance: todayAttendance.attendances,
    };
  }
}
