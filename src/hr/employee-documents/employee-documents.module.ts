import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmployeeDocumentsController } from './employee-documents.controller';
import { EmployeeDocumentsService } from './employee-documents.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [EmployeeDocumentsController],
  providers: [EmployeeDocumentsService],
  exports: [EmployeeDocumentsService],
})
export class EmployeeDocumentsModule {}
