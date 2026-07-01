import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminGuard } from './guards/super-admin.guard';

@Module({
  imports: [PrismaModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, SuperAdminGuard],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
