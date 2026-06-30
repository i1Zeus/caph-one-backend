import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AttendancesModule } from './attendances/attendances.module';
import { DepartmentsModule } from './departments/departments.module';
import { DisciplinaryActionsModule } from './disciplinary-actions/disciplinary-actions.module';
import { EmployeeBenefitsModule } from './employee-benefits/employee-benefits.module';
import { EmployeeDocumentsModule } from './employee-documents/employee-documents.module';
import { EmployeeExitModule } from './employee-exit/employee-exit.module';
import { EmployeeRequestsModule } from './employee-requests/employee-requests.module';
import { EmployeesModule } from './employees/employees.module';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { JobsModule } from './jobs/jobs.module';
import { LeavesModule } from './leaves/leaves.module';
import { ReportsModule } from './reports/reports.module';
import { SalariesModule } from './salaries/salaries.module';

@Module({
  imports: [
    PrismaModule,
    EmployeesModule,
    AttendancesModule,
    LeavesModule,
    JobsModule,
    SalariesModule,
    EmployeeDocumentsModule,
    DisciplinaryActionsModule,
    EmployeeRequestsModule,
    EmployeeExitModule,
    EmployeeBenefitsModule,
    ReportsModule,
    DepartmentsModule,
  ],
  controllers: [HrController],
  providers: [HrService],
  exports: [
    HrService,
    EmployeesModule,
    AttendancesModule,
    LeavesModule,
    JobsModule,
    SalariesModule,
    EmployeeDocumentsModule,
    DisciplinaryActionsModule,
    EmployeeRequestsModule,
    EmployeeExitModule,
    EmployeeBenefitsModule,
    ReportsModule,
    DepartmentsModule,
  ],
})
export class HrModule {}
