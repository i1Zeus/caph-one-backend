import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmployeeBenefitsController } from './employee-benefits.controller';
import { EmployeeBenefitsService } from './employee-benefits.service';

@Module({
  imports: [PrismaModule],
  controllers: [EmployeeBenefitsController],
  providers: [EmployeeBenefitsService],
  exports: [EmployeeBenefitsService],
})
export class EmployeeBenefitsModule {}
