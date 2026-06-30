import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmployeeExitController } from './employee-exit.controller';
import { EmployeeExitService } from './employee-exit.service';

@Module({
  imports: [PrismaModule],
  controllers: [EmployeeExitController],
  providers: [EmployeeExitService],
  exports: [EmployeeExitService],
})
export class EmployeeExitModule {}
