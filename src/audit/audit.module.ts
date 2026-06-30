import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Global()
@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
