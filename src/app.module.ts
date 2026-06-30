import { Module } from '@nestjs/common';
import { AccountingModule } from './accounting/accounting.module';
import { AiModule } from './ai/ai.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CrmModule } from './crm/crm.module';
import { FilesModule } from './files/files.module';
import { GithubModule } from './github/github.module';
import { HrModule } from './hr/hr.module';
import { InventoryModule } from './inventory/inventory.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PosModule } from './pos/pos.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { SalesModule } from './sales/sales.module';
import { StatisticsModule } from './statistics/statistics.module';
import { TasksModule } from './tasks/tasks.module';
import { TemplatesModule } from './templates/templates.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    PrismaModule,
    WorkspacesModule,
    ProjectsModule,
    TasksModule,
    StatisticsModule,
    NotificationsModule,
    AiModule,
    TemplatesModule,
    AuditModule,
    CrmModule,
    FilesModule,
    GithubModule,
    HrModule,
    AccountingModule,
    InventoryModule,
    PosModule,
    SalesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
